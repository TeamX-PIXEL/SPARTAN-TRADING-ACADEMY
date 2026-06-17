import os
import secrets
import string
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from dateutil.relativedelta import relativedelta

from app.database import get_db, get_db_connection
from app.models import (
    User, Course, Indicator, Bot, Purchase,
    IndicatorUser, BatchTemplate, BatchList, CourseWaitlist, CourseSchedule, CourseChapter
)
from app.schemas import PurchaseCreate
from app.core.deps import get_current_user
from app.services.tradingview import tradingview as tv_handler
from app.services.telegram import DB_TABLE_USERS

router = APIRouter(prefix="", tags=["Purchases"])


# ==========================================
# HELPERS
# ==========================================
def calculate_next_start_date(last_batch: BatchList = None, now: datetime = None):
    """Calculates the 1st of the month AFTER the previous batch finishes."""
    if last_batch:
        finish_date = last_batch.batch_start_date + timedelta(days=last_batch.max_days)
        next_month = finish_date + relativedelta(months=1, day=1)
        return next_month
    else:
        return now + relativedelta(months=1, day=1)


def resolve_pine_id(pine_id_or_alias: str) -> str:
    """
    Resolves a pine_id from an alias if it exists in environment variables
    (prefixed with PINE_), otherwise returns the input as is.
    """
    env_key = f"PINE_{pine_id_or_alias}"
    return os.getenv(env_key, pine_id_or_alias)


def parse_expiry_period(expiry_period: str, now: datetime = None):
    """
    Parses an expiry_period string (e.g. '7D', '1M', '3M', '6M', '1Y', '1L')
    Returns (extension_type, extension_length, expiry_date) where:
    - extension_type/ext_length are for TradingView's add_access
    - expiry_date is the calculated DateTime for the indicator_users table
    """
    if not expiry_period:
        expiry_period = "1M"

    ext_type = expiry_period[-1].upper()
    try:
        ext_length = 0 if ext_type == 'L' else int(expiry_period[:-1])
    except ValueError:
        ext_type = 'M'
        ext_length = 1

    if now is None:
        now = datetime.now()

    if ext_type == 'D':
        expiry_date = now + timedelta(days=ext_length)
    elif ext_type == 'M':
        expiry_date = now + relativedelta(months=ext_length)
    elif ext_type == 'Y':
        expiry_date = now + relativedelta(years=ext_length)
    elif ext_type == 'L':
        expiry_date = None  # Lifetime
    else:
        expiry_date = now + relativedelta(months=1)

    return ext_type, ext_length, expiry_date


def generate_api_key():
    """Generate a unique API key in format XXXX-XXXX-XXXX-XXXX."""
    while True:
        parts = [''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4)) for _ in range(4)]
        key = '-'.join(parts)

        # Ensure uniqueness against signal_users
        connection = get_db_connection()
        if connection is None:
            return key
        cursor = connection.cursor()
        try:
            cursor.execute(f"SELECT 1 FROM {DB_TABLE_USERS} WHERE user_key = %s", (key,))
            if cursor.fetchone() is None:
                return key
        finally:
            cursor.close()
            connection.close()


def get_bot_model(token_env: str) -> str:
    """Map a bot's token_env to its model name (Evergreen/Legacy/Alpha)."""
    mapping = {
        "EVERGREEN_BOT_TOKEN": "Evergreen",
        "LEGACY_BOT_TOKEN": "Legacy",
        "ALPHA_BOT_TOKEN": "Alpha",
    }
    return mapping.get(token_env)


