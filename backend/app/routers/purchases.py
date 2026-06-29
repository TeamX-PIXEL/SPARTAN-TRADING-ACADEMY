from datetime import datetime, timezone, timedelta, date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.database import get_db, get_db_connection
from app.models import (
    User, Course, Batch, Indicator, Bot, Transaction,
    BatchMember, IndicatorMember, BotMember,
)
from app.models.admin import AdminUser
from app.schemas import TransactionCreate, TransactionResponse, PurchaseRequest, RenewRequest, DiscordRenewRequest, TransactionUpdate
from app.core.deps import get_current_user, get_current_admin

router = APIRouter(prefix="", tags=["Transactions"])


# ==========================================
# HELPERS
# ==========================================
def _get_user_billing(db: Session, username: str):
    """Fetch address, country, pincode from users table for a given username."""
    user = db.query(User).filter(User.UserID == username).first()
    if user:
        return {"address": user.address, "country": user.country, "pincode": user.pincode}
    return {"address": None, "country": None, "pincode": None}


def parse_expiry_period(expiry_period: str, now: datetime = None):
    """
    Parses an expiry_period string (e.g. '7D', '1M', '3M', '6M', '1Y', '1L')
    Returns (extension_type, extension_length, expiry_date).
    """
    from dateutil.relativedelta import relativedelta

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
        expiry_date = None
    else:
        expiry_date = now + relativedelta(months=1)

    return ext_type, ext_length, expiry_date


# ==========================================
# ADMIN: TRANSACTION MANAGEMENT
# ==========================================
SECTION_MAP = {
    "Course": "academy",
    "Indicator": "indicators",
    "Bot": "bot_alerts",
}


