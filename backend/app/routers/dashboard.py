from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from typing import Dict
import calendar
from sqlalchemy import func
from app.database import get_db
from app.models import User, Course, Purchase, CourseProgress, CourseWaitlist, BatchTemplate, BatchList, CourseSchedule, CourseChapter
from app.core.deps import get_current_admin

router = APIRouter(prefix="/api/admin/dashboard", tags=["Dashboard"])


def _month_bounds(now: datetime):
    """Return (start_of_this_month, start_of_next_month, start_of_prev_month)."""
    start_this = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_day = calendar.monthrange(start_this.year, start_this.month)[1]
    start_next = start_this.replace(day=1) + timedelta(days=last_day)
    start_prev = (start_this - timedelta(days=1)).replace(day=1)
    return start_this, start_next, start_prev


@router.get("/overview")
def dashboard_overview(db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Aggregated KPI counts for the 4 top cards (current vs previous month)."""
    now = datetime.now(timezone.utc)
    start_this, start_next, start_prev = _month_bounds(now)

    new_signups_this = db.query(User).filter(User.created_at >= start_this, User.created_at < start_next).count()
    new_signups_prev = db.query(User).filter(User.created_at >= start_prev, User.created_at < start_this).count()

    active_users_this = 0
    active_users_prev = 0
    try:
        active_users_this = db.query(User).filter(User.last_login != None, User.last_login >= start_this, User.last_login < start_next).count()
        active_users_prev = db.query(User).filter(User.last_login != None, User.last_login >= start_prev, User.last_login < start_this).count()
    except Exception as exc:
        print(f"Warning: failed to compute active_users (is users.last_login present?): {exc}")

    products_this_rows = (
        db.query(Purchase.product_section)
        .filter(Purchase.purchased_at >= start_this, Purchase.purchased_at < start_next)
        .all()
    )
    products_prev_rows = (
        db.query(Purchase.product_section)
        .filter(Purchase.purchased_at >= start_prev, Purchase.purchased_at < start_this)
        .all()
    )

    section_labels = {1: "courses", 2: "indicators", 3: "bots"}

    def _breakdown(rows):
        counts: Dict[str, int] = {"courses": 0, "indicators": 0, "bots": 0}
        for (sec,) in rows:
            label = section_labels.get(sec)
            if label:
                counts[label] += 1
        return counts

    breakdown_this = _breakdown(products_this_rows)
    breakdown_prev = _breakdown(products_prev_rows)

    products_sold_this = sum(breakdown_this.values())
    products_sold_prev = sum(breakdown_prev.values())

    progress_user_rows_this = (
        db.query(CourseProgress.user_id, CourseProgress.course_id)
        .filter(CourseProgress.completed_at != None, CourseProgress.completed_at >= start_this, CourseProgress.completed_at < start_next)
        .all()
    )
    progress_user_rows_prev = (
        db.query(CourseProgress.user_id, CourseProgress.course_id)
        .filter(CourseProgress.completed_at != None, CourseProgress.completed_at >= start_prev, CourseProgress.completed_at < start_this)
        .all()
    )

    waitlist_user_rows_this = (
        db.query(CourseWaitlist.user_id, CourseWaitlist.course_id)
        .filter(CourseWaitlist.created_at >= start_this, CourseWaitlist.created_at < start_next)
        .all()
    )
    waitlist_user_rows_prev = (
        db.query(CourseWaitlist.user_id, CourseWaitlist.course_id)
        .filter(CourseWaitlist.created_at >= start_prev, CourseWaitlist.created_at < start_this)
        .all()
    )

    def _participation(rows):
        course_user_pairs = {(cid, uid) for (uid, cid) in rows}
        distinct_users = {uid for (_, uid) in rows}
        per_course: Dict[int, set] = {}
        for (uid, cid) in rows:
            per_course.setdefault(cid, set()).add(uid)
        breakdown = [
            {"course_id": cid, "course_title": None, "participants": len(uids)}
            for cid, uids in per_course.items()
        ]
        return {
            "total_users": len(distinct_users),
            "courses": breakdown,
            "course_user_pairs": course_user_pairs,
        }

    progress_this = _participation(progress_user_rows_this)
    progress_prev = _participation(progress_user_rows_prev)
    waitlist_this = _participation(waitlist_user_rows_this)
    waitlist_prev = _participation(waitlist_user_rows_prev)

    combined_this_pairs = progress_this["course_user_pairs"] | waitlist_this["course_user_pairs"]
    combined_prev_pairs = progress_prev["course_user_pairs"] | waitlist_prev["course_user_pairs"]
    combined_this_users = {uid for (_, uid) in combined_this_pairs}
    combined_prev_users = {uid for (_, uid) in combined_prev_pairs}

    def _combined_breakdown(this_pairs, prev_pairs):
        per_course_this: Dict[int, set] = {}
        for (uid, cid) in this_pairs:
            per_course_this.setdefault(cid, set()).add(uid)
        per_course_prev: Dict[int, set] = {}
        for (uid, cid) in prev_pairs:
            per_course_prev.setdefault(cid, set()).add(uid)
        all_cids = set(per_course_this.keys()) | set(per_course_prev.keys())
        return [
            {
                "course_id": cid,
                "course_title": None,
                "this_month": len(per_course_this.get(cid, set())),
                "prev_month": len(per_course_prev.get(cid, set())),
            }
            for cid in all_cids
        ]

    participated_breakdown = _combined_breakdown(combined_this_pairs, combined_prev_pairs)

    course_ids = {row["course_id"] for row in participated_breakdown}
    if course_ids:
        course_titles = {
            c.id: c.title
            for c in db.query(Course).filter(Course.id.in_(course_ids)).all()
        }
        for row in participated_breakdown:
            row["course_title"] = course_titles.get(row["course_id"], f"Course #{row['course_id']}")

    return {
        "new_signups": {
            "this_month": new_signups_this,
            "prev_month": new_signups_prev,
        },
        "active_users": {
            "this_month": active_users_this,
            "prev_month": active_users_prev,
        },
        "products_sold": {
            "this_month": products_sold_this,
            "prev_month": products_sold_prev,
            "breakdown_this_month": breakdown_this,
            "breakdown_prev_month": breakdown_prev,
        },
        "participated_users": {
            "this_month": len(combined_this_users),
            "prev_month": len(combined_prev_users),
            "breakdown": sorted(
                participated_breakdown,
                key=lambda r: (r["this_month"] + r["prev_month"]),
                reverse=True,
            ),
        },
        "month_label": start_this.strftime("%B %Y"),
        "prev_month_label": start_prev.strftime("%B %Y"),
    }


@router.get("/enrolling-courses")
def dashboard_enrolling_courses(db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """For each course, find the next batch (enrolling) and count participants enrolled to it."""
    now = datetime.now(timezone.utc)
    courses = db.query(Course).all()
    result = []

    templates_by_course = {
        t.course_id: t for t in db.query(BatchTemplate).all()
    }

    for course in courses:
        template = templates_by_course.get(course.id)
        target_batch_id = template.current_batch if (template and template.current_batch) else None

        next_batch = None
        if target_batch_id is not None:
            next_batch = (
                db.query(BatchList)
                .filter(
                    BatchList.course_id == course.id,
                    BatchList.assigned_to == target_batch_id,
                )
                .first()
            )

        if next_batch is None:
            next_batch = (
                db.query(BatchList)
                .filter(BatchList.course_id == course.id)
                .filter((BatchList.batch_start_date == None) | (BatchList.batch_start_date >= now))
                .order_by(BatchList.assigned_to.desc())
                .first()
            )

        if next_batch:
            participant_count = (
                db.query(CourseWaitlist)
                .filter(
                    CourseWaitlist.course_id == course.id,
                    CourseWaitlist.waitlist_batch_id == next_batch.assigned_to,
                )
                .count()
            )
            batch_label = (
                f"Batch #{next_batch.assigned_to}" + (f" — starts {next_batch.batch_start_date.strftime('%b %d, %Y')}" if next_batch.batch_start_date else " — future batch")
            )
            batch_id = next_batch.id
        else:
            if target_batch_id is not None:
                participant_count = (
                    db.query(CourseWaitlist)
                    .filter(
                        CourseWaitlist.course_id == course.id,
                        CourseWaitlist.waitlist_batch_id == target_batch_id,
                    )
                    .count()
                )
            else:
                max_batch = (
                    db.query(func.max(CourseWaitlist.waitlist_batch_id))
                    .filter(CourseWaitlist.course_id == course.id)
                    .scalar()
                )
                if max_batch is not None:
                    participant_count = (
                        db.query(CourseWaitlist)
                        .filter(
                            CourseWaitlist.course_id == course.id,
                            CourseWaitlist.waitlist_batch_id == max_batch,
                        )
                        .count()
                    )
                else:
                    participant_count = 0
            batch_label = "not created"
            batch_id = None

        if next_batch is None and participant_count == 0:
            continue

        result.append({
            "course_id": course.id,
            "course_title": course.title,
            "batch_label": batch_label,
            "batch_id": batch_id,
            "participants": participant_count,
        })

    result.sort(key=lambda r: r["participants"], reverse=True)
    return {"courses": result}


@router.get("/upcoming-sessions")
def dashboard_upcoming_sessions(db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Sessions scheduled in the future, sorted by start time ascending."""
    now = datetime.now(timezone.utc)
    rows = (
        db.query(CourseSchedule, Course.title, CourseChapter.title, BatchList.assigned_to)
        .outerjoin(Course, CourseSchedule.course_id == Course.id)
        .outerjoin(CourseChapter, CourseSchedule.chapter_id == CourseChapter.id)
        .outerjoin(BatchList, CourseSchedule.batch_list_id == BatchList.id)
        .filter(CourseSchedule.scheduled_at != None, CourseSchedule.scheduled_at >= now)
        .order_by(CourseSchedule.scheduled_at.asc())
        .all()
    )

    sessions = []
    for schedule, course_title, chapter_title, batch_assigned_to in rows:
        chapter_name = chapter_title or schedule.custom_chapter_name or "Untitled session"
        sessions.append({
            "schedule_id": schedule.id,
            "course_id": schedule.course_id,
            "course_title": course_title or f"Course #{schedule.course_id}",
            "chapter_title": chapter_name,
            "session_type": schedule.session_type,
            "scheduled_at": schedule.scheduled_at.isoformat() if schedule.scheduled_at else None,
            "batch_label": f"Batch #{batch_assigned_to}" if batch_assigned_to is not None else None,
            "join_link": schedule.join_link,
        })
    return {"sessions": sessions}
