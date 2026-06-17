import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    CourseUUID = Column(String(255), unique=True, index=True, default=lambda: str(uuid.uuid4()))
    product_uuid = Column(String(255), unique=True, index=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(String(255), unique=True, index=True)
    title = Column(String(255), index=True)
    description = Column(String(255))
    price = Column(Float)
    course_thumbnail = Column(String(255))

    purchased_count = Column(Integer, default=0)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    chapters = relationship("CourseChapter", back_populates="course", cascade="all, delete-orphan")
    batch_template = relationship("BatchTemplate", back_populates="course", uselist=False, cascade="all, delete-orphan")
    batch_lists = relationship("BatchList", back_populates="course", cascade="all, delete-orphan")


class CourseChapter(Base):
    __tablename__ = "course_chapters"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))

    chapter_index = Column(Integer)
    title = Column(String(255))

    days_after_start = Column(Integer, default=0)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    course = relationship("Course", back_populates="chapters")
    schedules = relationship("CourseSchedule", back_populates="chapter", cascade="all, delete-orphan")


class CourseWaitlist(Base):
    __tablename__ = "course_waitlist"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    waitlist_batch_id = Column(Integer)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class BatchTemplate(Base):
    __tablename__ = "batch_template"
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), unique=True)

    min_enroll = Column(Integer, default=10)
    no_of_days = Column(Integer, default=30)
    automated_batch_creation = Column(Boolean, default=False)
    alert = Column(Boolean, default=True)
    alert_to = Column(String(255), nullable=True)
    current_batch = Column(Integer, default=0)
    latest_batch = Column(Integer, default=0)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    course = relationship("Course", back_populates="batch_template")


class BatchList(Base):
    __tablename__ = "batch_list"
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))

    min_enroll = Column(Integer)
    batch_start_date = Column(DateTime)
    max_days = Column(Integer)
    assigned_to = Column(Integer)
    status = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    course = relationship("Course", back_populates="batch_lists")
    schedules = relationship("CourseSchedule", back_populates="batch_list", cascade="all, delete-orphan")


class CourseSchedule(Base):
    __tablename__ = "course_schedule"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    batch_list_id = Column(Integer, ForeignKey("batch_list.id"))

    chapter_id = Column(Integer, ForeignKey("course_chapters.id"), nullable=True)
    custom_chapter_name = Column(String(255), nullable=True)

    scheduled_at = Column(DateTime, nullable=True)
    estimated_duration = Column(String(255), default="1 hour")
    session_type = Column(String(255), default="live")
    join_link = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    batch_list = relationship("BatchList", back_populates="schedules")
    chapter = relationship("CourseChapter", back_populates="schedules")


class CourseProgress(Base):
    __tablename__ = "course_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    batch_list_id = Column(Integer, ForeignKey("batch_list.id"))
    schedule_id = Column(Integer, ForeignKey("course_schedule.id"))

    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)