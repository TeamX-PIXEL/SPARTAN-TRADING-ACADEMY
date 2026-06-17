"""Move all test users to the future batch (latest_batch + 1) for course 14."""
from datetime import datetime, timezone
from app.database import SessionLocal
from app.models import User, CourseWaitlist

db = SessionLocal()

course_id = 14

# Get all test users
usernames = [f"testuser{i}" for i in range(1, 6)]
test_users = db.query(User).filter(User.UserID.in_(usernames)).all()

print(f"Found {len(test_users)} test users")

# Get template to determine future batch
from app.models import BatchTemplate
template = db.query(BatchTemplate).filter(BatchTemplate.course_id == course_id).first()
future_batch = (template.latest_batch if template else 0) + 1
print(f"Course {course_id}: latest_batch={template.latest_batch if template else 'N/A'}, moving all to future_batch={future_batch}")

for user in test_users:
    waitlist = db.query(CourseWaitlist).filter(
        CourseWaitlist.user_id == user.id,
        CourseWaitlist.course_id == course_id
    ).first()

    if waitlist:
        old_batch = waitlist.waitlist_batch_id
        waitlist.waitlist_batch_id = future_batch
        waitlist.updated_at = datetime.now(timezone.utc)
        print(f"  {user.UserName} ({user.UserID}): batch {old_batch} -> {future_batch}")
    else:
        print(f"  {user.UserName} ({user.UserID}): no waitlist entry found, skipping")

db.commit()
print("\n✅ All test users moved to future batch successfully!")

db.close()
