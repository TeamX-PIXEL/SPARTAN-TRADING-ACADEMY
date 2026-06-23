# Academy Pipeline — Data Requirements

---

## SQL Tables

### 1. `courses` (19 fields)

| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT PK | |
| `course_id` | VARCHAR(50) UNIQUE | Admin slug e.g. "CRS-101" |
| `title` | VARCHAR(255) | Required |
| `description` | TEXT | Short description |
| `long_description` | TEXT nullable | Full description |
| `price` | DECIMAL(12,2) | INR |
| `image` | TEXT nullable | Base64 or URL |
| `category` | VARCHAR(100) | Default "General" |
| `features` | JSON | Array of 4 strings |
| `duration_months` | INT | Default 1 |
| `lecturer` | VARCHAR(255) | Default "TBA" |
| `difficulty` | VARCHAR(50) | Beginner / Intermediate / Advanced / Master |
| `scheduled_at` | DATETIME nullable | Launch date; `> NOW()+5min` → Upcoming; `<= NOW()+5min` → On-Going |
| `course_thumbnail` | VARCHAR(255) nullable | Thumbnail URL |
| `purchased_count` | INT | Default 0, auto-increment on member add |
| `status` | VARCHAR(50) | upcoming / ongoing / completed |
| `completed_at` | DATETIME nullable | Set when marked completed |
| `created_at` | TIMESTAMP | Auto-set |
| `updated_at` | TIMESTAMP | Auto-set |

### 2. `lessons` (8 fields)

| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT PK | |
| `course_id` | INT FK→courses.id | CASCADE on delete |
| `title` | VARCHAR(255) | Required |
| `type` | VARCHAR(50) | youtube / zoom / meet |
| `link` | TEXT nullable | YouTube URL or meeting URL |
| `duration` | VARCHAR(50) nullable | e.g. "90 min" |
| `start_time` | DATETIME nullable | Required for zoom/meet |
| `added_at` | TIMESTAMP | Auto-set |

### 3. `course_members` (5 fields)

| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT PK | |
| `username` | VARCHAR(100) | FK→users.username (business key) |
| `course_id` | VARCHAR(50) | FK→courses.course_id (business key) |
| `expiry` | DATETIME nullable | Discord expiry for this member |
| `joined_at` | TIMESTAMP | Auto-set |

UNIQUE(username, course_id) — one enrolment per user per course

> **Lookup fields** (not stored, queried from `users` table via `username`): email, firstname, lastname, discord_user_id

---

## API Endpoints (9 total)

### Course CRUD (4)

| # | Method | Path | Description | Request Body | Response |
|---|---|---|---|---|---|
| 1 | GET | `/api/admin/courses` | List all (paginated) | query: skip, limit | `{ courses: Course[], total, skip, limit }` |
| 2 | POST | `/api/admin/courses` | Create | `{ course_id, title, description, longDescription?, price, image?, category?, features?, duration_months?, lecturer?, difficulty?, scheduled_at?, course_thumbnail? }` | `{ Course }` (purchased_count=0, status=upcoming) |
| 3 | PUT | `/api/admin/courses/:course_id` | Update by course_id | Partial fields | `{ Course }` |
| 4 | DELETE | `/api/admin/courses/:course_id` | Delete by course_id | — | `{ message, course_id }` (only if purchased_count=0, cascades lessons+members) |

### Course ID Check (1)

| # | Method | Path | Description | Response |
|---|---|---|---|---|
| 5 | GET | `/api/admin/courses/check-id/:course_id` | Check uniqueness | `{ exists: boolean }` |

### Lesson CRUD (4)

| # | Method | Path | Description | Request Body | Response |
|---|---|---|---|---|---|
| 6 | GET | `/api/admin/courses/:course_id/lessons` | List lessons for course | — | `Lesson[]` |
| 7 | POST | `/api/admin/courses/:course_id/lessons` | Create lesson | `{ title, type, link?, duration?, start_time? }` | `{ Lesson }` |
| 8 | PUT | `/api/admin/lessons/:lesson_id` | Update lesson | Partial fields | `{ Lesson }` |
| 9 | DELETE | `/api/admin/lessons/:lesson_id` | Delete lesson | — | `{ message }` |

### Course Members (3) — ⚠️ NOT YET IMPLEMENTED

