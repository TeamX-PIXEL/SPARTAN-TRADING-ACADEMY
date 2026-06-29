from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import secrets
import jwt

from app.database import get_db
from app.models import Course, Batch, Lesson, CourseLesson, BatchMember, User, Transaction
from app.schemas import (
    CourseCreate, CourseResponse, CourseUpdate,
    BatchCreate, BatchResponse, BatchUpdate,
    LessonCreate, LessonUpdate, LessonResponse,
    BatchMemberCreate, BatchMemberResponse, BatchMemberUpdate,
    CourseLessonCreate, CourseLessonUpdate, CourseLessonResponse,
)
from app.core.deps import get_current_admin, get_current_user
from app.core.security import SECRET_KEY, ALGORITHM

router = APIRouter(tags=["Courses"])

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def _compute_batch_status(batch) -> str:
    if batch.completed_at:
        return "completed"
    if batch.scheduled_at:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if batch.scheduled_at <= now:
            return "ongoing"
    return "upcoming"


def _get_optional_user(token: str = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return db.query(User).filter(User.id == int(user_id)).first()
    except Exception:
        return None


def _generate_batch_id(course_id: str, db: Session) -> str:
    existing = db.query(Batch).filter(Batch.course_id == course_id).count()
    return f"{course_id}-B{existing + 1}"


def _batch_to_dict(batch, db: Session) -> dict:
    lesson_count = db.query(Lesson).filter(Lesson.batch_id == batch.batch_id).count()
    course = db.query(Course).filter(Course.course_id == batch.course_id).first()
    return {
        "id": batch.id,
        "batch_id": batch.batch_id,
        "course_id": batch.course_id,
        "instructor": batch.instructor or "",
        "purchased_count": batch.purchased_count or 0,
        "status": _compute_batch_status(batch),
        "scheduled_at": batch.scheduled_at.isoformat() if batch.scheduled_at else None,
        "completed_at": batch.completed_at.isoformat() if batch.completed_at else None,
        "discord_channel_id": batch.discord_channel_id or (course.discord_channel_id if course else None),
        "discord_renewal_price": batch.discord_renewal_price or (course.discord_renewal_price if course else None),
        "created_at": batch.created_at.isoformat() if batch.created_at else None,
        "lesson_count": lesson_count,
    }


def _course_to_dict(course, db: Session) -> dict:
    lesson_count = db.query(Lesson).join(Batch, Batch.batch_id == Lesson.batch_id).filter(Batch.course_id == course.course_id).count()
    batches = db.query(Batch).filter(Batch.course_id == course.course_id).all()
    purchased_count = sum(b.purchased_count or 0 for b in batches)
    statuses = [_compute_batch_status(b) for b in batches]
    if "ongoing" in statuses:
        course_status = "ongoing"
    elif "completed" in statuses and all(s == "completed" for s in statuses):
        course_status = "completed"
    elif "upcoming" in statuses:
        course_status = "upcoming"
    else:
        course_status = "upcoming"
    latest_batch = max(batches, key=lambda b: b.scheduled_at or datetime.min) if batches else None
    return {
        "id": course.id,
        "course_id": course.course_id,
        "title": course.title,
        "description": course.description or "",
        "long_description": course.long_description or course.description or "",
        "price": course.price or 0,
        "image": course.image,
        "category": course.category or "General",
        "features": course.features,
        "duration_months": course.duration_months or 1,
        "difficulty": course.difficulty or "Beginner",
        "course_thumbnail": course.course_thumbnail,
        "created_at": course.created_at.isoformat() if course.created_at else None,
        "lesson_count": lesson_count,
        "purchased_count": purchased_count,
        "batch_count": len(batches),
        "status": course_status,
        "completed_at": latest_batch.completed_at.isoformat() if latest_batch and latest_batch.completed_at else None,
        "scheduled_at": latest_batch.scheduled_at.isoformat() if latest_batch and latest_batch.scheduled_at else None,
        "lecturer": latest_batch.instructor if latest_batch else "",
        "discord_channel_id": course.discord_channel_id,
        "discord_renewal_price": course.discord_renewal_price,
    }


# ==========================================
# COURSE CRUD
# ==========================================

@router.post("/api/admin/courses")
def create_course(course: CourseCreate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    new_course = Course(**course.model_dump())
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return _course_to_dict(new_course, db)


@router.get("/api/admin/courses")
def get_courses(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    total = db.query(Course).count()
    courses = db.query(Course).order_by(Course.id.desc()).offset(skip).limit(limit).all()
    return {"courses": [_course_to_dict(c, db) for c in courses], "total": total, "skip": skip, "limit": limit}


@router.get("/api/admin/courses/{course_id}")
def get_course(course_id: str, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_course = db.query(Course).filter(Course.course_id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    return _course_to_dict(db_course, db)


@router.put("/api/admin/courses/{course_id}")
def update_course(course_id: str, course_update: CourseUpdate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_course = db.query(Course).filter(Course.course_id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    update_data = course_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_course, key, value)
    db.commit()
    db.refresh(db_course)
    return _course_to_dict(db_course, db)


@router.delete("/api/admin/courses/{course_id}")
def delete_course(course_id: str, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_course = db.query(Course).filter(Course.course_id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    total_members = db.query(BatchMember).join(Batch, Batch.batch_id == BatchMember.batch_id).filter(Batch.course_id == course_id).count()
    if total_members > 0:
        raise HTTPException(status_code=400, detail="Cannot delete course with enrolled members")
    db.delete(db_course)
    db.commit()
    return {"message": "Course deleted", "course_id": course_id}


@router.get("/api/admin/courses/check-id/{course_id}")
def check_course_id(course_id: str, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    exists = db.query(Course).filter(Course.course_id == course_id).first() is not None
    return {"exists": exists}


# ==========================================
# BATCH CRUD
# ==========================================

@router.get("/api/admin/courses/{course_id}/batches")
def get_course_batches(course_id: str, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_course = db.query(Course).filter(Course.course_id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    batches = db.query(Batch).filter(Batch.course_id == course_id).order_by(Batch.id.desc()).all()
    return [_batch_to_dict(b, db) for b in batches]


@router.post("/api/admin/courses/{course_id}/batches")
def create_batch(course_id: str, batch: BatchCreate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_course = db.query(Course).filter(Course.course_id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    batch_id = batch.batch_id.strip().upper() if batch.batch_id and batch.batch_id.strip() else _generate_batch_id(course_id, db)
    existing = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Batch ID '{batch_id}' already exists.")
    new_batch = Batch(batch_id=batch_id, course_id=course_id, **{k: v for k, v in batch.model_dump().items() if k != "batch_id"})
    db.add(new_batch)
    db.flush()

    course_lessons = db.query(CourseLesson).filter(CourseLesson.course_id == course_id).order_by(CourseLesson.id).all()
    for cl in course_lessons:
        lesson = Lesson(
            batch_id=batch_id,
            title=cl.title,
            type="youtube",
            link=cl.link,
            duration=cl.duration,
        )
        db.add(lesson)

    db.commit()
    db.refresh(new_batch)
    return _batch_to_dict(new_batch, db)


@router.get("/api/admin/batches")
def get_all_batches(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    query = db.query(Batch)
    batches = query.order_by(Batch.id.desc()).all()
    result = []
    for b in batches:
        d = _batch_to_dict(b, db)
        if status_filter and d["status"] != status_filter:
            continue
        result.append(d)
    return result


@router.put("/api/admin/batches/{batch_id}")
def update_batch(batch_id: str, batch_update: BatchUpdate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not db_batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    update_data = batch_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_batch, key, value)
    db.commit()
    db.refresh(db_batch)
    return _batch_to_dict(db_batch, db)


@router.delete("/api/admin/batches/{batch_id}")
def delete_batch(batch_id: str, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not db_batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    total_members = db.query(BatchMember).filter(BatchMember.batch_id == batch_id).count()
    if total_members > 0:
        raise HTTPException(status_code=400, detail="Cannot delete batch with enrolled members")
    db.delete(db_batch)
    db.commit()
    return {"message": "Batch deleted", "batch_id": batch_id}


@router.patch("/api/admin/batches/{batch_id}/complete")
def complete_batch(batch_id: str, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not db_batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    db_batch.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(db_batch)
    return _batch_to_dict(db_batch, db)


# ==========================================
# LESSONS (batch-scoped)
# ==========================================

@router.get("/api/admin/batches/{batch_id}/lessons", response_model=List[LessonResponse])
def get_batch_lessons(batch_id: str, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not db_batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return db.query(Lesson).filter(Lesson.batch_id == batch_id).order_by(Lesson.id).all()


@router.post("/api/admin/batches/{batch_id}/lessons", response_model=LessonResponse)
def create_batch_lesson(batch_id: str, lesson: LessonCreate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not db_batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    new_lesson = Lesson(**lesson.model_dump(), batch_id=batch_id)
    db.add(new_lesson)
    db.commit()
    db.refresh(new_lesson)
    return new_lesson


@router.get("/api/admin/courses/{course_id}/lessons", response_model=List[LessonResponse])
def get_course_lessons(course_id: str, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_course = db.query(Course).filter(Course.course_id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    return db.query(Lesson).join(Batch, Batch.batch_id == Lesson.batch_id).filter(Batch.course_id == course_id).order_by(Lesson.id).all()


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
# COURSE MEMBERS (batch-scoped)
# ==========================================

def _build_member_response(member: BatchMember, user: User = None, txn: Transaction = None) -> dict:
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
        "course_id": member.batch.course_id if member.batch else None,
        "batch_id": member.batch_id,
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
    members = db.query(BatchMember).join(Batch, Batch.batch_id == BatchMember.batch_id).filter(Batch.course_id == course_id).all()
    result = []
    for m in members:
        user = db.query(User).filter(User.UserID == m.username).first()
        txn = db.query(Transaction).filter(
            Transaction.username == m.username,
            Transaction.batch_id == m.batch_id,
            Transaction.product_section == "Course",
        ).order_by(Transaction.created_at.desc()).first()
        result.append(_build_member_response(m, user, txn))
    return result


@router.get("/api/admin/batches/{batch_id}/members")
def get_batch_members(batch_id: str, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not db_batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    members = db.query(BatchMember).filter(BatchMember.batch_id == batch_id).all()
    result = []
    for m in members:
        user = db.query(User).filter(User.UserID == m.username).first()
        txn = db.query(Transaction).filter(
            Transaction.username == m.username,
            Transaction.batch_id == batch_id,
            Transaction.product_section == "Course",
        ).order_by(Transaction.created_at.desc()).first()
        result.append(_build_member_response(m, user, txn))
    return result


@router.post("/api/admin/courses/{course_id}/members", response_model=BatchMemberResponse)
def create_course_member(course_id: str, payload: BatchMemberCreate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_course = db.query(Course).filter(Course.course_id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    user = db.query(User).filter(User.UserID == payload.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    default_batch = db.query(Batch).filter(Batch.course_id == course_id).order_by(Batch.id.desc()).first()
    batch_id = default_batch.batch_id if default_batch else None

    existing = db.query(BatchMember).filter(
        BatchMember.username == payload.username,
        BatchMember.batch_id == batch_id,
    ).first()

    txn = None
    if existing:
        existing.expiry = payload.expiry or existing.expiry
        db.commit()
        db.refresh(existing)
        member = existing
        txn = db.query(Transaction).filter(
            Transaction.username == payload.username,
            Transaction.batch_id == batch_id,
            Transaction.product_section == "Course",
        ).order_by(Transaction.created_at.desc()).first()
    else:
        member = BatchMember(
            username=payload.username,
            batch_id=batch_id,
            expiry=payload.expiry,
        )
        db.add(member)
        db.commit()
        db.refresh(member)

        if default_batch:
            default_batch.purchased_count = (default_batch.purchased_count or 0) + 1
            db.add(default_batch)

        txn = Transaction(
            username=payload.username,
            product_section="Course",
            batch_id=batch_id,
            expiry=payload.expiry,
            amount=payload.amount,
            method=payload.method or "Free",
            status="completed",
            address=user.address if user else None,
            country=user.country if user else None,
            pincode=user.pincode if user else None,
        )
        db.add(txn)
        db.commit()

    return _build_member_response(member, user, txn)


@router.patch("/api/admin/courses/members/{member_id}", response_model=BatchMemberResponse)
def update_course_member(member_id: int, payload: BatchMemberUpdate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    member = db.query(BatchMember).filter(BatchMember.id == member_id).first()
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
    now = datetime.now()
    five_min_from_now = now + timedelta(minutes=5)

    upcoming_batches = db.query(Batch).filter(
        Batch.scheduled_at > five_min_from_now,
        Batch.status != "completed",
    ).order_by(Batch.scheduled_at.asc())

    total = upcoming_batches.count()
    batches = upcoming_batches.offset(skip).limit(limit).all()

    items = []
    seen_courses = set()
    for b in batches:
        if b.course_id in seen_courses:
            continue
        seen_courses.add(b.course_id)
        c = db.query(Course).filter(Course.course_id == b.course_id).first()
        if not c:
            continue
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
            "lecturer": b.instructor or "",
            "difficulty": c.difficulty,
            "scheduled_at": b.scheduled_at.isoformat() if b.scheduled_at else None,
            "estimated_duration": None,
            "course_thumbnail": c.course_thumbnail,
            "discord_channel_id": b.discord_channel_id or c.discord_channel_id,
            "discord_renewal_price": b.discord_renewal_price or c.discord_renewal_price,
        })

    return {"courses": items, "total": len(items), "skip": skip, "limit": limit}


@router.get("/public/courses/{course_id}")
def get_public_course(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(_get_optional_user),
):
    c = db.query(Course).filter(Course.course_id == course_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")

    batch = db.query(Batch).filter(Batch.course_id == course_id).order_by(Batch.id.desc()).first()

    is_purchased = False
    if current_user:
        is_purchased = db.query(BatchMember).join(Batch, Batch.batch_id == BatchMember.batch_id).filter(
            BatchMember.username == current_user.UserID,
            Batch.course_id == course_id,
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
        "lecturer": batch.instructor if batch else "",
        "difficulty": c.difficulty,
        "scheduled_at": batch.scheduled_at.isoformat() if batch and batch.scheduled_at else None,
        "estimated_duration": None,
        "course_thumbnail": c.course_thumbnail,
        "is_purchased": is_purchased,
        "discord_channel_id": (batch.discord_channel_id if batch else None) or c.discord_channel_id,
        "discord_renewal_price": (batch.discord_renewal_price if batch else None) or c.discord_renewal_price,
    }


# ==========================================
# USER-FACING: MY LESSONS
# ==========================================

@router.get("/my-lessons")
def get_my_lessons(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enrolled = db.query(BatchMember).filter(
        BatchMember.username == current_user.UserID,
    ).all()

    if not enrolled:
        return []

    batch_ids = [e.batch_id for e in enrolled if e.batch_id]

    lessons = db.query(Lesson).filter(
        Lesson.batch_id.in_(batch_ids)
    ).order_by(Lesson.added_at.desc()).all()

    lesson_batch_ids = list({l.batch_id for l in lessons if l.batch_id})
    batches = db.query(Batch).filter(Batch.batch_id.in_(lesson_batch_ids)).all() if lesson_batch_ids else []
    batch_to_course = {b.batch_id: b.course_id for b in batches}

    results = []
    for l in lessons:
        results.append({
            "id": str(l.id),
            "batch_id": l.batch_id,
            "title": l.title,
            "type": l.type,
            "link": l.link,
            "addedAt": l.added_at.isoformat() if l.added_at else None,
            "duration": l.duration,
            "startTime": l.start_time.isoformat() if l.start_time else None,
        })

    return results


# ==========================================
# COURSE LESSONS (pre-launch YouTube only)
# ==========================================

@router.get("/api/admin/courses/{course_id}/course-lessons", response_model=List[CourseLessonResponse])
def get_course_lessons(course_id: str, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_course = db.query(Course).filter(Course.course_id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    lessons = db.query(CourseLesson).filter(CourseLesson.course_id == course_id).order_by(CourseLesson.added_at.asc()).all()
    return lessons


@router.post("/api/admin/courses/{course_id}/course-lessons", response_model=CourseLessonResponse)
def create_course_lesson(course_id: str, lesson: CourseLessonCreate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_course = db.query(Course).filter(Course.course_id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    new_lesson = CourseLesson(course_id=course_id, **lesson.model_dump())
    db.add(new_lesson)
    db.commit()
    db.refresh(new_lesson)
    return new_lesson


@router.put("/api/admin/course-lessons/{lesson_id}", response_model=CourseLessonResponse)
def update_course_lesson(lesson_id: int, lesson_update: CourseLessonUpdate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not db_lesson:
        raise HTTPException(status_code=404, detail="Course lesson not found")
    update_data = lesson_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_lesson, key, value)
    db.commit()
    db.refresh(db_lesson)
    return db_lesson


@router.delete("/api/admin/course-lessons/{lesson_id}")
def delete_course_lesson(lesson_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not db_lesson:
        raise HTTPException(status_code=404, detail="Course lesson not found")
    db.delete(db_lesson)
    db.commit()
    return {"message": "Course lesson deleted", "id": lesson_id}
