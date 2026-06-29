from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Float, Text, JSON, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(String(50), unique=True, index=True)
    title = Column(String(255), index=True)
    description = Column(Text)
    long_description = Column(Text, nullable=True)
    price = Column(Float)
    image = Column(Text, nullable=True)
    category = Column(String(100), default="General")
    features = Column(JSON, nullable=True)
    duration_months = Column(Integer, default=1)
    difficulty = Column(String(50), default="Beginner")
    course_thumbnail = Column(String(255), nullable=True)
    discord_channel_id = Column(String(255), nullable=True)
    discord_renewal_price = Column(Float, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    batches = relationship("Batch", back_populates="course", cascade="all, delete-orphan")


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String(50), unique=True, index=True)
    course_id = Column(String(50), ForeignKey("courses.course_id"), index=True)
    instructor = Column(String(255), default="")
    purchased_count = Column(Integer, default=0)
    status = Column(String(20), default="upcoming")
    scheduled_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    discord_channel_id = Column(String(255), nullable=True)
    discord_renewal_price = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    course = relationship("Course", back_populates="batches")
    lessons = relationship("Lesson", back_populates="batch", cascade="all, delete-orphan")
    members = relationship("BatchMember", back_populates="batch", cascade="all, delete-orphan")


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String(50), ForeignKey("batches.batch_id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255))
    type = Column(String(50), default="youtube")
    link = Column(Text, nullable=True)
    duration = Column(String(50), nullable=True)
    start_time = Column(DateTime, nullable=True)
    added_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    batch = relationship("Batch", back_populates="lessons")


class CourseLesson(Base):
    __tablename__ = "course_lessons"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(String(50), ForeignKey("courses.course_id", ondelete="CASCADE"), index=True)
    title = Column(String(255))
    link = Column(Text, nullable=True)
    duration = Column(String(50), nullable=True)
    added_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    course = relationship("Course")


class BatchMember(Base):
    __tablename__ = "batch_members"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), index=True)
    batch_id = Column(String(50), ForeignKey("batches.batch_id", ondelete="SET NULL"), nullable=True, index=True)
    expiry = Column(DateTime, nullable=True)
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    batch = relationship("Batch", back_populates="members")

    __table_args__ = (
        UniqueConstraint("username", "batch_id", name="uk_batch_user"),
    )
