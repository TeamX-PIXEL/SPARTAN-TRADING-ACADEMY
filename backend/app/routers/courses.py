from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
import jwt

from app.database import get_db
from app.models import Course, Lesson, CourseMember, User, Transaction
from app.schemas import (
    CourseCreate, CourseResponse, CourseUpdate, PaginatedCoursesResponse,
    LessonCreate, LessonUpdate, LessonResponse,
    CourseMemberCreate, CourseMemberResponse, CourseMemberUpdate,
)
from app.core.deps import get_current_admin, get_current_user
from app.core.security import SECRET_KEY, ALGORITHM

router = APIRouter(tags=["Courses"])

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def _get_optional_user(token: str = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return db.query(User).filter(User.id == int(user_id)).first()
    except Exception:
        return None


@router.post("/api/admin/courses", response_model=CourseResponse)
def create_course(course: CourseCreate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    new_course = Course(**course.model_dump())
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return new_course


@router.get("/api/admin/courses", response_model=PaginatedCoursesResponse)
def get_courses(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    total = db.query(Course).count()
    courses = db.query(Course).offset(skip).limit(limit).all()
    return {"courses": courses, "total": total, "skip": skip, "limit": limit}


@router.get("/api/admin/courses/{course_id}", response_model=CourseResponse)
def get_course(course_id: str, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_course = db.query(Course).filter(Course.course_id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    return db_course


@router.put("/api/admin/courses/{course_id}", response_model=CourseResponse)
def update_course(course_id: str, course_update: CourseUpdate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_course = db.query(Course).filter(Course.course_id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    update_data = course_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_course, key, value)

    db.commit()
    db.refresh(db_course)
    return db_course


@router.delete("/api/admin/courses/{course_id}")
def delete_course(course_id: str, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_course = db.query(Course).filter(Course.course_id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    if db_course.purchased_count and db_course.purchased_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete course with enrolled members")

    db.delete(db_course)
    db.commit()

    return {"message": "Course deleted", "course_id": course_id}


@router.get("/api/admin/courses/check-id/{course_id}")
def check_course_id(course_id: str, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    exists = db.query(Course).filter(Course.course_id == course_id).first() is not None
    return {"exists": exists}


@router.get("/api/admin/courses/{course_id}/lessons", response_model=List[LessonResponse])
def get_course_lessons(course_id: str, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_course = db.query(Course).filter(Course.course_id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    return db.query(Lesson).filter(Lesson.course_id == db_course.id).order_by(Lesson.id).all()


@router.post("/api/admin/courses/{course_id}/lessons", response_model=LessonResponse)
def create_lesson(course_id: str, lesson: LessonCreate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_course = db.query(Course).filter(Course.course_id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    new_lesson = Lesson(**lesson.model_dump(), course_id=db_course.id)
    db.add(new_lesson)
    db.commit()
    db.refresh(new_lesson)
    return new_lesson


@router.put("/api/admin/lessons/{lesson_id}", response_model=LessonResponse)
def update_lesson(lesson_id: int, lesson_update: LessonUpdate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not db_lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    update_data = lesson_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_lesson, key, value)

    db.commit()
    db.refresh(db_lesson)
    return db_lesson


@router.delete("/api/admin/lessons/{lesson_id}")
def delete_lesson(lesson_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not db_lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    db.delete(db_lesson)
    db.commit()
    return {"message": "Lesson deleted"}


# ==========================================
# COURSE MEMBERS
# ==========================================

def _build_member_response(member: CourseMember, user: User = None, txn: Transaction = None) -> dict:
    """Build member response with user lookup data."""
    name = ""
    email = ""
    firstname = ""
    lastname = ""
    discord_user_id = None
    access_type = "free"

    if user:
        firstname = user.firstname or ""
        lastname = user.lastname or ""
        name = f"{firstname} {lastname}".strip() or user.UserID or ""
        email = user.email or ""
        discord_user_id = user.discord_user_id

    if txn and (txn.amount or 0) > 0:
        access_type = "paid"

    return {
        "id": member.id,
        "username": member.username,
        "course_id": member.course_id,
        "expiry": member.expiry.isoformat() if member.expiry else None,
        "joined_at": member.joined_at.isoformat() if member.joined_at else None,
        "name": name,
        "email": email,
        "firstname": firstname,
        "lastname": lastname,
        "discord_user_id": discord_user_id,
        "access_type": access_type,
    }


@router.get("/api/admin/courses/{course_id}/members")
def get_course_members(course_id: str, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_course = db.query(Course).filter(Course.course_id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    members = db.query(CourseMember).filter(CourseMember.course_id == course_id).all()

    result = []
    for m in members:
        user = db.query(User).filter(User.UserID == m.username).first()
        txn = db.query(Transaction).filter(
            Transaction.username == m.username,
            Transaction.course_id == course_id,
            Transaction.product_section == "Course",
        ).order_by(Transaction.created_at.desc()).first()
        result.append(_build_member_response(m, user, txn))

    return result


@router.post("/api/admin/courses/{course_id}/members", response_model=CourseMemberResponse)
def create_course_member(course_id: str, payload: CourseMemberCreate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_course = db.query(Course).filter(Course.course_id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    user = db.query(User).filter(User.UserID == payload.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(CourseMember).filter(
        CourseMember.username == payload.username,
        CourseMember.course_id == course_id,
    ).first()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    txn = None

    if existing:
        existing.expiry = payload.expiry or existing.expiry
        db.commit()
        db.refresh(existing)
        member = existing
        txn = db.query(Transaction).filter(
            Transaction.username == payload.username,
            Transaction.course_id == course_id,
            Transaction.product_section == "Course",
        ).order_by(Transaction.created_at.desc()).first()
    else:
        member = CourseMember(
            username=payload.username,
            course_id=course_id,
            expiry=payload.expiry,
        )
        db.add(member)
        db.commit()
        db.refresh(member)

        db_course.purchased_count = (db_course.purchased_count or 0) + 1
        db.add(db_course)

        txn = Transaction(
            username=payload.username,
            product_section="Course",
            course_id=course_id,
            expiry=payload.expiry,
            amount=payload.amount,
            method=payload.method or "Free",
            status="completed",
        )
        db.add(txn)
        db.commit()

    return _build_member_response(member, user, txn)


@router.patch("/api/admin/courses/members/{member_id}", response_model=CourseMemberResponse)
def update_course_member(member_id: int, payload: CourseMemberUpdate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    member = db.query(CourseMember).filter(CourseMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if payload.expiry is not None:
        member.expiry = payload.expiry

    db.commit()
    db.refresh(member)

    user = db.query(User).filter(User.UserID == member.username).first()
    return _build_member_response(member, user)


# ==========================================
# PUBLIC / CLIENT ENDPOINTS
# ==========================================
@router.get("/public/courses")
def get_public_courses(
    skip: int = Query(0, ge=0),
    limit: int = Query(8, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(_get_optional_user),
):
    """Returns courses visible to public."""
    total = db.query(Course).count()
    courses = db.query(Course).offset(skip).limit(limit).all()

    items = []
    for c in courses:
        items.append({
            "id": c.course_id,
            "course_id": c.course_id,
            "title": c.title,
            "description": c.description,
            "longDescription": c.long_description or c.description,
            "price": c.price,
            "image": c.course_thumbnail or c.image,
            "category": c.category,
            "features": c.features or [],
            "duration": f"{c.duration_months} Month{'s' if c.duration_months != 1 else ''}",
            "lecturer": c.lecturer,
            "difficulty": c.difficulty,
            "scheduled_at": c.scheduled_at.isoformat() if c.scheduled_at else None,
            "estimated_duration": None,
            "course_thumbnail": c.course_thumbnail,
        })

    return {"courses": items, "total": total, "skip": skip, "limit": limit}


@router.get("/public/courses/{course_id}")
def get_public_course(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(_get_optional_user),
):
    """Returns a single course for public view."""
    c = db.query(Course).filter(Course.course_id == course_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")

    is_purchased = False
    if current_user:
        is_purchased = db.query(CourseMember).filter(
            CourseMember.username == current_user.UserID,
            CourseMember.course_id == course_id,
        ).first() is not None

    return {
        "id": c.course_id,
        "course_id": c.course_id,
        "title": c.title,
        "description": c.description,
        "longDescription": c.long_description or c.description,
        "price": c.price,
        "image": c.course_thumbnail or c.image,
        "category": c.category,
        "features": c.features or [],
        "duration": f"{c.duration_months} Month{'s' if c.duration_months != 1 else ''}",
        "lecturer": c.lecturer,
        "difficulty": c.difficulty,
        "scheduled_at": c.scheduled_at.isoformat() if c.scheduled_at else None,
        "estimated_duration": None,
        "course_thumbnail": c.course_thumbnail,
        "is_purchased": is_purchased,
    }


# ==========================================
# USER-FACING: MY LESSONS
# ==========================================
@router.get("/my-lessons")
def get_my_lessons(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns lessons for courses the current user is enrolled in."""
    enrolled = db.query(CourseMember).filter(
        CourseMember.username == current_user.UserID,
    ).all()

    if not enrolled:
        return []

    course_id_strings = [e.course_id for e in enrolled]

    courses = db.query(Course).filter(Course.course_id.in_(course_id_strings)).all()
    course_int_ids = {c.course_id: c.id for c in courses}

    lessons = db.query(Lesson).filter(
        Lesson.course_id.in_(course_int_ids.values())
    ).order_by(Lesson.added_at.desc()).all()

    int_to_str = {v: k for k, v in course_int_ids.items()}

    results = []
    for l in lessons:
        str_course_id = int_to_str.get(l.course_id)
        results.append({
            "id": str(l.id),
            "course_id": str_course_id,
            "title": l.title,
            "type": l.type,
            "link": l.link,
            "addedAt": l.added_at.isoformat() if l.added_at else None,
            "duration": l.duration,
            "startTime": l.start_time.isoformat() if l.start_time else None,
        })

    return results
