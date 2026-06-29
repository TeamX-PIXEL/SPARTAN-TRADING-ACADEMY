from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from typing import Dict
import calendar
from sqlalchemy import func
from app.database import get_db
from app.models import Course, Batch, Lesson, BatchMember, Indicator, IndicatorMember, Bot, BotMember, Transaction, User
from app.core.deps import get_current_admin

router = APIRouter(prefix="/api/admin/dashboard", tags=["Dashboard"])


def _month_bounds(now: datetime):
    start_this = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_day = calendar.monthrange(start_this.year, start_this.month)[1]
    start_next = start_this.replace(day=1) + timedelta(days=last_day)
    start_prev = (start_this - timedelta(days=1)).replace(day=1)
    return start_this, start_next, start_prev


@router.get("/overview")
def dashboard_overview(db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    now = datetime.now(timezone.utc)
    start_this, start_next, start_prev = _month_bounds(now)

    prev_this = start_prev
    prev_next = start_this

    # New signups
    new_users_this = db.query(func.count(User.id)).filter(
        User.created_at >= start_this, User.created_at < start_next
    ).scalar() or 0
    new_users_prev = db.query(func.count(User.id)).filter(
        User.created_at >= prev_this, User.created_at < prev_next
    ).scalar() or 0

    # Transactions
    transactions_this = db.query(func.count(Transaction.id)).filter(
        Transaction.created_at >= start_this, Transaction.created_at < start_next
    ).scalar() or 0
    transactions_prev = db.query(func.count(Transaction.id)).filter(
        Transaction.created_at >= prev_this, Transaction.created_at < prev_next
    ).scalar() or 0

    # Revenue
    revenue_this = db.query(func.coalesce(func.sum(Transaction.amount), 0.0)).filter(
        Transaction.created_at >= start_this, Transaction.created_at < start_next
    ).scalar() or 0
    revenue_prev = db.query(func.coalesce(func.sum(Transaction.amount), 0.0)).filter(
        Transaction.created_at >= prev_this, Transaction.created_at < prev_next
    ).scalar() or 0

    # Product breakdown this month
    courses_sold_this = db.query(func.count(Transaction.id)).filter(
        Transaction.created_at >= start_this, Transaction.created_at < start_next,
        Transaction.product_section == 'Course'
    ).scalar() or 0
    indicators_sold_this = db.query(func.count(Transaction.id)).filter(
        Transaction.created_at >= start_this, Transaction.created_at < start_next,
        Transaction.product_section == 'Indicator'
    ).scalar() or 0
    bots_sold_this = db.query(func.count(Transaction.id)).filter(
        Transaction.created_at >= start_this, Transaction.created_at < start_next,
        Transaction.product_section == 'Bot'
    ).scalar() or 0

    courses_sold_prev = db.query(func.count(Transaction.id)).filter(
        Transaction.created_at >= prev_this, Transaction.created_at < prev_next,
        Transaction.product_section == 'Course'
    ).scalar() or 0
    indicators_sold_prev = db.query(func.count(Transaction.id)).filter(
        Transaction.created_at >= prev_this, Transaction.created_at < prev_next,
        Transaction.product_section == 'Indicator'
    ).scalar() or 0
    bots_sold_prev = db.query(func.count(Transaction.id)).filter(
        Transaction.created_at >= prev_this, Transaction.created_at < prev_next,
        Transaction.product_section == 'Bot'
    ).scalar() or 0

    # Total counts
    total_courses = db.query(func.count(Course.id)).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0

    # Participated users (users with at least one purchase)
    participated_this = db.query(func.count(func.distinct(Transaction.username))).filter(
        Transaction.created_at >= start_this, Transaction.created_at < start_next,
        Transaction.amount > 0
    ).scalar() or 0
    participated_prev = db.query(func.count(func.distinct(Transaction.username))).filter(
        Transaction.created_at >= prev_this, Transaction.created_at < prev_next,
        Transaction.amount > 0
    ).scalar() or 0

    # Month labels
    month_label = calendar.month_name[start_this.month]
    prev_month_label = calendar.month_name[start_prev.month]

    return {
        "total_courses": total_courses,
        "total_users": total_users,
        "total_transactions": transactions_this,
        "new_users_this_month": new_users_this,
        "transactions_this_month": transactions_this,
        "revenue_this_month": revenue_this,
        "new_signups": {"this_month": new_users_this, "prev_month": new_users_prev},
        "active_users": {"this_month": total_users, "prev_month": total_users},
        "products_sold": {
            "this_month": transactions_this,
            "prev_month": transactions_prev,
            "breakdown_this_month": {"courses": courses_sold_this, "indicators": indicators_sold_this, "bots": bots_sold_this},
            "breakdown_prev_month": {"courses": courses_sold_prev, "indicators": indicators_sold_prev, "bots": bots_sold_prev},
        },
        "participated_users": {
            "this_month": participated_this,
            "prev_month": participated_prev,
            "breakdown": [],
        },
        "month_label": month_label,
        "prev_month_label": prev_month_label,
    }


@router.get("/enrolling-courses")
def enrolling_courses(db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    batches = db.query(Batch).filter(
        Batch.scheduled_at.isnot(None),
        Batch.scheduled_at > now,
        Batch.status != "completed",
    ).order_by(Batch.scheduled_at.asc()).all()
    result = []
    for b in batches:
        c = db.query(Course).filter(Course.course_id == b.course_id).first()
        if c:
            result.append({
                "id": c.id,
                "course_id": c.course_id,
                "batch_id": b.batch_id,
                "title": c.title,
                "participants": b.purchased_count or 0,
                "price": c.price or 0,
                "scheduled_at": b.scheduled_at.isoformat() if b.scheduled_at else None,
            })
    return {"courses": result}


@router.get("/upcoming-sessions")
def upcoming_sessions(db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    ongoing_batches = db.query(Batch).filter(
        Batch.scheduled_at.isnot(None),
        Batch.scheduled_at <= now,
        Batch.status != "completed",
    ).order_by(Batch.scheduled_at.desc()).all()
    result = []
    for b in ongoing_batches:
        c = db.query(Course).filter(Course.course_id == b.course_id).first()
        if not c:
            continue
        lessons = db.query(Lesson).filter(Lesson.batch_id == b.batch_id).order_by(Lesson.added_at.asc()).all()
        for lesson in lessons:
            if lesson.type == "youtube":
                session_time = lesson.added_at
            else:
                session_time = lesson.start_time or b.scheduled_at
            result.append({
                "course_id": c.course_id,
                "batch_id": b.batch_id,
                "course_title": c.title,
                "lesson_title": lesson.title,
                "lesson_type": lesson.type,
                "link": lesson.link,
                "scheduled_at": session_time.isoformat() if session_time else None,
            })
    return {"sessions": result}


@router.get("/expiring-bot-members")
def expiring_bot_members(
    days: int = 30,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    cutoff = now + timedelta(days=days)
    members = db.query(BotMember).filter(
        BotMember.expiry.isnot(None),
        BotMember.expiry <= cutoff,
    ).all()
    result = []
    for m in members:
        result.append({
            "username": m.username,
            "bot_id": m.bot_id,
            "expiry": m.expiry.isoformat() if m.expiry else None,
        })
    return result


@router.get("/client-stats")
def client_stats(db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    total_users = db.query(func.count(User.id)).scalar() or 0

    course_members = db.query(func.count(BatchMember.id)).scalar() or 0
    indicator_members = db.query(func.count(IndicatorMember.id)).scalar() or 0
    bot_members_count = db.query(func.count(BotMember.id)).scalar() or 0
    total_members = course_members + indicator_members + bot_members_count

    paid = db.query(func.count(Transaction.id)).filter(
        Transaction.status == "completed",
        Transaction.amount > 0,
    ).scalar() or 0

    free = total_members - paid

    return {
        "total_clients": total_users,
        "total_enrolments": total_members,
        "paid_access": paid,
        "free_access": max(free, 0),
    }
