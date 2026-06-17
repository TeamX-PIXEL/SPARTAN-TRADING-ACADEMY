from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from typing import List, Optional
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import jwt

from app.database import get_db
from app.models import Course, CourseChapter, CourseSchedule, CourseWaitlist, CourseProgress, BatchTemplate, BatchList, User, Purchase
from app.schemas import (
    CourseCreate, CourseResponse, CourseUpdate, PaginatedCoursesResponse, PublicCourseResponse,
    CourseChapterCreate, CourseChapterUpdate, CourseChapterResponse,
    BatchTemplateCreate, BatchTemplateUpdate, BatchTemplateResponse,
    BatchListBase, BatchListUpdate, ManualBatchCreate, BatchListResponse,
    CourseScheduleCreate, CourseScheduleUpdate, CourseScheduleResponse,
    BatchParticipantResponse, AddParticipantRequest,
)
from app.core.deps import get_current_user, get_current_admin
from app.core.security import SECRET_KEY, ALGORITHM

router = APIRouter(tags=["Courses"])

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_optional_user(token: str = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user
    except Exception:
        return None


def calculate_next_start_date(last_batch: BatchList = None, now: datetime = None):
    """Calculates the 1st of the month AFTER the previous batch finishes."""
    if last_batch:
        finish_date = last_batch.batch_start_date + timedelta(days=last_batch.max_days)
        next_month = finish_date + relativedelta(months=1, day=1)
        return next_month
    else:
        return now + relativedelta(months=1, day=1)


def _build_public_course_response(db: Session, c: Course, current_user: Optional[User]):
    purchase = None
    is_purchased = False
    if current_user:
        purchase = db.query(Purchase).filter(
            Purchase.user_id == current_user.id,
            Purchase.product_section == 1,
            Purchase.product_id == c.id
        ).first()
        is_purchased = purchase is not None

    batch_list_id = None
    is_assigned = False
    if is_purchased:
        waitlist = db.query(CourseWaitlist).filter(
            CourseWaitlist.user_id == current_user.id,
            CourseWaitlist.course_id == c.id
        ).first()
        if waitlist:
            batch = db.query(BatchList).filter(
                BatchList.course_id == c.id,
                BatchList.assigned_to == waitlist.waitlist_batch_id
            ).first()
            if batch:
                is_assigned = True
                batch_list_id = batch.id

    item = {
        "id": c.product_uuid,
        "product_uuid": c.product_uuid,
        "title": c.title,
        "description": c.description,
        "price": c.price,
        "course_thumbnail": c.course_thumbnail,
        "is_purchased": is_purchased,
        "is_assigned": is_assigned,
    }

    if is_purchased:
        now = datetime.now()

        next_schedule = None
        prev_schedule = None

        if is_assigned and batch_list_id:
            next_schedule = db.query(CourseSchedule).filter(
                CourseSchedule.course_id == c.id,
                CourseSchedule.batch_list_id == batch_list_id,
                CourseSchedule.scheduled_at > now
            ).order_by(CourseSchedule.scheduled_at.asc()).first()

            prev_schedule = db.query(CourseSchedule).filter(
                CourseSchedule.course_id == c.id,
                CourseSchedule.batch_list_id == batch_list_id,
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
                except:
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

        if is_assigned and active_schedule:
            item["scheduled_at"] = active_schedule.scheduled_at.isoformat() if active_schedule.scheduled_at else None
            item["estimated_duration"] = active_schedule.estimated_duration
            item["course_link"] = active_schedule.join_link
            item["next_chapter_title"] = schedule_chapter_title
            item["next_chapter_index"] = schedule_chapter_index
            item["is_ongoing"] = is_ongoing

    return item


@router.post("/api/admin/courses", response_model=CourseResponse)
def create_course(course: CourseCreate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    new_course = Course(**course.model_dump())
    db.add(new_course)
    db.commit()
    db.refresh(new_course)

    default_template = BatchTemplate(
        course_id=new_course.id,
        min_enroll=10,
        no_of_days=30,
        automated_batch_creation=True
    )
    db.add(default_template)
    db.commit()

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


@router.get("/public/courses", response_model=List[PublicCourseResponse], response_model_exclude_none=True)
def get_public_courses(
    skip: int = 0,
    limit: int = 8,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    courses = db.query(Course).offset(skip).limit(limit).all()
    return [_build_public_course_response(db, c, current_user) for c in courses]


@router.get("/public/courses/{product_uuid}", response_model=PublicCourseResponse, response_model_exclude_none=True)
def get_public_course(
    product_uuid: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    c = db.query(Course).filter(Course.product_uuid == product_uuid).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return _build_public_course_response(db, c, current_user)


@router.put("/api/admin/courses/{course_id}", response_model=CourseResponse)
def update_course(course_id: int, course_update: CourseUpdate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_course = db.query(Course).filter(Course.id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    update_data = course_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_course, key, value)

    db.commit()
    db.refresh(db_course)
    return db_course


@router.delete("/api/admin/courses/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_course = db.query(Course).filter(Course.id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    db.query(CourseWaitlist).filter(CourseWaitlist.course_id == course_id).delete()
    db.query(CourseProgress).filter(CourseProgress.course_id == course_id).delete()
    db.query(CourseSchedule).filter(CourseSchedule.course_id == course_id).delete()

    db.delete(db_course)
    db.commit()

    return {"message": "Course deleted", "id": course_id}


@router.get("/api/admin/courses/check-id/{course_id}")
def check_course_id(course_id: str, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    exists = db.query(Course).filter(Course.course_id == course_id).first() is not None
    return {"exists": exists}


@router.get("/api/admin/courses/{course_id}/chapters", response_model=List[CourseChapterResponse])
def get_course_chapters(course_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    return db.query(CourseChapter).filter(CourseChapter.course_id == course_id).order_by(CourseChapter.chapter_index).all()


@router.post("/api/admin/courses/{course_id}/chapters", response_model=CourseChapterResponse)
def create_chapter(course_id: int, chapter: CourseChapterCreate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    if chapter.chapter_index == 0:
        count = db.query(CourseChapter).filter(CourseChapter.course_id == course_id).count()
        chapter.chapter_index = count + 1

    new_chapter = CourseChapter(**chapter.model_dump(), course_id=course_id)
    db.add(new_chapter)
    db.commit()
    db.refresh(new_chapter)
    return new_chapter


@router.put("/chapters/{chapter_id}", response_model=CourseChapterResponse)
def update_chapter(chapter_id: int, chapter_update: CourseChapterUpdate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_chapter = db.query(CourseChapter).filter(CourseChapter.id == chapter_id).first()
    if not db_chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    update_data = chapter_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_chapter, key, value)

    db.commit()
    db.refresh(db_chapter)
    return db_chapter


@router.delete("/chapters/{chapter_id}")
def delete_chapter(chapter_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_chapter = db.query(CourseChapter).filter(CourseChapter.id == chapter_id).first()
    if not db_chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    db.delete(db_chapter)
    db.commit()
    return {"message": "Chapter deleted"}


@router.get("/api/admin/courses/{course_id}/batches", response_model=List[BatchListResponse])
def get_course_batches(course_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    batches = db.query(BatchList).filter(BatchList.course_id == course_id).all()
    total_chapters = db.query(func.count(CourseChapter.id)).filter(
        CourseChapter.course_id == course_id
    ).scalar()

    batch_ids = [b.id for b in batches]
    scheduled_map = {}
    if batch_ids:
        rows = db.query(
            CourseSchedule.batch_list_id,
            func.count(distinct(CourseSchedule.chapter_id)).label("scheduled")
        ).filter(
            CourseSchedule.batch_list_id.in_(batch_ids),
            CourseSchedule.chapter_id.isnot(None)
        ).group_by(CourseSchedule.batch_list_id).all()
        scheduled_map = {row.batch_list_id: row.scheduled for row in rows}

    result = []
    for batch in batches:
        count = db.query(CourseWaitlist).filter(
            CourseWaitlist.course_id == course_id,
            CourseWaitlist.waitlist_batch_id == batch.assigned_to
        ).count()
        result.append({
            "id": batch.id,
            "course_id": batch.course_id,
            "min_enroll": batch.min_enroll,
            "batch_start_date": batch.batch_start_date,
            "max_days": batch.max_days,
            "assigned_to": batch.assigned_to,
            "status": batch.status,
            "created_at": batch.created_at,
            "no_participants": count,
            "progress": {
                "scheduled": scheduled_map.get(batch.id, 0),
                "total": total_chapters or 0,
            },
        })
    return result


@router.post("/api/admin/courses/{course_id}/batches", response_model=BatchListResponse)
def create_manual_batch(course_id: int, batch_data: ManualBatchCreate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    template = db.query(BatchTemplate).filter(BatchTemplate.course_id == course_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Batch template missing.")

    check_id = template.current_batch if template.current_batch else 1

    existing_batch = db.query(BatchList).filter(
        BatchList.course_id == course_id,
        BatchList.assigned_to == check_id
    ).first()

    if existing_batch:
        existing_batch.status = "scheduled"

        new_assigned_id = (template.latest_batch if template.latest_batch else 0) + 1

        template.current_batch = new_assigned_id
        template.latest_batch = new_assigned_id

        assigned_id = new_assigned_id
    else:
        assigned_id = check_id

        template.current_batch = assigned_id
        template.latest_batch = assigned_id

    new_batch = BatchList(
        course_id=course_id,
        min_enroll=template.min_enroll,
        batch_start_date=batch_data.start_date,
        max_days=batch_data.max_days,
        assigned_to=assigned_id,
        status="enrolling"
    )
    db.add(new_batch)

    db.commit()
    db.refresh(new_batch)

    return new_batch


@router.put("/batches/{batch_id}", response_model=BatchListResponse)
def update_batch(batch_id: int, batch_update: BatchListUpdate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_batch = db.query(BatchList).filter(BatchList.id == batch_id).first()
    if not db_batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    template = db.query(BatchTemplate).filter(BatchTemplate.course_id == db_batch.course_id).first()

    if batch_update.status == "enrolling" and db_batch.status != "enrolling":
        if template and template.current_batch:
            currently_enrolling_batch = db.query(BatchList).filter(
                BatchList.course_id == db_batch.course_id,
                BatchList.assigned_to == template.current_batch
            ).first()

            if currently_enrolling_batch:
                currently_enrolling_batch.status = "scheduled"

            template.current_batch = db_batch.assigned_to
            db.add(template)

    elif batch_update.status == "scheduled" and db_batch.status == "enrolling":
        if template:
            next_batch_exists = db.query(BatchList).filter(
                BatchList.course_id == db_batch.course_id,
                BatchList.assigned_to == template.latest_batch
            ).first()

            if next_batch_exists:
                new_latest_id = template.latest_batch + 1
                template.latest_batch = new_latest_id
                template.current_batch = new_latest_id
            else:
                template.current_batch = template.latest_batch

            db.add(template)

    update_data = batch_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_batch, key, value)

    db.commit()
    db.refresh(db_batch)
    return db_batch


@router.delete("/batches/{batch_id}")
def delete_batch(batch_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_batch = db.query(BatchList).filter(BatchList.id == batch_id).first()
    if not db_batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    template = db.query(BatchTemplate).filter(BatchTemplate.course_id == db_batch.course_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="Batch template not found for this course")

    latest_batch = template.latest_batch
    current_batch = template.current_batch

    is_latest = db_batch.assigned_to == template.latest_batch
    is_current = db_batch.assigned_to == template.current_batch

    if is_latest:
        lower_batch = db.query(BatchList).filter(
            BatchList.course_id == db_batch.course_id,
            BatchList.assigned_to < db_batch.assigned_to
        ).order_by(BatchList.assigned_to.desc()).first()
        if lower_batch:
            latest_batch = lower_batch.assigned_to
        else:
            latest_batch = 0

    if is_current:
        existing_latest_batch = db.query(BatchList).filter(
            BatchList.course_id == db_batch.course_id,
            BatchList.assigned_to == latest_batch
        ).first()
        if is_latest or existing_latest_batch:
            current_batch = latest_batch + 1
            latest_batch = latest_batch + 1
        else:
            current_batch = latest_batch

    template.current_batch = current_batch
    template.latest_batch = latest_batch

    db.query(CourseWaitlist).filter(
        CourseWaitlist.course_id == db_batch.course_id,
        CourseWaitlist.waitlist_batch_id == db_batch.assigned_to
    ).update({"waitlist_batch_id": latest_batch})

    db.add(template)
    db.query(CourseSchedule).filter(CourseSchedule.batch_list_id == batch_id).delete()
    db.delete(db_batch)
    db.commit()

    return {"message": "Batch deleted successfully"}


@router.get("/api/admin/courses/{course_id}/template", response_model=BatchTemplateResponse)
def get_batch_template(course_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    template = db.query(BatchTemplate).filter(BatchTemplate.course_id == course_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.put("/api/admin/courses/{course_id}/template", response_model=BatchTemplateResponse)
def update_batch_template(course_id: int, template_update: BatchTemplateUpdate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    template = db.query(BatchTemplate).filter(BatchTemplate.course_id == course_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    update_data = template_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(template, key, value)

    db.commit()
    db.refresh(template)
    return template


@router.get("/api/admin/courses/{course_id}/waitlist")
def get_course_waitlist(course_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """Returns all waitlist entries for a course with user details."""
    entries = db.query(CourseWaitlist).filter(CourseWaitlist.course_id == course_id).all()
    user_ids = [e.user_id for e in entries]
    if not user_ids:
        return []

    users = db.query(User).filter(User.id.in_(user_ids)).all()
    user_map = {u.id: u for u in users}

    return [
        {
            "user_id": e.user_id,
            "user_name": user_map.get(e.user_id, None).UserName if user_map.get(e.user_id) else "Unknown",
            "user_id_str": user_map.get(e.user_id, None).UserID if user_map.get(e.user_id) else "",
            "email": user_map.get(e.user_id, None).email if user_map.get(e.user_id) else "",
            "waitlist_batch_id": e.waitlist_batch_id,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in entries
    ]


@router.get("/batches/{batch_id}/participants", response_model=List[BatchParticipantResponse])
def get_batch_participants(batch_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    batch = db.query(BatchList).filter(BatchList.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    waitlist_entries = db.query(CourseWaitlist).filter(
        CourseWaitlist.course_id == batch.course_id,
        CourseWaitlist.waitlist_batch_id == batch.assigned_to
    ).all()

    user_ids = [w.user_id for w in waitlist_entries]
    if not user_ids:
        return []

    users = db.query(User).filter(User.id.in_(user_ids)).all()
    user_map = {u.id: u for u in users}

    return [
        {
            "user_id": w.user_id,
            "user_name": user_map[w.user_id].UserName if w.user_id in user_map else "Unknown",
            "email": user_map[w.user_id].email if w.user_id in user_map else "",
            "waitlist_batch_id": w.waitlist_batch_id,
            "created_at": w.created_at,
        }
        for w in waitlist_entries
    ]


@router.post("/batches/{batch_id}/participants")
def add_batch_participant(
    batch_id: int,
    payload: AddParticipantRequest,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    batch = db.query(BatchList).filter(BatchList.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    existing = db.query(CourseWaitlist).filter(
        CourseWaitlist.course_id == batch.course_id,
        CourseWaitlist.waitlist_batch_id == batch.assigned_to,
        CourseWaitlist.user_id == payload.user_id
    ).first()

    if existing:
        raise HTTPException(status_code=409, detail="User is already a participant of this batch")

    new_entry = CourseWaitlist(
        user_id=payload.user_id,
        course_id=batch.course_id,
        waitlist_batch_id=batch.assigned_to
    )
    db.add(new_entry)
    db.commit()

    return {"message": "Participant added successfully"}


@router.delete("/batches/{batch_id}/participants/{user_id}")
def remove_batch_participant(
    batch_id: int,
    user_id: int,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    batch = db.query(BatchList).filter(BatchList.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    entry = db.query(CourseWaitlist).filter(
        CourseWaitlist.course_id == batch.course_id,
        CourseWaitlist.waitlist_batch_id == batch.assigned_to,
        CourseWaitlist.user_id == user_id
    ).first()

    if not entry:
        raise HTTPException(status_code=404, detail="Participant not found in this batch")

    db.delete(entry)
    db.commit()

    return {"message": "Participant removed successfully"}


@router.get("/batches/{batch_list_id}/schedules")
def get_batch_schedules(batch_list_id: int, db: Session = Depends(get_db)):
    schedules = db.query(CourseSchedule, CourseChapter.title)\
        .outerjoin(CourseChapter, CourseSchedule.chapter_id == CourseChapter.id)\
        .filter(CourseSchedule.batch_list_id == batch_list_id)\
        .order_by(CourseSchedule.scheduled_at.asc())\
        .all()

    formatted_schedules = []
    for index, (sched, chap_name) in enumerate(schedules, start=1):
        now = datetime.now()

        if sched.scheduled_at:
            if sched.scheduled_at > now:
                status = "Scheduled"
            elif sched.scheduled_at < now - timedelta(hours=2):
                status = "Completed"
            else:
                status = "Ongoing"
        else:
            status = "Scheduled"

        final_module_name = chap_name if chap_name else (sched.custom_chapter_name or "Custom Module")

        formatted_schedules.append({
            "id": str(sched.id),
            "moduleIndex": index,
            "moduleName": final_module_name,
            "scheduledAt": sched.scheduled_at.strftime("%b %d, %Y - %I:%M %p") if sched.scheduled_at else "TBD",
            "duration": sched.estimated_duration,
            "type": sched.session_type.capitalize() if sched.session_type else "Live",
            "status": status,
            "link": sched.join_link if sched.join_link else "#"
        })

    return formatted_schedules


@router.post("/batches/{batch_list_id}/schedules", response_model=CourseScheduleResponse)
def create_schedule(batch_list_id: int, schedule: CourseScheduleCreate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    if schedule.batch_list_id != batch_list_id:
        raise HTTPException(status_code=400, detail="Batch ID mismatch in URL and payload")

    new_schedule = CourseSchedule(**schedule.model_dump())
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)
    return new_schedule


@router.put("/schedules/{schedule_id}", response_model=CourseScheduleResponse)
def update_schedule(schedule_id: int, schedule_update: CourseScheduleUpdate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    db_schedule = db.query(CourseSchedule).filter(CourseSchedule.id == schedule_id).first()
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    update_data = schedule_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_schedule, key, value)

    db.commit()
    db.refresh(db_schedule)
    return db_schedule


@router.delete("/schedules/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    sched = db.query(CourseSchedule).filter(CourseSchedule.id == schedule_id).first()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")

    db.delete(sched)
    db.commit()
    return {"message": "Schedule deleted successfully"}
