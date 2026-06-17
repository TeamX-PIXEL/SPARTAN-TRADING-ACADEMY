from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class CourseBase(BaseModel):
    course_id: str
    title: str
    description: str
    price: float
    purchased_count: int = 0
    course_thumbnail: str


class CourseCreate(CourseBase):
    pass


class CourseResponse(CourseBase):
    id: int
    CourseUUID: str
    product_uuid: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedCoursesResponse(BaseModel):
    courses: List[CourseResponse]
    total: int
    skip: int
    limit: int


class PublicCourseResponse(BaseModel):
    id: str
    product_uuid: str
    title: str
    description: str
    price: float
    course_thumbnail: str
    scheduled_at: Optional[str] = None
    estimated_duration: Optional[str] = None
    course_link: Optional[str] = None
    next_chapter_title: Optional[str] = None
    next_chapter_index: Optional[int] = None
    is_ongoing: Optional[bool] = None
    is_purchased: bool = False
    is_assigned: bool = False


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    course_thumbnail: Optional[str] = None


class CourseChapterBase(BaseModel):
    chapter_index: int = 0
    title: str
    days_after_start: int = 0


class CourseChapterCreate(CourseChapterBase):
    pass


class CourseChapterUpdate(BaseModel):
    title: Optional[str] = None
    days_after_start: Optional[int] = None
    chapter_index: Optional[int] = None


class CourseChapterResponse(CourseChapterBase):
    id: int
    course_id: int

    model_config = ConfigDict(from_attributes=True)


class CourseWaitlistResponse(BaseModel):
    id: int
    user_id: int
    course_id: int
    waitlist_batch_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BatchTemplateBase(BaseModel):
    min_enroll: int = 10
    no_of_days: int = 30
    automated_batch_creation: bool = True
    alert: bool = True
    alert_to: Optional[str] = None
    current_batch: int = 0
    latest_batch: int = 0


class BatchTemplateUpdate(BaseModel):
    min_enroll: Optional[int] = None
    no_of_days: Optional[int] = None
    automated_batch_creation: Optional[bool] = None
    alert: Optional[bool] = None
    alert_to: Optional[str] = None
    current_batch: Optional[int] = None
    latest_batch: Optional[int] = None


class BatchTemplateCreate(BatchTemplateBase):
    course_id: int


class BatchTemplateResponse(BatchTemplateBase):
    id: int
    course_id: int

    model_config = ConfigDict(from_attributes=True)


class BatchListBase(BaseModel):
    min_enroll: int
    batch_start_date: datetime
    max_days: int
    assigned_to: int
    status: Optional[str] = None


class BatchListUpdate(BaseModel):
    batch_start_date: Optional[datetime] = None
    max_days: Optional[int] = None
    min_enroll: Optional[int] = None
    status: Optional[str] = None


class ManualBatchCreate(BaseModel):
    start_date: datetime
    max_days: int


class BatchProgressInfo(BaseModel):
    scheduled: int = 0
    total: int = 0


class BatchListResponse(BatchListBase):
    id: int
    course_id: int
    created_at: datetime
    no_participants: int = 0
    progress: Optional[BatchProgressInfo] = None

    model_config = ConfigDict(from_attributes=True)


class CourseScheduleBase(BaseModel):
    scheduled_at: Optional[datetime] = None
    estimated_duration: str = "1 hour"
    session_type: str = "live"
    join_link: Optional[str] = None
    custom_chapter_name: Optional[str] = None


class CourseScheduleCreate(CourseScheduleBase):
    course_id: int
    batch_list_id: int
    chapter_id: Optional[int] = None


class CourseScheduleUpdate(BaseModel):
    chapter_id: Optional[int] = None
    custom_chapter_name: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    estimated_duration: Optional[str] = None
    session_type: Optional[str] = None
    join_link: Optional[str] = None


class CourseScheduleResponse(CourseScheduleBase):
    id: int
    course_id: int
    batch_list_id: int
    chapter_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class CourseProgressBase(BaseModel):
    is_completed: bool = False
    completed_at: Optional[datetime] = None


class CourseProgressCreate(CourseProgressBase):
    course_id: int
    batch_list_id: int
    schedule_id: int


class CourseProgressResponse(CourseProgressBase):
    id: int
    user_id: int
    course_id: int
    batch_list_id: int
    schedule_id: int

    model_config = ConfigDict(from_attributes=True)


class ProgressUpdate(BaseModel):
    is_completed: bool


class ProgressSessionResponse(BaseModel):
    schedule_id: int
    module_name: str
    scheduled_at: Optional[datetime] = None
    estimated_duration: str
    session_type: str
    join_link: Optional[str] = None
    status: str
    is_completed: bool
    completed_at: Optional[datetime] = None


class UserProgressResponse(BaseModel):
    batch_id: int
    course_title: str
    total_sessions: int
    completed_sessions: int
    progress_percentage: float
    sessions: List[ProgressSessionResponse]


class AdminUserProgress(BaseModel):
    user_id: int
    user_name: str
    email: str
    total_sessions: int
    completed_sessions: int
    progress_percentage: float
    sessions: List[ProgressSessionResponse]


class BatchParticipantResponse(BaseModel):
    user_id: int
    user_name: str
    email: str
    waitlist_batch_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserSearchResult(BaseModel):
    id: int
    UserID: str
    UserName: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class AddParticipantRequest(BaseModel):
    user_id: int


class BatchProgressSummary(BaseModel):
    batch_id: int
    course_title: str
    total_users: int
    total_sessions: int
    avg_progress_percentage: float
    users: List[AdminUserProgress]