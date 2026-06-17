from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from app.database import get_db
from app.models import CourseProgress, CourseSchedule, CourseChapter, BatchList, Course, User, CourseWaitlist
from app.schemas import (
    ProgressSessionResponse, UserProgressResponse,
    AdminUserProgress, BatchParticipantResponse, UserSearchResult,
    AddParticipantRequest, BatchProgressSummary
)
from app.core.deps import get_current_user, get_current_admin

router = APIRouter(tags=["Progress"])


def get_session_status(scheduled_at, is_completed):
    """Determine session status based on schedule time and completion."""
    if is_completed:
        return "Completed"
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if not scheduled_at:
        return "Scheduled"
    if scheduled_at > now:
        return "Scheduled"
    elif scheduled_at < now - timedelta(hours=2):
        return "Missed"
    else:
        return "Ongoing"


@router.get("/batches/{batch_list_id}/schedules")
def get_batch_schedules(batch_list_id: int, db: Session = Depends(get_db)):
    """Fetches all schedules for a specific batch to populate the UI table"""

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


@router.get("/my-progress/{batch_list_id}", response_model=UserProgressResponse)
def get_my_progress(batch_list_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user's progress for a specific batch."""
    batch = db.query(BatchList).filter(BatchList.id == batch_list_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    course = db.query(Course).filter(Course.id == batch.course_id).first()
    schedules = db.query(CourseSchedule, CourseChapter.title).outerjoin(
        CourseChapter, CourseSchedule.chapter_id == CourseChapter.id
    ).filter(
        CourseSchedule.batch_list_id == batch_list_id
    ).order_by(CourseSchedule.scheduled_at.asc()).all()

    session_list = []
    completed_count = 0
    for sched, chap_name in schedules:
        progress = db.query(CourseProgress).filter(
            CourseProgress.user_id == current_user.id,
            CourseProgress.schedule_id == sched.id
        ).first()

        is_completed = progress.is_completed if progress else False
        completed_at = progress.completed_at if progress else None

        if is_completed:
            completed_count += 1

        module_name = chap_name if chap_name else (sched.custom_chapter_name or "Custom Module")
        status = get_session_status(sched.scheduled_at, is_completed)

        session_list.append(ProgressSessionResponse(
            schedule_id=sched.id,
            module_name=module_name,
            scheduled_at=sched.scheduled_at,
            estimated_duration=sched.estimated_duration or "1 hour",
            session_type=sched.session_type or "live",
            join_link=sched.join_link,
            status=status,
            is_completed=is_completed,
            completed_at=completed_at
        ))

    total = len(schedules)
    pct = (completed_count / total * 100) if total > 0 else 0

    return UserProgressResponse(
        batch_id=batch_list_id,
        course_title=course.title if course else "Unknown",
        total_sessions=total,
        completed_sessions=completed_count,
        progress_percentage=round(pct, 2),
        sessions=session_list
    )


@router.post("/progress/{schedule_id}")
def mark_session_joined(schedule_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """User joins a session — creates progress row with is_completed=True."""
    sched = db.query(CourseSchedule).filter(CourseSchedule.id == schedule_id).first()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")

    progress = db.query(CourseProgress).filter(
        CourseProgress.user_id == current_user.id,
        CourseProgress.schedule_id == schedule_id
    ).first()

    if progress:
        raise HTTPException(status_code=400, detail="Already joined this session")

    progress = CourseProgress(
        user_id=current_user.id,
        course_id=sched.course_id,
        batch_list_id=sched.batch_list_id,
        schedule_id=schedule_id,
        is_completed=True,
        completed_at=datetime.now(timezone.utc).replace(tzinfo=None)
    )
    db.add(progress)
    db.commit()
    db.refresh(progress)

    return {"message": "Session joined", "is_completed": progress.is_completed, "completed_at": progress.completed_at}


@router.get("/admin/batches/{batch_list_id}/progress", response_model=BatchProgressSummary)
def get_batch_progress_admin(batch_list_id: int, current_admin: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Admin view: all users' progress in a batch."""
    batch = db.query(BatchList).filter(BatchList.id == batch_list_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    course = db.query(Course).filter(Course.id == batch.course_id).first()

    waitlist_users = db.query(CourseWaitlist).filter(
        CourseWaitlist.course_id == batch.course_id,
        CourseWaitlist.waitlist_batch_id == batch.assigned_to
    ).all()

    schedules = db.query(CourseSchedule, CourseChapter.title).outerjoin(
        CourseChapter, CourseSchedule.chapter_id == CourseChapter.id
    ).filter(
        CourseSchedule.batch_list_id == batch_list_id
    ).order_by(CourseSchedule.scheduled_at.asc()).all()

    total_sessions = len(schedules)
    users_progress = []
    total_pct = 0

    for wl in waitlist_users:
        user = db.query(User).filter(User.id == wl.user_id).first()
        if not user:
            continue

        session_list = []
        completed_count = 0

        for sched, chap_name in schedules:
            progress = db.query(CourseProgress).filter(
                CourseProgress.user_id == user.id,
                CourseProgress.schedule_id == sched.id
            ).first()

            is_completed = progress.is_completed if progress else False
            completed_at = progress.completed_at if progress else None

            if is_completed:
                completed_count += 1

            module_name = chap_name if chap_name else (sched.custom_chapter_name or "Custom Module")
            status = get_session_status(sched.scheduled_at, is_completed)

            session_list.append(ProgressSessionResponse(
                schedule_id=sched.id,
                module_name=module_name,
                scheduled_at=sched.scheduled_at,
                estimated_duration=sched.estimated_duration or "1 hour",
                session_type=sched.session_type or "live",
                join_link=sched.join_link,
                status=status,
                is_completed=is_completed,
                completed_at=completed_at
            ))

        pct = (completed_count / total_sessions * 100) if total_sessions > 0 else 0
        total_pct += pct

        users_progress.append(AdminUserProgress(
            user_id=user.id,
            user_name=user.UserName,
            email=user.email,
            total_sessions=total_sessions,
            completed_sessions=completed_count,
            progress_percentage=round(pct, 2),
            sessions=session_list
        ))

    user_count = len(users_progress)
    avg_pct = (total_pct / user_count) if user_count > 0 else 0

    return BatchProgressSummary(
        batch_id=batch_list_id,
        course_title=course.title if course else "Unknown",
        total_users=user_count,
        total_sessions=total_sessions,
        avg_progress_percentage=round(avg_pct, 2),
        users=users_progress
    )


# ---------------------------------------------------------------------------
# Extra endpoints (preserved from refactored router for admin UI)
# ---------------------------------------------------------------------------

@router.get("/batches/{batch_id}/participants", response_model=List[BatchParticipantResponse])
def get_batch_participants(batch_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    batch = db.query(BatchList).filter(BatchList.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    participants = db.query(CourseWaitlist).filter(CourseWaitlist.waitlist_batch_id == batch.assigned_to).all()
    result = []
    for p in participants:
        user = db.query(User).filter(User.id == p.user_id).first()
        if user:
            result.append(BatchParticipantResponse(
                user_id=user.id,
                user_name=user.UserName,
                email=user.email,
                waitlist_batch_id=p.waitlist_batch_id,
                created_at=p.created_at,
            ))
    return result


@router.post("/batches/{batch_id}/participants", response_model=BatchParticipantResponse)
def add_participant(batch_id: int, participant_data: AddParticipantRequest, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    batch = db.query(BatchList).filter(BatchList.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    user = db.query(User).filter(User.id == participant_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(CourseWaitlist).filter(
        CourseWaitlist.user_id == user.id,
        CourseWaitlist.course_id == batch.course_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already in waitlist for this course")

    participant = CourseWaitlist(
        user_id=user.id,
        course_id=batch.course_id,
        waitlist_batch_id=batch.assigned_to,
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)

    return BatchParticipantResponse(
        user_id=user.id,
        user_name=user.UserName,
        email=user.email,
        waitlist_batch_id=batch.assigned_to,
        created_at=participant.created_at,
    )


@router.get("/users/search", response_model=List[UserSearchResult])
def search_users(q: str, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    users = db.query(User).filter(
        (User.UserName.ilike(f"%{q}%")) | (User.email.ilike(f"%{q}%")) | (User.UserID.ilike(f"%{q}%"))
    ).limit(20).all()
    return [
        UserSearchResult(id=u.id, UserID=u.UserID, UserName=u.UserName, email=u.email)
        for u in users
    ]
