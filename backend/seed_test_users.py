"""Seed test users, purchases, and waitlist entries for course 14."""
import uuid
from datetime import datetime, timezone
from app.database import SessionLocal
from app.models import User, Purchase, CourseWaitlist, Course, BatchTemplate

db = SessionLocal()

course_id = 14
template = db.query(BatchTemplate).filter(BatchTemplate.course_id == course_id).first()
latest_batch = template.latest_batch if template else 0

print(f"Course {course_id}: latest_batch={latest_batch}, current_batch={template.current_batch if template else 'N/A'}")

# Test user data
test_users = [
    {"userid": "testuser1", "name": "Test User 1", "email": "test1@example.com"},
    {"userid": "testuser2", "name": "Test User 2", "email": "test2@example.com"},
    {"userid": "testuser3", "name": "Test User 3", "email": "test3@example.com"},
    {"userid": "testuser4", "name": "Test User 4", "email": "test4@example.com"},
    {"userid": "testuser5", "name": "Test User 5", "email": "test5@example.com"},
]

# Assign different waitlist_batch_ids to test status logic
# 1 = existing batch (assigned)
# 3 = latest_batch + 1 (waiting)
# 99 = old/non-existent (expired)
assignments = [1, latest_batch + 1, latest_batch + 1, 99, 1]

created = []

for i, data in enumerate(test_users):
    # Check if user already exists
    existing = db.query(User).filter(User.UserID == data["userid"]).first()
    if existing:
        print(f"User {data['userid']} already exists (id={existing.id})")
        user = existing
    else:
        user = User(
            UserUUID=str(uuid.uuid4()),
            UserID=data["userid"],
            UserName=data["name"],
            email=data["email"],
            password="$2b$12$testhashedpassword",  # dummy hash
            is_verified=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        print(f"Created user {data['userid']} (id={user.id})")

    # Create Purchase if not exists
    purchase = db.query(Purchase).filter(
        Purchase.user_id == user.id,
        Purchase.product_id == course_id,
        Purchase.product_section == 1
    ).first()

    if not purchase:
        purchase = Purchase(
            product_section=1,
            product_id=course_id,
            user_id=user.id,
            cost=1.0,
            purchased_at=datetime.now(timezone.utc),
        )
        db.add(purchase)
        print(f"  -> Purchase created")
    else:
        print(f"  -> Purchase already exists")

    # Create or update CourseWaitlist entry
    waitlist = db.query(CourseWaitlist).filter(
        CourseWaitlist.user_id == user.id,
        CourseWaitlist.course_id == course_id
    ).first()

    waitlist_batch_id = assignments[i]

    if waitlist:
        waitlist.waitlist_batch_id = waitlist_batch_id
        print(f"  -> Waitlist updated to batch {waitlist_batch_id}")
    else:
        waitlist = CourseWaitlist(
            user_id=user.id,
            course_id=course_id,
            waitlist_batch_id=waitlist_batch_id,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(waitlist)
        print(f"  -> Waitlist created for batch {waitlist_batch_id}")

    created.append({
        "user_id": user.id,
        "name": user.UserName,
        "waitlist_batch_id": waitlist_batch_id,
    })

# Increment purchased_count on course if needed
course = db.query(Course).filter(Course.id == course_id).first()
if course:
    actual_count = db.query(Purchase).filter(Purchase.product_id == course_id, Purchase.product_section == 1).count()
    course.purchased_count = actual_count
    print(f"\nUpdated course purchased_count to {actual_count}")

db.commit()
print("\n✅ All test data seeded successfully!")
print("\nTest assignments:")
for c in created:
    print(f"  {c['name']} (id={c['user_id']}): waitlist_batch_id={c['waitlist_batch_id']}")

db.close()
