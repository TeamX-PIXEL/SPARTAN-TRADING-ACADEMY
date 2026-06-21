from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from typing import Dict
import calendar
from sqlalchemy import func
from app.database import get_db
from app.models import Course, Lesson, CourseMember, Indicator, IndicatorMember, Bot, BotMember, Transaction, User
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

    total_courses = db.query(func.count(Course.id)).scalar()
    total_users = db.query(func.count(User.id)).scalar()
    total_transactions = db.query(func.count(Transaction.id)).scalar()

    new_users_this = db.query(func.count(User.id)).filter(
        User.created_at >= start_this, User.created_at < start_next
    ).scalar()

    transactions_this = db.query(func.count(Transaction.id)).filter(
        Transaction.created_at >= start_this, Transaction.created_at < start_next
    ).scalar()

    revenue_this = db.query(func.coalesce(func.sum(Transaction.amount), 0.0)).filter(
        Transaction.created_at >= start_this, Transaction.created_at < start_next
    ).scalar()

    return {
        "total_courses": total_courses,
        "total_users": total_users,
        "total_transactions": total_transactions,
        "new_users_this_month": new_users_this,
        "transactions_this_month": transactions_this,
        "revenue_this_month": revenue_this,
    }
