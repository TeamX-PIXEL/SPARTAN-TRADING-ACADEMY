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
    lecturer = Column(String(255), default="TBA")
    difficulty = Column(String(50), default="Beginner")
    scheduled_at = Column(DateTime, nullable=True)
    course_thumbnail = Column(String(255), nullable=True)
    purchased_count = Column(Integer, default=0)
    status = Column(String(50), default="upcoming")
    completed_at = Column(DateTime, nullable=True)
    discord_channel_id = Column(String(255), nullable=True)
    discord_renewal_price = Column(Float, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    lessons = relationship("Lesson", back_populates="course", cascade="all, delete-orphan")


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"))
    title = Column(String(255))
    type = Column(String(50), default="youtube")
    link = Column(Text, nullable=True)
    duration = Column(String(50), nullable=True)
    start_time = Column(DateTime, nullable=True)
    added_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    course = relationship("Course", back_populates="lessons")


class CourseMember(Base):
    __tablename__ = "course_members"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), index=True)
    course_id = Column(String(50), index=True)
    expiry = Column(DateTime, nullable=True)
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("username", "course_id", name="uk_course_user"),
    )
