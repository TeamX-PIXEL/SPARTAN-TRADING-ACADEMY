from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class CourseBase(BaseModel):
    course_id: str
    title: str
    description: str
    long_description: Optional[str] = None
    price: float
    image: Optional[str] = None
    category: str = "General"
    features: Optional[list] = None
    duration_months: int = 1
    lecturer: str = "TBA"
    difficulty: str = "Beginner"
    scheduled_at: Optional[datetime] = None
    purchased_count: int = 0
    course_thumbnail: Optional[str] = None
    discord_channel_id: Optional[str] = None
    discord_renewal_price: Optional[float] = None


class CourseCreate(CourseBase):
    pass


class CourseResponse(CourseBase):
    id: int
    status: str = "upcoming"
    completed_at: Optional[datetime] = None
    created_at: datetime
    lesson_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class PaginatedCoursesResponse(BaseModel):
    courses: List[CourseResponse]
    total: int
    skip: int
    limit: int


class PublicCourseResponse(BaseModel):
    id: str
    course_id: str
    title: str
    description: str
    price: float
    course_thumbnail: str
    scheduled_at: Optional[str] = None
    is_purchased: bool = False

    model_config = ConfigDict(from_attributes=True)


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    long_description: Optional[str] = None
    price: Optional[float] = None
    image: Optional[str] = None
    category: Optional[str] = None
    features: Optional[list] = None
    duration_months: Optional[int] = None
    lecturer: Optional[str] = None
    difficulty: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    course_thumbnail: Optional[str] = None
    status: Optional[str] = None
    completed_at: Optional[datetime] = None


class LessonBase(BaseModel):
    title: str
    type: str = "youtube"
    link: Optional[str] = None
    duration: Optional[str] = None
    start_time: Optional[datetime] = None


class LessonCreate(LessonBase):
    pass


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    link: Optional[str] = None
    duration: Optional[str] = None
    start_time: Optional[datetime] = None


class LessonResponse(LessonBase):
    id: int
    course_id: int
    added_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserSearchResult(BaseModel):
    id: int
    username: str = ""
    name: str = ""
    email: str = ""
    tvid: str = ""

    model_config = ConfigDict(from_attributes=True)


class CourseMemberCreate(BaseModel):
    username: str
    expiry: Optional[datetime] = None
    amount: float = 0
    method: Optional[str] = None


class CourseMemberResponse(BaseModel):
    id: int
    username: str
    course_id: str
    expiry: Optional[datetime] = None
    joined_at: datetime
    name: str = ""
    email: str = ""
    firstname: str = ""
    lastname: str = ""
    discord_user_id: Optional[str] = None
    access_type: str = "free"

    model_config = ConfigDict(from_attributes=True)


class CourseMemberUpdate(BaseModel):
    expiry: Optional[datetime] = None