@router.get("/api/admin/transactions")
def list_transactions(
    unsettled: bool = False,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """List all transactions with user info and product titles."""
    query = (
        db.query(Transaction, User)
        .join(User, Transaction.username == User.UserID, isouter=True)
    )
    if unsettled:
        query = query.filter(Transaction.settlement_date.is_(None))
    rows = query.order_by(Transaction.created_at.desc()).all()

    results = []
    for txn, user in rows:
        item_name = None
        resolved_course_id = None
        if txn.product_section == "Course" and txn.batch_id:
            batch = db.query(Batch).filter(Batch.batch_id == txn.batch_id).first()
            if batch:
                resolved_course_id = batch.course_id
                course = db.query(Course).filter(Course.course_id == batch.course_id).first()
                item_name = course.title if course else None
        elif txn.product_section == "Indicator" and txn.indicator_id:
            indicator = db.query(Indicator).filter(Indicator.indicator_id == txn.indicator_id).first()
            item_name = indicator.title if indicator else None
        elif txn.product_section == "Bot" and txn.bot_id:
            bot = db.query(Bot).filter(Bot.bot_id == txn.bot_id).first()
            item_name = bot.title if bot else None

        customer_name = f"{user.firstname or ''} {user.lastname or ''}".strip() if user else None
        if not customer_name:
            admin_user = db.query(AdminUser).filter(AdminUser.username == txn.username).first()
            if admin_user:
                customer_name = "Admin"
            else:
                customer_name = txn.username

        results.append({
            "id": str(txn.id),
            "date": txn.created_at.isoformat() if txn.created_at else None,
            "section": SECTION_MAP.get(txn.product_section, txn.product_section),
            "customer": customer_name,
            "item": item_name,
            "amount": txn.amount,
            "method": txn.method,
            "status": txn.status,
            "username": txn.username,
            "product_section": txn.product_section,
            "course_id": resolved_course_id,
            "indicator_id": txn.indicator_id,
            "bot_id": txn.bot_id,
            "expiry": txn.expiry.isoformat() if txn.expiry else None,
            "created_at": txn.created_at.isoformat() if txn.created_at else None,
            "settlement_date": txn.settlement_date.isoformat() if txn.settlement_date else None,
            "address": txn.address,
            "country": txn.country,
            "pincode": txn.pincode,
        })

    return results


@router.get("/api/admin/transactions/summary")
def transaction_summary(
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """KPI stats: this/last month revenue & transactions, plus by-section breakdown with top items."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)

    total = db.query(
        func.coalesce(func.sum(Transaction.amount), 0.0),
        func.count(Transaction.id),
    ).filter(Transaction.status == "completed").first()

    this_month = db.query(
        func.coalesce(func.sum(Transaction.amount), 0.0),
        func.count(Transaction.id),
    ).filter(
        Transaction.status == "completed",
        Transaction.created_at >= month_start,
    ).first()

    last_month = db.query(
        func.coalesce(func.sum(Transaction.amount), 0.0),
        func.count(Transaction.id),
    ).filter(
        Transaction.status == "completed",
        Transaction.created_at >= last_month_start,
        Transaction.created_at < month_start,
    ).first()

    by_section_raw = (
        db.query(
            Transaction.product_section,
            func.coalesce(func.sum(Transaction.amount), 0.0),
            func.count(Transaction.id),
        )
        .filter(Transaction.status == "completed")
        .group_by(Transaction.product_section)
        .all()
    )

    by_section = []
    for section_name, revenue, count in by_section_raw:
        top_item = None
        top_item_revenue = 0

        product_id_col = None
        product_table = None
        if section_name == "Indicator":
            product_id_col = Transaction.indicator_id
            product_table = Indicator
        elif section_name == "Bot":
            product_id_col = Transaction.bot_id
            product_table = Bot

        if product_id_col is not None and product_table is not None:
            item_revenues = (
                db.query(
                    product_id_col,
                    func.coalesce(func.sum(Transaction.amount), 0.0).label("item_rev"),
                )
                .filter(
                    Transaction.status == "completed",
                    Transaction.product_section == section_name,
                    product_id_col.isnot(None),
                )
                .group_by(product_id_col)
                .order_by(func.sum(Transaction.amount).desc())
                .limit(1)
                .first()
            )
            if item_revenues and item_revenues[0]:
                if section_name == "Indicator":
                    ind = db.query(Indicator).filter(Indicator.indicator_id == item_revenues[0]).first()
                    top_item = ind.title if ind else None
                elif section_name == "Bot":
                    bot = db.query(Bot).filter(Bot.bot_id == item_revenues[0]).first()
                    top_item = bot.title if bot else None
                top_item_revenue = item_revenues[1]
        elif section_name == "Course":
            item_revenues = (
                db.query(
                    Batch.course_id,
                    func.coalesce(func.sum(Transaction.amount), 0.0).label("item_rev"),
                )
                .join(Batch, Batch.batch_id == Transaction.batch_id)
                .filter(
                    Transaction.status == "completed",
                    Transaction.product_section == "Course",
                    Transaction.batch_id.isnot(None),
                )
                .group_by(Batch.course_id)
                .order_by(func.sum(Transaction.amount).desc())
                .limit(1)
                .first()
            )
            if item_revenues and item_revenues[0]:
                c = db.query(Course).filter(Course.course_id == item_revenues[0]).first()
                top_item = c.title if c else None
                top_item_revenue = item_revenues[1]

        by_section.append({
            "section": SECTION_MAP.get(section_name, section_name),
            "revenue": float(revenue),
            "count": count,
            "topItem": top_item,
        })

    return {
        "total_revenue": float(total[0]),
        "total_transactions": total[1],
        "this_month_revenue": float(this_month[0]),
        "this_month_transactions": this_month[1],
        "last_month_revenue": float(last_month[0]),
        "last_month_transactions": last_month[1],
        "by_section": by_section,
    }


@router.get("/api/admin/transactions/monthly-revenue")
def monthly_revenue(
    months: int = 12,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Monthly revenue breakdown by section for the last N months. Returns all 12 months (zero-filled)."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    cutoff = now - timedelta(days=months * 31)

    rows = (
        db.query(
            extract("year", Transaction.created_at).label("year"),
            extract("month", Transaction.created_at).label("month"),
            Transaction.product_section,
            func.coalesce(func.sum(Transaction.amount), 0.0).label("revenue"),
        )
        .filter(
            Transaction.status == "completed",
            Transaction.created_at >= cutoff,
        )
        .group_by("year", "month", Transaction.product_section)
        .order_by("year", "month")
        .all()
    )

    month_map: dict[str, dict] = {}
    for r in rows:
        key = f"{int(r.year)}-{int(r.month):02d}"
        if key not in month_map:
            month_map[key] = {"academy": 0.0, "indicators": 0.0, "bot_alerts": 0.0}
        section_key = SECTION_MAP.get(r.product_section, r.product_section)
        month_map[key][section_key] = float(r.revenue)

    result = []
    for i in range(months, -1, -1):
        # Proper calendar month traversal to avoid drift
        year = now.year
        month = now.month - i
        while month <= 0:
            month += 12
            year -= 1
        key = f"{year}-{month:02d}"
        dt = datetime(year, month, 1)
        label = dt.strftime("%b %y")
        sections = month_map.get(key, {"academy": 0.0, "indicators": 0.0, "bot_alerts": 0.0})
        total = sections["academy"] + sections["indicators"] + sections["bot_alerts"]
        result.append({
            "monthKey": key,
            "monthLabel": label,
            "academy": sections["academy"],
            "indicators": sections["indicators"],
            "bot_alerts": sections["bot_alerts"],
            "total": total,
        })

    return result


@router.post("/api/admin/transactions")
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Create a transaction and upsert the corresponding member record."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    section = payload.product_section

    # Validate username belongs to a real client, not an admin
    admin_match = db.query(AdminUser).filter(AdminUser.username == payload.username).first()
    if admin_match:
        raise HTTPException(status_code=400, detail="Cannot create transaction for admin user. Use a client username.")

    # Validate product exists and resolve the string ID
    product_id = None
    if section == "Course":
        course = db.query(Course).filter(Course.course_id == payload.course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        product_id = course.course_id
    elif section == "Indicator":
        indicator = db.query(Indicator).filter(Indicator.indicator_id == payload.indicator_id).first()
        if not indicator:
            raise HTTPException(status_code=404, detail="Indicator not found")
        product_id = indicator.indicator_id
    elif section == "Bot":
        bot = db.query(Bot).filter(Bot.bot_id == payload.bot_id).first()
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        product_id = bot.bot_id
    else:
        raise HTTPException(status_code=400, detail="Invalid product_section")

    # 1. Insert transaction
    batch_id_val = None
    if section == "Course":
        course = db.query(Course).filter(Course.course_id == payload.course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        batch = db.query(Batch).filter(Batch.course_id == course.course_id).order_by(Batch.id.desc()).first()
        batch_id_val = batch.batch_id if batch else None

    billing = _get_user_billing(db, payload.username)

    txn = Transaction(
        username=payload.username,
        product_section=section,
        indicator_id=payload.indicator_id if section == "Indicator" else None,
        bot_id=payload.bot_id if section == "Bot" else None,
        batch_id=batch_id_val,
        expiry=payload.expiry,
        amount=payload.amount,
        method=payload.method,
        status=payload.status,
        address=billing["address"],
        country=billing["country"],
        pincode=billing["pincode"],
    )
    db.add(txn)

    # 2. Upsert member record
    if section == "Course":
        existing = db.query(BatchMember).filter(
            BatchMember.username == payload.username,
            BatchMember.batch_id == batch_id_val,
        ).first()
        if existing:
            existing.expiry = payload.expiry or existing.expiry
            existing.joined_at = existing.joined_at
            db.add(existing)
        else:
            db.add(BatchMember(
                username=payload.username,
                batch_id=batch_id_val,
                expiry=payload.expiry,
            ))

        # 3. Increment purchased_count
        if batch:
            batch.purchased_count = (batch.purchased_count or 0) + 1
            db.add(batch)
        else:
            course.purchased_count = (course.purchased_count or 0) + 1
            db.add(course)

    elif section == "Indicator":
        existing = db.query(IndicatorMember).filter(
            IndicatorMember.username == payload.username,
            IndicatorMember.indicator_id == payload.indicator_id,
        ).first()
        if existing:
            existing.expiry = payload.expiry or existing.expiry
            db.add(existing)
        else:
            db.add(IndicatorMember(
                username=payload.username,
                indicator_id=payload.indicator_id,
                expiry=payload.expiry,
            ))

        indicator.purchased_count = (indicator.purchased_count or 0) + 1
        db.add(indicator)

    elif section == "Bot":
        existing = db.query(BotMember).filter(
            BotMember.username == payload.username,
            BotMember.bot_id == payload.bot_id,
        ).first()
        if existing:
            existing.expiry = payload.expiry or existing.expiry
            db.add(existing)
        else:
            db.add(BotMember(
                username=payload.username,
                bot_id=payload.bot_id,
                expiry=payload.expiry,
            ))

        bot.purchased_count = (bot.purchased_count or 0) + 1
        db.add(bot)

    db.commit()
    db.refresh(txn)
    return TransactionResponse.model_validate(txn)


@router.put("/api/admin/transactions/{transaction_id}")
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Update settlement_date, address, country, pincode on a transaction."""
    txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if payload.settlement_date is not None:
        txn.settlement_date = payload.settlement_date
    if payload.address is not None:
        txn.address = payload.address
    if payload.country is not None:
        txn.country = payload.country
    if payload.pincode is not None:
        txn.pincode = payload.pincode

    db.commit()
    db.refresh(txn)
    return {"ok": True, "id": txn.id}


# ==========================================
# USER-FACING: ENROLLMENT STATUS
# ==========================================
@router.get("/api/enrollment-status/{course_id}")
def get_enrollment_status(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns enrollment status for a specific course."""
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    txn = db.query(Transaction).join(Batch, Batch.batch_id == Transaction.batch_id).filter(
        Transaction.username == current_user.UserID,
        Batch.course_id == course_id,
        Transaction.status == "completed",
    ).first()

    if not txn:
        return {"is_purchased": False, "expiry": None, "member_since": None}

    member = db.query(BatchMember).join(Batch, Batch.batch_id == BatchMember.batch_id).filter(
        BatchMember.username == current_user.UserID,
        Batch.course_id == course_id,
    ).first()

    return {
        "is_purchased": True,
        "expiry": txn.expiry.isoformat() if txn.expiry else None,
        "member_since": member.joined_at.isoformat() if member and member.joined_at else None,
    }


# ==========================================
# USER-FACING: MY PURCHASES
# ==========================================
@router.get("/my-purchases")
def get_my_purchases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the current user's purchased courses, indicators, and bots."""
    txns = db.query(Transaction).filter(
        Transaction.username == current_user.UserID,
        Transaction.status == "completed",
    ).all()

    course_ids = []
    for t in txns:
        if t.product_section == "Course" and t.batch_id:
            batch = db.query(Batch).filter(Batch.batch_id == t.batch_id).first()
            if batch:
                course_ids.append(batch.course_id)
    course_ids = list(set(course_ids))
    indicator_ids = [t.indicator_id for t in txns if t.product_section == "Indicator" and t.indicator_id]
    bot_ids = [t.bot_id for t in txns if t.product_section == "Bot" and t.bot_id]

    courses = db.query(Course.course_id).filter(Course.course_id.in_(course_ids)).all() if course_ids else []
    indicators = db.query(Indicator.indicator_id).filter(Indicator.indicator_id.in_(indicator_ids)).all() if indicator_ids else []
    bots = db.query(Bot.bot_id).filter(Bot.bot_id.in_(bot_ids)).all() if bot_ids else []

    return {
        "courses": [c[0] for c in courses],
        "indicators": [i[0] for i in indicators],
        "bots": [b[0] for b in bots],
    }


# ==========================================
# USER-FACING: MY LIBRARY
# ==========================================
@router.get("/my-library")
def get_my_library(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the current user's purchased courses, indicators, and bots with details.
    Courses are batch-centric: data flows from batch_members → batches → courses."""
    txns = db.query(Transaction).filter(
        Transaction.username == current_user.UserID,
        Transaction.status == "completed",
    ).all()

    indicator_ids = list({t.indicator_id for t in txns if t.product_section == "Indicator" and t.indicator_id})
    bot_ids = list({t.bot_id for t in txns if t.product_section == "Bot" and t.bot_id})

    memberships = db.query(BatchMember).filter(
        BatchMember.username == current_user.UserID,
    ).all()

    courses = []
    seen_batch_ids = set()
    for m in memberships:
        if not m.batch_id or m.batch_id in seen_batch_ids:
            continue
        seen_batch_ids.add(m.batch_id)

        batch = db.query(Batch).filter(Batch.batch_id == m.batch_id).first()
        if not batch:
            continue

        c = db.query(Course).filter(Course.course_id == batch.course_id).first()
        if not c:
            continue

        txn = db.query(Transaction).filter(
            Transaction.username == current_user.UserID,
            Transaction.batch_id == batch.batch_id,
        ).order_by(Transaction.created_at.desc()).first()

        if batch.completed_at:
            computed_status = "completed"
        elif batch.scheduled_at and batch.scheduled_at <= datetime.now(timezone.utc).replace(tzinfo=None):
            computed_status = "ongoing"
        else:
            computed_status = "upcoming"

        courses.append({
            "id": c.id,
            "course_id": c.course_id,
            "batch_id": batch.batch_id,
            "title": c.title,
            "description": c.description,
            "long_description": c.long_description or c.description,
            "thumbnail": c.image or c.course_thumbnail,
            "status": computed_status,
            "expiry": m.expiry.isoformat() if m and m.expiry else (
                txn.expiry.isoformat() if txn and txn.expiry else None
            ),
            "purchased_at": txn.created_at.isoformat() if txn else None,
            "discord_channel_id": batch.discord_channel_id or c.discord_channel_id,
            "discord_renewal_price": batch.discord_renewal_price or c.discord_renewal_price,
            "scheduled_at": batch.scheduled_at.isoformat() if batch.scheduled_at else None,
            "lecturer": batch.instructor or "",
            "difficulty": c.difficulty,
            "duration_months": c.duration_months,
        })

    indicators = []
    if indicator_ids:
        ind_objs = db.query(Indicator).filter(Indicator.indicator_id.in_(indicator_ids)).all()
        for ind in ind_objs:
            member = db.query(IndicatorMember).filter(
                IndicatorMember.username == current_user.UserID,
                IndicatorMember.indicator_id == ind.indicator_id,
            ).first()
            txn = db.query(Transaction).filter(
                Transaction.username == current_user.UserID,
                Transaction.indicator_id == ind.indicator_id,
            ).order_by(Transaction.created_at.desc()).first()

            indicators.append({
                "id": ind.id,
                "indicator_id": ind.indicator_id,
                "name": ind.title,
                "description": ind.description,
                "thumbnail": ind.image,
                "expiry": member.expiry.isoformat() if member and member.expiry else (
                    txn.expiry.isoformat() if txn and txn.expiry else None
                ),
                "purchased_at": txn.created_at.isoformat() if txn else None,
            })

    bots = []
    if bot_ids:
        bot_objs = db.query(Bot).filter(Bot.bot_id.in_(bot_ids)).all()
        for b in bot_objs:
            member = db.query(BotMember).filter(
                BotMember.username == current_user.UserID,
                BotMember.bot_id == b.bot_id,
            ).first()
            txn = db.query(Transaction).filter(
                Transaction.username == current_user.UserID,
                Transaction.bot_id == b.bot_id,
            ).order_by(Transaction.created_at.desc()).first()

            bots.append({
                "id": b.id,
                "bot_id": b.bot_id,
                "name": b.title,
                "description": b.description,
                "thumbnail": b.image,
                "expiry": member.expiry.isoformat() if member and member.expiry else (
                    txn.expiry.isoformat() if txn and txn.expiry else None
                ),
                "purchased_at": txn.created_at.isoformat() if txn else None,
            })

    return {"courses": courses, "indicators": indicators, "bots": bots}


# ==========================================
# USER-FACING: MY TRANSACTIONS
# ==========================================
@router.get("/my-transactions")
def get_my_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the current user's transaction history with product titles and images."""
    txns = db.query(Transaction).filter(
        Transaction.username == current_user.UserID,
        Transaction.status == "completed",
    ).order_by(Transaction.created_at.desc()).all()

    results = []
    for txn in txns:
        product_title = None
        product_image = None
        product_id = None

        if txn.product_section == "Course" and txn.batch_id:
            batch = db.query(Batch).filter(Batch.batch_id == txn.batch_id).first()
            if batch:
                course = db.query(Course).filter(Course.course_id == batch.course_id).first()
            else:
                course = None
            if course:
                product_title = course.title
                product_image = course.course_thumbnail or course.image
                product_id = course.course_id
        elif txn.product_section == "Indicator" and txn.indicator_id:
            indicator = db.query(Indicator).filter(Indicator.indicator_id == txn.indicator_id).first()
            if indicator:
                product_title = indicator.title
                product_image = indicator.image
                product_id = indicator.indicator_id
        elif txn.product_section == "Bot" and txn.bot_id:
            bot = db.query(Bot).filter(Bot.bot_id == txn.bot_id).first()
            if bot:
                product_title = bot.title
                product_image = bot.image
                product_id = bot.bot_id

        if not product_title:
            if txn.product_section == "Course":
                product_title = txn.batch_id or "Course"
            elif txn.product_section == "Indicator":
                product_title = txn.indicator_id
            elif txn.product_section == "Bot":
                product_title = txn.bot_id

        results.append({
            "id": str(txn.id),
            "date": txn.created_at.isoformat() if txn.created_at else None,
            "product_id": product_id,
            "productTitle": product_title,
            "productImage": product_image or "https://picsum.photos/seed/default/600/400",
            "type": txn.type or "Purchase",
            "amount": txn.amount,
            "status": "SUCCESSFUL",
            "tvid": current_user.tvid or "",
            "product_section": txn.product_section,
            "method": txn.method,
        })

    return results


# ==========================================
# USER-FACING: MY EXPIRATIONS
# ==========================================
@router.get("/my-expirations")
def get_my_expirations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns expiration dates for indicators and bots the user is enrolled in."""
    indicator_members = db.query(IndicatorMember).filter(
        IndicatorMember.username == current_user.UserID,
    ).all()

    bot_members = db.query(BotMember).filter(
        BotMember.username == current_user.UserID,
    ).all()

    expirations = {}
    for im in indicator_members:
        if im.expiry:
            expirations[im.indicator_id] = im.expiry.isoformat()

    for bm in bot_members:
        if bm.expiry:
            expirations[bm.bot_id] = bm.expiry.isoformat()

    return expirations


# ==========================================
# USER-FACING: PURCHASE
# ==========================================
@router.post("/purchase")
def purchase_item(
    payload: PurchaseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Purchase a course, indicator, or bot."""
    section = payload.product_section
    product_id = payload.product_id

    # TradingView ID is required only for indicators and bots
    if section in ("Indicator", "Bot") and not current_user.tvid:
        raise HTTPException(status_code=400, detail="TVID_REQUIRED")

    # Validate product exists
    if section == "Course":
        product = db.query(Course).filter(Course.course_id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Course not found")
    elif section == "Indicator":
        product = db.query(Indicator).filter(Indicator.indicator_id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Indicator not found")
    elif section == "Bot":
        product = db.query(Bot).filter(Bot.bot_id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Bot not found")
    else:
        raise HTTPException(status_code=400, detail="Invalid product_section")

    # Check if already purchased
    existing_query = db.query(Transaction).filter(
        Transaction.username == current_user.UserID,
        Transaction.status == "completed",
    )
    if section == "Course":
        course = db.query(Course).filter(Course.course_id == product_id).first()
        existing_batch_ids = [b.batch_id for b in db.query(Batch).filter(Batch.course_id == product_id).all()] if course else []
        if existing_batch_ids:
            existing_query = existing_query.filter(Transaction.batch_id.in_(existing_batch_ids))
    elif section == "Indicator":
        existing_query = existing_query.filter(Transaction.indicator_id == product_id)
    elif section == "Bot":
        existing_query = existing_query.filter(Transaction.bot_id == product_id)

    if existing_query.first():
        raise HTTPException(status_code=400, detail="Already purchased")

    # Create transaction
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    expiry_date = now + timedelta(days=365)

    txn = Transaction(
        username=current_user.UserID,
        product_section=section,
        indicator_id=product_id if section == "Indicator" else None,
        bot_id=product_id if section == "Bot" else None,
        expiry=expiry_date,
        amount=payload.amount,
        method=payload.method or "Card",
        type="Purchase",
        status="completed",
        address=current_user.address,
        country=current_user.country,
        pincode=current_user.pincode,
    )
    db.add(txn)

    # Upsert member record + increment purchased_count
    if section == "Course":
        batch = db.query(Batch).filter(Batch.course_id == product.id).order_by(Batch.id.desc()).first()
        batch_id_val = batch.batch_id if batch else None

        existing_member = db.query(BatchMember).filter(
            BatchMember.username == current_user.UserID,
            BatchMember.batch_id == batch_id_val,
        ).first()
        if not existing_member:
            db.add(BatchMember(
                username=current_user.UserID,
                batch_id=batch_id_val,
                expiry=expiry_date,
            ))
            if batch:
                batch.purchased_count = (batch.purchased_count or 0) + 1
            else:
                product.purchased_count = (product.purchased_count or 0) + 1

        txn.batch_id = batch_id_val

    elif section == "Indicator":
        existing_member = db.query(IndicatorMember).filter(
            IndicatorMember.username == current_user.UserID,
            IndicatorMember.indicator_id == product_id,
        ).first()
        if not existing_member:
            db.add(IndicatorMember(
                username=current_user.UserID,
                indicator_id=product_id,
                expiry=expiry_date,
            ))
            product.purchased_count = (product.purchased_count or 0) + 1

    elif section == "Bot":
        existing_member = db.query(BotMember).filter(
            BotMember.username == current_user.UserID,
            BotMember.bot_id == product_id,
        ).first()
        if not existing_member:
            db.add(BotMember(
                username=current_user.UserID,
                bot_id=product_id,
                expiry=expiry_date,
            ))
            product.purchased_count = (product.purchased_count or 0) + 1

    db.commit()

    return {"success": True, "message": "Purchase successful"}


# ==========================================
# USER-FACING: RENEW
# ==========================================
@router.post("/renew")
def renew_product(
    payload: RenewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Renew a product subscription (Indicator or Bot)."""
    section = payload.product_section
    product_id = payload.product_id

    if section not in ("Indicator", "Bot"):
        raise HTTPException(status_code=400, detail="Renewal only available for Indicators and Bots")

    # Find existing member
    member = None
    if section == "Indicator":
        member = db.query(IndicatorMember).filter(
            IndicatorMember.username == current_user.UserID,
            IndicatorMember.indicator_id == product_id,
        ).first()
    elif section == "Bot":
        member = db.query(BotMember).filter(
            BotMember.username == current_user.UserID,
            BotMember.bot_id == product_id,
        ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Not enrolled in this product")

    # Calculate new expiry: extend from now or current expiry, whichever is later
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    base_date = now
    if member.expiry and member.expiry > now:
        base_date = member.expiry
    new_expiry = base_date + timedelta(days=payload.duration_days)

    # Update member expiry
    member.expiry = new_expiry

    # Create renewal transaction
    txn = Transaction(
        username=current_user.UserID,
        product_section=section,
        indicator_id=product_id if section == "Indicator" else None,
        bot_id=product_id if section == "Bot" else None,
        expiry=new_expiry,
        amount=payload.amount,
        method=payload.method or "Card",
        type="Renewal",
        status="completed",
        address=current_user.address,
        country=current_user.country,
        pincode=current_user.pincode,
    )
    db.add(txn)
    db.commit()

    return {
        "success": True,
        "expiration": new_expiry.isoformat(),
    }


# ==========================================
# USER-FACING: DISCORD RENEWAL
# ==========================================
@router.post("/renew-discord")
def renew_discord(
    payload: DiscordRenewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Renew Discord support for a course (1 year extension)."""
    course = db.query(Course).filter(Course.course_id == payload.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    batch = db.query(Batch).filter(Batch.course_id == course.course_id).order_by(Batch.id.desc()).first()
    batch_id_val = batch.batch_id if batch else None

    # Create renewal transaction
    txn = Transaction(
        username=current_user.UserID,
        product_section="Course",
        batch_id=batch_id_val,
        expiry=None,
        amount=payload.amount,
        method=payload.method or "Card",
        type="Renewal",
        status="completed",
        address=current_user.address,
        country=current_user.country,
        pincode=current_user.pincode,
    )
    db.add(txn)
    db.commit()

    return {
        "success": True,
        "message": f"Discord support renewed for {course.title}",
    }