# ==========================================
# NEW: THE DEMAND-DRIVEN PURCHASE ENGINE
# ==========================================
@router.post("/purchase")
def create_purchase(
    purchase: PurchaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product_section = purchase.product_section
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Resolve product_uuid to integer ID based on section
    if product_section == 1:
        course = db.query(Course).filter(Course.product_uuid == purchase.product_uuid).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        product_id = course.id
    elif product_section == 2:
        indicator = db.query(Indicator).filter(Indicator.product_uuid == purchase.product_uuid).first()
        if not indicator:
            raise HTTPException(status_code=404, detail="Indicator not found")
        product_id = indicator.id
    elif product_section == 3:
        bot = db.query(Bot).filter(Bot.product_uuid == purchase.product_uuid).first()
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        product_id = bot.id
    else:
        raise HTTPException(status_code=400, detail="Invalid product section")

    # 1. Record the Purchase (Universal)
    new_purchase = Purchase(
        product_section=product_section,
        product_id=product_id,
        user_id=current_user.id,
        cost=purchase.cost,
    )
    db.add(new_purchase)

    # ==========================================
    # BRANCH 1: COURSE PURCHASE LOGIC
    # ==========================================
    if product_section == 1:
        course_id = product_id

        template = db.query(BatchTemplate).filter(BatchTemplate.course_id == course_id).first()
        if not template:
            raise HTTPException(status_code=400, detail="Batch template missing for this course.")

        w_id = template.current_batch if template.current_batch else 1

        # Check if a batch with this ID already exists
        existing_batch = db.query(BatchList).filter(
            BatchList.course_id == course_id,
            BatchList.assigned_to == w_id
        ).first()

        force_create_batch = False

        if existing_batch:
            if existing_batch.status == "enrolling":
                if existing_batch.batch_start_date < now:
                    # Enrolling but passed -> Close and Move
                    existing_batch.status = "scheduled"

                    new_id = (template.latest_batch if template.latest_batch else 0) + 1
                    template.latest_batch = new_id
                    template.current_batch = new_id
                    w_id = new_id

                    force_create_batch = True
                # Else: Enrolling and future -> Do nothing, just join waitlist
            elif existing_batch.status == "scheduled":
                # Already scheduled -> Move to next
                new_id = (template.latest_batch if template.latest_batch else 0) + 1
                template.latest_batch = new_id
                template.current_batch = new_id
                w_id = new_id

                force_create_batch = True

        # 3. Add User to the Waitlist
        new_waitlist_entry = CourseWaitlist(
            user_id=current_user.id,
            course_id=course_id,
            waitlist_batch_id=w_id
        )
        db.add(new_waitlist_entry)

        # INCREMENT THE COURSE PURCHASE COUNT
        course_to_update = db.query(Course).filter(Course.id == course_id).first()
        if course_to_update:
            course_to_update.purchased_count += 1
            db.add(course_to_update)

        db.flush()

        # 5. BATCH CREATION LOGIC
        # Case A: We were forced to move to a new ID because the old one closed
        if force_create_batch:
            last_batch = db.query(BatchList).filter(BatchList.course_id == course_id).order_by(BatchList.batch_start_date.desc()).first()
            new_start_date = calculate_next_start_date(last_batch, now)

            new_batch = BatchList(
                course_id=course_id,
                min_enroll=template.min_enroll,
                batch_start_date=new_start_date,
                max_days=template.no_of_days,
                assigned_to=w_id,
                status="enrolling"
            )
            db.add(new_batch)
            db.flush()

            # Ensure template is synced
            template.current_batch = w_id
            template.latest_batch = w_id

        # Case B: No batch existed for this ID, check if we hit the threshold to create one
        elif not existing_batch:
            current_waitlist_count = db.query(CourseWaitlist).filter(
                CourseWaitlist.course_id == course_id,
                CourseWaitlist.waitlist_batch_id == w_id
            ).count()

            if current_waitlist_count == template.min_enroll:
                if template.automated_batch_creation:
                    last_batch = db.query(BatchList).filter(BatchList.course_id == course_id).order_by(BatchList.batch_start_date.desc()).first()
                    new_start_date = calculate_next_start_date(last_batch, now)

                    new_batch = BatchList(
                        course_id=course_id,
                        min_enroll=template.min_enroll,
                        batch_start_date=new_start_date,
                        max_days=template.no_of_days,
                        assigned_to=w_id,
                        status="enrolling"
                    )
                    db.add(new_batch)
                    db.flush()

                    template.current_batch = w_id
                    template.latest_batch = w_id

    # ==========================================
    # BRANCH 2: INDICATOR PURCHASE LOGIC
    # ==========================================
    elif product_section == 2:
        indicator_id = product_id

        # 1. Fetch Indicator Details
        indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
        if not indicator:
            raise HTTPException(status_code=404, detail="Indicator not found.")

        # 2. Validation: Does the user have a TradingView ID set?
        if not current_user.tvid:
            raise HTTPException(
                status_code=400,
                detail="TradingView Username (tvid) missing in your profile. Please update it before purchasing."
            )

        # 3. Increment Buyers Count
        indicator.buyers += 1
        db.add(indicator)

        # 4. TRADINGVIEW ACCESS INTEGRATION
        ext_type, ext_length, expiry_date = parse_expiry_period(indicator.expiry_period, now)

        try:
            # We use the session_id and pine_id stored in the Indicator table
            session_id = indicator.session_id
            pine_id = indicator.pine_id
            tv_username = current_user.tvid

            # Step A: Get current access status
            details = tv_handler.get_access_details(tv_username, pine_id, session_id)

            # Step B: Add/Extend access using indicator's expiry_period
            tv_result = tv_handler.add_access(
                access_details=details,
                extension_type=ext_type,
                extension_length=ext_length,
                sessionid=session_id
            )

            if tv_result.get('status') != 'Success':
                print(f"TV Error: {tv_result}")
                raise HTTPException(status_code=500, detail="Purchase recorded, but failed to grant TradingView access.")

        except Exception as e:
            print(f"TradingView Integration Error: {e}")
            raise HTTPException(status_code=500, detail=f"Internal error granting TV access: {str(e)}")

        # 5. Add/Update IndicatorUser entry with calculated expiry
        existing_entry = db.query(IndicatorUser).filter(
            IndicatorUser.user_id == current_user.id,
            IndicatorUser.indicator_id == indicator_id
        ).first()

        if existing_entry:
            existing_entry.expiry = expiry_date
            existing_entry.updated_at = datetime.now(timezone.utc)
            db.add(existing_entry)
        else:
            new_entry = IndicatorUser(
                user_id=current_user.id,
                indicator_id=indicator_id,
                expiry=expiry_date
            )
            db.add(new_entry)

    # ==========================================
    # BRANCH 3: BOT PURCHASE LOGIC
    # ==========================================
    elif product_section == 3:
        bot_id = product_id
        bot = db.query(Bot).filter(Bot.id == bot_id).first()
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found.")

        model = get_bot_model(bot.token_env)
        if not model:
            raise HTTPException(status_code=400, detail="Unknown bot model.")

        # Generate a unique API key for the user
        api_key = generate_api_key()

        # Default expiry: 30 days from now (same as Purchase model default)
        expiry_date = (now + timedelta(days=30)).date()
        far_future = date(2099, 12, 31)

        # Upsert into signal_users (MySQL)
        connection = get_db_connection()
        if connection is None:
            raise HTTPException(status_code=500, detail="Database connection error")

        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(f"SELECT id, user_key FROM {DB_TABLE_USERS} WHERE user = %s", (current_user.UserID,))
            existing = cursor.fetchone()

            if existing:
                # Update existing record: enable model access and set expiry
                # Keep existing user_key if already present
                update_sql = f"""
                    UPDATE {DB_TABLE_USERS}
                    SET {model}_Access = TRUE,
                        {model}_Expiry = %s,
                        user_key = COALESCE(user_key, %s)
                    WHERE user = %s
                """
                cursor.execute(update_sql, (expiry_date, api_key, current_user.UserID))
            else:
                # Insert new record with all required NOT NULL columns
                # Evergreen_Expiry and Legacy_Expiry are NOT NULL
                # Alpha_Expiry is DEFAULT NULL
                evergreen_exp = expiry_date if model == "Evergreen" else far_future
                legacy_exp = expiry_date if model == "Legacy" else far_future
                alpha_exp = expiry_date if model == "Alpha" else None

                cursor.execute(f"""
                    INSERT INTO {DB_TABLE_USERS} (
                        user, telegram_id, user_key,
                        Evergreen_Expiry, Legacy_Expiry, Alpha_Expiry,
                        Evergreen_Access, Legacy_Access, Alpha_Access
                    ) VALUES (%s, '', %s, %s, %s, %s, %s, %s, %s)
                """, (
                    current_user.UserID, api_key,
                    evergreen_exp, legacy_exp, alpha_exp,
                    model == "Evergreen", model == "Legacy", model == "Alpha"
                ))

            connection.commit()
        except Exception as e:
            connection.rollback()
            print(f"Error upserting signal_users for bot purchase: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to add user to signal_users: {str(e)}")
        finally:
            cursor.close()
            connection.close()

    else:
        raise HTTPException(status_code=400, detail="Invalid product_section provided.")

    db.commit()
    return {"message": "Purchase successful and TradingView access granted!"}


@router.get("/my-purchases")
def get_my_purchases(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    purchases = db.query(Purchase).filter(Purchase.user_id == current_user.id).all()

    course_ids = [p.product_id for p in purchases if p.product_section == 1]
    indicator_ids = [p.product_id for p in purchases if p.product_section == 2]

    courses = db.query(Course).filter(Course.id.in_(course_ids)).all() if course_ids else []
    indicators = db.query(Indicator).filter(Indicator.id.in_(indicator_ids)).all() if indicator_ids else []

    # Bots: derive from signal_users instead of purchases
    bot_uuids = []
    connection = get_db_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(f"SELECT * FROM {DB_TABLE_USERS} WHERE user = %s", (current_user.UserID,))
            row = cursor.fetchone()
            if row:
                today = date.today()
                all_bots = db.query(Bot).filter(Bot.status == "active").all()
                for b in all_bots:
                    model = get_bot_model(b.token_env)
                    if model:
                        access = row.get(f"{model}_Access")
                        expiry = row.get(f"{model}_Expiry")
                        if access and expiry and expiry >= today:
                            bot_uuids.append(b.product_uuid)
        finally:
            cursor.close()
            connection.close()

    return {
        "courses": [c.product_uuid for c in courses],
        "indicators": [i.product_uuid for i in indicators],
        "bots": bot_uuids
    }


@router.get("/api/enrollment-status/{course_uuid}")
def get_enrollment_status(course_uuid: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns enrollment status for a specific course."""
    course = db.query(Course).filter(Course.product_uuid == course_uuid).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course_id = course.id

    is_purchased = db.query(Purchase).filter(
        Purchase.user_id == current_user.id,
        Purchase.product_id == course_id,
        Purchase.product_section == 1
    ).first() is not None

    if not is_purchased:
        return {"is_purchased": False, "batch_assigned": False, "schedule_assigned": False, "schedule": None}

    # Check if user is in waitlist with a batch assignment
    waitlist_entry = db.query(CourseWaitlist).filter(
        CourseWaitlist.user_id == current_user.id,
        CourseWaitlist.course_id == course_id
    ).first()

    batch_assigned = False
    schedule_assigned = False
    schedule_info = None
    batch = None

    if waitlist_entry and waitlist_entry.waitlist_batch_id:
        # Check if a batch exists with this assigned_to value
        batch = db.query(BatchList).filter(
            BatchList.course_id == course_id,
            BatchList.assigned_to == waitlist_entry.waitlist_batch_id
        ).first()

        if batch:
            batch_assigned = True
            now = datetime.now()

            # Find the next upcoming schedule
            next_schedule = db.query(CourseSchedule).filter(
                CourseSchedule.batch_list_id == batch.id,
                CourseSchedule.scheduled_at > now
            ).order_by(CourseSchedule.scheduled_at.asc()).first()

            # Find the previous schedule (just before now)
            prev_schedule = db.query(CourseSchedule).filter(
                CourseSchedule.batch_list_id == batch.id,
                CourseSchedule.scheduled_at <= now
            ).order_by(CourseSchedule.scheduled_at.desc()).first()

            is_ongoing = False
            schedule_info = None
            next_chapter_title = None
            next_chapter_index = None

            if prev_schedule:
                # Parse duration
                dur_hours = 2
                if prev_schedule.estimated_duration:
                    d = prev_schedule.estimated_duration.lower().replace('hours', '').replace('hour', '').strip()
                    try:
                        dur_hours = float(d)
                    except Exception:
                        pass
                end_time = prev_schedule.scheduled_at + timedelta(hours=dur_hours)
                if end_time > now:
                    is_ongoing = True
                    # Use the previous (ongoing) schedule as the active one
                    prev_chapter = db.query(CourseChapter).filter(
                        CourseChapter.id == prev_schedule.chapter_id
                    ).first() if prev_schedule.chapter_id else None
                    schedule_info = {
                        "scheduled_at": prev_schedule.scheduled_at.isoformat() if prev_schedule.scheduled_at else None,
                        "estimated_duration": prev_schedule.estimated_duration,
                        "join_link": prev_schedule.join_link,
                        "session_type": prev_schedule.session_type,
                    }
                    next_chapter_title = prev_chapter.title if prev_chapter else (prev_schedule.custom_chapter_name or None)
                    next_chapter_index = prev_chapter.chapter_index if prev_chapter else None
                    schedule_assigned = True

            if not is_ongoing and next_schedule:
                schedule_assigned = True
                next_chapter = db.query(CourseChapter).filter(
                    CourseChapter.id == next_schedule.chapter_id
                ).first() if next_schedule.chapter_id else None
                schedule_info = {
                    "scheduled_at": next_schedule.scheduled_at.isoformat() if next_schedule.scheduled_at else None,
                    "estimated_duration": next_schedule.estimated_duration,
                    "join_link": next_schedule.join_link,
                    "session_type": next_schedule.session_type,
                }
                next_chapter_title = next_chapter.title if next_chapter else (next_schedule.custom_chapter_name or None)
                next_chapter_index = next_chapter.chapter_index if next_chapter else None

            # Fallback: no ongoing and no future schedule -> show first unscheduled chapter
            if not is_ongoing and not next_schedule:
                scheduled_chapter_ids = {
                    s.chapter_id for s in db.query(CourseSchedule.chapter_id).filter(
                        CourseSchedule.batch_list_id == batch.id,
                        CourseSchedule.chapter_id.isnot(None)
                    ).all()
                }
                unscheduled_chapter = db.query(CourseChapter).filter(
                    CourseChapter.course_id == course_id,
                    CourseChapter.id.notin_(scheduled_chapter_ids)
                ).order_by(CourseChapter.chapter_index.asc()).first()
                if unscheduled_chapter:
                    next_chapter_title = unscheduled_chapter.title
                    next_chapter_index = unscheduled_chapter.chapter_index

    # Fetch chapters for the course
    course_chapters = db.query(CourseChapter).filter(
        CourseChapter.course_id == course_id
    ).order_by(CourseChapter.chapter_index).all()

    # Fetch chapter -> schedule mapping
    chapter_schedule_map = {}
    if batch:
        batch_schedules = db.query(CourseSchedule).filter(
            CourseSchedule.batch_list_id == batch.id
        ).all()
        for bs in batch_schedules:
            if bs.chapter_id:
                dur_h = 2
                d = (bs.estimated_duration or '').lower().replace('hours', '').replace('hour', '').strip()
                try:
                    dur_h = float(d)
                except Exception:
                    pass
                end_time = bs.scheduled_at + timedelta(hours=dur_h) if bs.scheduled_at else None
                chapter_schedule_map[bs.chapter_id] = {
                    "scheduled_at": bs.scheduled_at.isoformat() if bs.scheduled_at else None,
                    "is_past": end_time < now if end_time else (bs.scheduled_at < now if bs.scheduled_at else False),
                    "is_ongoing": bs.scheduled_at < now and end_time and end_time >= now if bs.scheduled_at else False,
                }

    chapters_data = []
    for ch in course_chapters:
        sch = chapter_schedule_map.get(ch.id, {})
        chapters_data.append({
            "id": ch.id,
            "chapter_index": ch.chapter_index,
            "title": ch.title,
            "scheduled_at": sch.get("scheduled_at"),
            "is_past": sch.get("is_past", False),
            "is_ongoing": sch.get("is_ongoing", False),
        })

    # Calculate progress based on completed chapters (past or ongoing) out of total chapters
    total_chapters = len(chapters_data)
    if total_chapters > 0:
        completed_count = sum(1 for ch in chapters_data if ch["is_past"] or ch["is_ongoing"])
        progress = round((completed_count / total_chapters) * 100)
    else:
        progress = 0

    return {
        "is_purchased": True,
        "batch_assigned": batch_assigned,
        "schedule_assigned": schedule_assigned,
        "schedule": schedule_info,
        "is_ongoing": is_ongoing,
        "next_chapter_title": next_chapter_title,
        "next_chapter_index": next_chapter_index,
        "chapters": chapters_data,
        "progress": progress,
    }


@router.get("/my-library")
def get_my_library(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns the current user's purchased courses, indicators, and bots."""
    purchases = db.query(Purchase).filter(Purchase.user_id == current_user.id).all()

    course_ids = [p.product_id for p in purchases if p.product_section == 1]
    indicator_ids = [p.product_id for p in purchases if p.product_section == 2]
    bot_ids = [p.product_id for p in purchases if p.product_section == 3]

    # Courses with schedule info, sorted by scheduled_at (unscheduled at bottom)
    courses = []
    if course_ids:
        course_objs = db.query(Course).filter(Course.id.in_(course_ids)).all()
        for c in course_objs:
            now = datetime.now()
            next_schedule = db.query(CourseSchedule).filter(
                CourseSchedule.course_id == c.id,
                CourseSchedule.scheduled_at > now
            ).order_by(CourseSchedule.scheduled_at.asc()).first()

            prev_schedule = db.query(CourseSchedule).filter(
                CourseSchedule.course_id == c.id,
                CourseSchedule.scheduled_at <= now
            ).order_by(CourseSchedule.scheduled_at.desc()).first()

            is_ongoing = False
            active_schedule = next_schedule

            if prev_schedule:
                dur_hours = 2
                if prev_schedule.estimated_duration:
                    d = prev_schedule.estimated_duration.lower().replace('hours', '').replace('hour', '').strip()
                    try:
                        dur_hours = float(d)
                    except Exception:
                        pass
                end_time = prev_schedule.scheduled_at + timedelta(hours=dur_hours)
                if end_time > now:
                    is_ongoing = True
                    active_schedule = prev_schedule

            schedule_chapter_title = None
            schedule_chapter_index = None
            if active_schedule:
                ch = active_schedule.chapter
                schedule_chapter_title = ch.title if ch else (active_schedule.custom_chapter_name or None)
                schedule_chapter_index = ch.chapter_index if ch else None

            courses.append({
                "id": c.id,
                "title": c.title,
                "description": c.description,
                "thumbnail": c.course_thumbnail,
                "scheduled_at": active_schedule.scheduled_at.isoformat() if active_schedule and active_schedule.scheduled_at else None,
                "estimated_duration": active_schedule.estimated_duration if active_schedule else None,
                "course_link": active_schedule.join_link if active_schedule else None,
                "is_ongoing": is_ongoing,
                "next_chapter_title": schedule_chapter_title,
                "next_chapter_index": schedule_chapter_index,
            })
        # Sort: scheduled first (ascending), unscheduled at bottom
        courses.sort(key=lambda x: (x['scheduled_at'] is None, x['scheduled_at'] or ''))

    indicators = []
    if indicator_ids:
        ind_objs = db.query(Indicator).filter(Indicator.id.in_(indicator_ids)).all()
        for ind in ind_objs:
            indicators.append({
                "id": ind.id,
                "name": ind.indicator_name,
                "description": ind.indicator_description,
                "thumbnail": ind.showcase_image,
            })

    # Bots: derive from signal_users instead of purchases
    bots = []
    connection = get_db_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(f"SELECT * FROM {DB_TABLE_USERS} WHERE user = %s", (current_user.UserID,))
            row = cursor.fetchone()
            if row:
                today = date.today()
                all_bots = db.query(Bot).filter(Bot.status == "active").all()
                for b in all_bots:
                    model = get_bot_model(b.token_env)
                    if model:
                        access = row.get(f"{model}_Access")
                        expiry = row.get(f"{model}_Expiry")
                        if access and expiry and expiry >= today:
                            bots.append({
                                "id": b.id,
                                "name": b.display_name,
                                "description": b.description,
                                "thumbnail": b.thumbnail,
                                "expiry": expiry.isoformat(),
                            })
        finally:
            cursor.close()
            connection.close()

    return {"courses": courses, "indicators": indicators, "bots": bots}
