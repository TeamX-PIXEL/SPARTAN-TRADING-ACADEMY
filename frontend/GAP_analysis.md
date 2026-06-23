# GAP Analysis — Database vs Pipeline Docs

> **Date:** 2026-06-19
> **Status:** Academy ✅ done | Indicators ✅ done | Bots ✅ done | Finance ❌ | Clients ✅

---

## 1. Academy — ✅ DONE

| Table | Status | Changes Made |
|---|---|---|
| `courses` | ✅ Fixed | Added: `long_description`, `image`, `category`, `features`, `duration_months`, `lecturer`, `difficulty`, `scheduled_at`, `status`, `completed_at` |
| `course_chapters` → `lessons` | ✅ Fixed | Renamed table; added: `type`, `link`, `duration`, `start_time`, `added_at` |
| `course_members` | ✅ Created | 7 fields using business keys (`username`, `course_id`) |
| `course_schedule` | ✅ Fixed | `chapter_id` → `lesson_id` |

---

## 2. Indicators — ✅ DONE

### Changes Made
- Renamed columns: `indicator_name`→`title`, `indicator_description`→`description`, `indicator_price`→`price`, `showcase_image`→`image`, `buyers`→`purchased_count`
- Added columns: `indicator_id`, `long_description`, `category`, `features`, `script_type`, `accuracy`, `timeframe`
- Dropped: `expiry_period`, `product_uuid`
- Dropped table: `indicator_users`
- Created table: `indicator_members` (8 fields with business keys)

---

## 3. Bots — ✅ DONE

### Changes Made
- Renamed columns: `bot_name`→`title`, `thumbnail`→`image`
- Dropped columns: `display_name`, `telegram_id`, `product_uuid`
- Added columns: `bot_id`, `long_description`, `category`, `features`, `exchange`, `apy`, `purchased_count`
- Changed `description` from VARCHAR to TEXT
- Created table: `bot_members` (8 fields with business keys)

---

## 4. Finance — ❌ NEEDS WORK

### Current: No transactions table

### Pipeline expects `transactions` (12 fields)
```
id, section, customer_name, item_name, amount, status, method,
course_id, indicator_id, bot_id, user_id, created_at
```

### SQL Needed

```sql
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    section ENUM('academy', 'indicators', 'bot_alerts') NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) DEFAULT 0,
    status ENUM('completed', 'pending', 'refunded') DEFAULT 'completed',
    method ENUM('Card', 'UPI', 'Bank Transfer', 'Crypto', 'Free', 'Other') DEFAULT 'Free',
    course_id VARCHAR(50) NULL,
    indicator_id VARCHAR(64) NULL,
    bot_id VARCHAR(50) NULL,
    username VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_section (section),
    INDEX idx_username (username),
    INDEX idx_created_at (created_at)
);
```

---

## 5. Users — ✅ DONE

| Change | Status |
|---|---|
| Split `client_name` → `firstname` + `lastname` | ✅ Done |
| Keep `UserUUID` | ✅ Kept |
| Schema migration added | ✅ Done |

---

## Summary: All SQL Changes Needed

### Already Applied (schema.sql migrations)
- ✅ courses: added 10 new columns
- ✅ course_chapters → lessons: renamed + added columns
- ✅ course_members: created
- ✅ course_schedule: chapter_id → lesson_id
- ✅ users: added firstname, lastname
- ✅ indicators: renamed 5 columns, added 7, dropped expiry_period + product_uuid
- ✅ indicator_users → indicator_members: dropped + recreated with business keys
- ✅ bots: renamed 2 columns, added 7, dropped display_name + telegram_id + product_uuid
- ✅ bot_members: created

### Remaining (to be applied)
```sql
-- TRANSACTIONS
CREATE TABLE transactions (...); -- see above
```

---

## Remaining Tables (not in pipeline docs)

These tables exist but are not documented in any pipeline. They are part of the batch/scheduling system:

| Table | Purpose |
|---|---|
| `course_waitlist` | User waitlist for courses |
| `batch_template` | Batch creation config per course |
| `batch_list` | Individual batch instances |
| `course_schedule` | Session schedule per batch |
| `course_progress` | User progress per session |
| `purchases` | Payment records (may merge into `transactions`) |

**Decision needed:** Document these in a separate pipeline doc, or merge `purchases` into `transactions`?