| # | Method | Path | Description | Request Body | Response |
|---|---|---|---|---|---|
| 10 | GET | `/api/admin/courses/:course_id/members` | List members | — | `{ members: Member[] }` |
| 11 | POST | `/api/admin/courses/:course_id/members` | Enrol member | `{ username, expiry?, amount, method }` | `{ member: Member }` (creates Transaction, increments purchased_count) |
| 12 | PATCH | `/api/admin/courses/members/:member_id` | Update expiry | `{ expiry: string }` | `{ member: Member }` |

### User Search (1) — already exists

| # | Method | Path |
|---|---|---|
| 13 | GET | `/api/admin/users/search?q=` |

---

## Business Rules

1. **`course_id` immutable** after creation (disabled in edit form)
2. **`course_id` uniqueness** checked case-insensitively
3. **`course_id` format** — auto-uppercase, spaces→hyphens
4. **`purchased_count` auto-increments** on member enrol (no decrement — members not deleted)
5. **Required fields**: `course_id`, `title`, `price`
6. **Default values**: category="General", difficulty="Beginner", lecturer="TBA", duration_months=1
7. **Course status logic**:
   - `scheduled_at > NOW() + 5 minutes` → Upcoming
   - `scheduled_at <= NOW() + 5 minutes` AND `completed_at IS NULL` → On-Going
   - `completed_at IS NOT NULL` → Completed
8. **Deletion blocked** if `purchased_count > 0`
9. **Every member enrolment creates a Transaction** (section="Course")
10. **Member expiry** — optional datetime, represents Discord access expiry

---

## Data Transformations (Frontend → Backend)

| Field | Transformation |
|---|---|
| `course_id` | `.trim().toUpperCase().replace(/\s+/g, "-")` |
| `price` | `parseFloat(form.price) \|\| 0` |
| `features` | `.map(f => f.trim()).filter(Boolean)` — max 4 |
| `category` | `.trim()` with default `"General"` |
| `difficulty` | Select: Beginner / Intermediate / Advanced / Master |
| `lecturer` | `.trim()` with default `"TBA"` |
| `duration_months` | `parseInt(form.duration) \|\| 1` |
| `scheduled_at` | ISO datetime string or null |
| `image` | Base64 data-URL string or empty string |
| `course_thumbnail` | Base64 data-URL string or empty string |
| `long_description` | `.trim()` or null |

---

## Stat Cards (Academy Main View)

| Card | Computation |
|---|---|
| Upcoming | `courses.filter(c => c.status === "upcoming").length` |
| On-Going | `courses.filter(c => c.status === "ongoing").length` |
| Completed | `courses.filter(c => c.status === "completed").length` |

---

## Stat Cards (Enrolled Members Page)

| Card | Computation |
|---|---|
| Total Members | `members.filter(m => m.courseId === course.id).length` |
| Paid Access | `.filter(m => m.accessType === "paid").length` |
| Free Access | `.filter(m => m.accessType === "free").length` |
| With Discord | `.filter(m => m.discordid).length` |

---

## Academy Table Columns (Upcoming/On-Going/Completed)

| Column | Field | Display |
|---|---|---|
| # | Computed index | — |
| Course | Thumbnail + title + course_id | — |
| Category | Badge | — |
| Difficulty | Badge | — |
| Duration | `"{duration_months} Month(s)"` | — |
| Price | formatCurrency (INR) | ₹ |
| Lecturer | Plain text | — |
| Enrolled | purchased_count badge | — |
| Action | Edit + Launch Lessons + Enrolled Members | — |

---

## Lessons Table Columns

| Column | Field | Display |
|---|---|---|
| # | Computed index | — |
| Lesson | title + link (truncated) | — |
| Type | Badge (YouTube/Zoom/Meet) | Colored badge |
| Start Date & Time | `lesson.startTime` | CalendarClock icon + formatted datetime |
| Duration | `lesson.duration` | Plain text |
| Published | `lesson.addedAt` | formatDate |
| Action | Edit + Open link + Remove | Dropdown menu |

---

## Members Table Columns (Enrolled Members + Lessons Manage)

| Column | Field | Display |
|---|---|---|
| # | Computed index | — |
| Client | Avatar initial + name + @username | — |
| Email | Mail icon + email | — |
| Discord | discord_user_id (from users) | Badge |
| Discord Expiry | `m.discordExpiry` | Calendar icon + date |
| Access | Free/Paid badge | Colored badge |
| Joined | `m.joinedAt` | formatDate |
| Action | Edit Discord expiry button | — |

---

## Frontend Component Mapping

