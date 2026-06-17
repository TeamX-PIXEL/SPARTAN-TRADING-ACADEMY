from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional, Union
from datetime import datetime
from pydantic import BaseModel
from app.database import get_db
from app.models import Course, Indicator, Bot, CourseSchedule
from app.core.deps import get_current_user

router = APIRouter(tags=["Search"])


class SearchResult(BaseModel):
    id: Union[int, str]
    section: str
    title: str
    description: Optional[str] = None
    price: float
    thumbnail: Optional[str] = None
    scheduled_at: Optional[str] = None
    estimated_duration: Optional[str] = None
    course_link: Optional[str] = None


@router.get("/search", response_model=List[SearchResult])
def search_all(q: str = "", db: Session = Depends(get_db)):
    """Unified search across courses, indicators, and bots."""
    if not q or not q.strip():
        return []

    search_term = f"%{q.strip()}%"
    results = []
    seen_ids = set()

    courses = db.query(Course).filter(
        or_(
            Course.title.ilike(search_term),
            Course.description.ilike(search_term)
        )
    ).all()

    for c in courses:
        key = f"course_{c.id}"
        if key not in seen_ids:
            seen_ids.add(key)
            now = datetime.now()
            next_schedule = db.query(CourseSchedule).filter(
                CourseSchedule.course_id == c.id,
                CourseSchedule.scheduled_at > now
            ).order_by(CourseSchedule.scheduled_at.asc()).first()

            results.append({
                "id": c.id,
                "section": "course",
                "title": c.title,
                "description": c.description,
                "price": c.price,
                "thumbnail": c.course_thumbnail,
                "scheduled_at": next_schedule.scheduled_at.isoformat() if next_schedule and next_schedule.scheduled_at else None,
                "estimated_duration": next_schedule.estimated_duration if next_schedule else None,
                "course_link": next_schedule.join_link if next_schedule else None,
            })

    indicators = db.query(Indicator).filter(
        or_(
            Indicator.indicator_name.ilike(search_term),
            Indicator.indicator_description.ilike(search_term)
        )
    ).all()

    for ind in indicators:
        key = f"indicator_{ind.id}"
        if key not in seen_ids:
            seen_ids.add(key)
            results.append({
                "id": ind.product_uuid,
                "section": "indicator",
                "title": ind.indicator_name,
                "description": ind.indicator_description,
                "price": ind.indicator_price,
                "thumbnail": ind.showcase_image,
            })

    bots = db.query(Bot).filter(
        or_(
            Bot.display_name.ilike(search_term),
            Bot.description.ilike(search_term)
        )
    ).all()

    for b in bots:
        key = f"bot_{b.id}"
        if key not in seen_ids:
            seen_ids.add(key)
            results.append({
                "id": b.product_uuid,
                "section": "bot",
                "title": b.display_name,
                "description": b.description,
                "price": b.price,
                "thumbnail": b.thumbnail,
            })

    return results