| Component | Data Source | API Endpoints Needed |
|---|---|---|
| `academy-view.tsx` | `useAcademyStore.courses` | `GET /api/admin/courses` |
| `course-form-dialog.tsx` | Form → store | `POST /api/admin/courses`, `PUT /api/admin/courses/:course_id` |
| `upcoming-courses-table.tsx` | Filtered courses | — |
| `ongoing-courses-table.tsx` | Filtered courses | — |
| `completed-courses-table.tsx` | Filtered courses | — |
| `enrolled-members-view.tsx` | `useAcademyStore.members` | `GET /api/admin/courses/:course_id/members`, `POST /api/admin/courses/:course_id/members`, `PATCH /api/admin/courses/members/:member_id` |
| `lessons-manage-view.tsx` | `useAcademyStore.lessons` + `members` | `GET /api/admin/courses/:course_id/lessons`, `POST /api/admin/courses/:course_id/lessons`, `PUT /api/admin/lessons/:lesson_id`, `DELETE /api/admin/lessons/:lesson_id` |

---

## Frontend Integration Status

### Currently Wired to Real API ✅
- `GET /users/search?q=` — user search for member enrolment

### Store-Only (No API) ❌
- Course create/edit — `addCourse()`, `updateCourse()` in zustand store only
- Course delete — `removeCourse()` in store only
- Lesson create — `addLesson()` in store only
- Lesson edit — `useAcademyStore.setState()` directly
- Lesson delete — `removeLesson()` in store only
- Member enrolment — `addMember()` with `setTimeout` fake delay
- Discord expiry edit — `useAcademyStore.setState()` directly
- Page data loading — components read from zustand store, no `useEffect` + `fetchWithAuth`

### Issues to Fix for Backend Integration
1. Zustand store actions need to call real API instead of `set()` only
2. `addCourse()` → `POST /api/admin/courses`
3. `updateCourse()` → `PUT /api/admin/courses/:course_id`
4. `removeCourse()` → `DELETE /api/admin/courses/:course_id`
5. `addLesson()` → `POST /api/admin/courses/:course_id/lessons`
6. Lesson edit → `PUT /api/admin/lessons/:lesson_id`
7. `removeLesson()` → `DELETE /api/admin/lessons/:lesson_id`
8. `addMember()` → `POST /api/admin/courses/:course_id/members`
9. Discord expiry edit → `PATCH /api/admin/courses/members/:member_id`
10. Page data loading — components need `useEffect` + `fetchWithAuth` to load courses/lessons/members from API on mount

---

## Enrolment Flow (Admin adds member)

1. Admin opens Enrolled Members for a course
2. Admin clicks "Add Client"
3. Admin searches `@username` → `GET /users/search?q=@john`
4. Admin selects user from results
5. Admin picks Access Type (Free or Paid)
6. If Paid: Admin enters Amount (₹) and selects Payment Method
7. Admin clicks "Enrol Client"
8. **Frontend calls**: `POST /api/admin/courses/:course_id/members`
   - Body: `{ username, expiry?, amount, method }`
9. **Backend does**:
   - Validates user exists
   - Validates course exists
   - Creates `course_members` row (upsert on username+course_id)
   - Creates `transactions` row (section="Course", amount=4999, method="UPI")
   - Increments `courses.purchased_count`
10. **Frontend updates** store and shows success toast

---

## Mark Course Completed Flow

1. Admin clicks "Mark Completed" on a course row
2. **Frontend calls**: `PUT /api/admin/courses/:course_id`
   - Body: `{ completed_at: "2025-06-20T12:00:00Z" }`
3. **Backend sets** `completed_at` column → course status auto-changes to "completed"
4. Frontend refreshes course list

---

## Course Filtering (Portal / User-facing)

Courses shown to users must be filtered:
- Only show courses where `scheduled_at > NOW() + 5 minutes`
- This is handled by `GET /api/admin/courses` (backend) or client-side filter
- Portal library shows only purchased courses with details from `GET /my-library`

---

## Transaction Record (Created on Enrolment)

Every course member enrolment creates a Transaction:

| Field | Value |
|---|---|
| `username` | Enrolled user's username |
| `product_section` | `"Course"` |
| `course_id` | Course's course_id string |
| `indicator_id` | NULL |
| `bot_id` | NULL |
| `expiry` | Member's expiry datetime |
| `amount` | Product price if paid, 0 if free |
| `method` | Admin-selected (Card/UPI/Bank Transfer/Crypto/Free/Other) |
| `status` | `"completed"` |
