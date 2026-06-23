# Settings Client Portal Pipeline

## Page: `/portal/settings` — Profile (TVID, Telegram, Discord), Password Change

---

## 1. USER'S QUESTION ANSWER

> "Telegram and Discord for Chat id like id for only inputs there! we needs username also for input! because backend in we done this like right?"

**YES — The backend already has SEPARATE fields for username and chat ID:**

### Backend User Model
**File:** `backend/app/models/user.py:17-20`
```python
telegram_user_id = Column(String(255), unique=True, nullable=True)  # ← USERNAME
telegram_chat_id = Column(String(255), unique=True, nullable=True)  # ← CHAT ID
discord_user_id = Column(String(255), unique=True, nullable=True)   # ← USERNAME
discord_chat_id = Column(String(255), unique=True, nullable=True)   # ← CHAT ID
```

### Backend UserResponse Schema
**File:** `backend/app/schemas/user.py:27-30`
```python
telegram_user_id: Optional[str] = None
telegram_chat_id: Optional[str] = None
discord_user_id: Optional[str] = None
discord_chat_id: Optional[str] = None
```

### ⚠️ Frontend Problem
The frontend only has **SINGLE fields** for each:
```typescript
// frontend/src/types/portal.ts:43-44
telegramid?: string;   // ← ONE field for everything
discordid?: string;    // ← ONE field for everything
```

### What Needs to Change
The frontend `UserProfile` type and Settings page need **4 separate inputs**:

| Current (Frontend) | Needed (Frontend) | Backend Field |
|---|---|---|
| `telegramid` | `telegram_username` | `telegram_user_id` |
| — | `telegram_chat_id` | `telegram_chat_id` |
| `discordid` | `discord_username` | `discord_user_id` |
| — | `discord_chat_id` | `discord_chat_id` |

---

## 2. PAGE INITIALIZATION FLOW

```
AppProvider (AppContext.tsx)
  ├─ useEffect #1: API.getProfile()           → GET /users/me
  │
  └─ SettingsPage (settings/page.tsx)
       └─ useEffect: loads user from AppContext into local form state
```

### Timeline

| Order | Component | API Call | Backend Endpoint | Purpose |
|-------|-----------|----------|------------------|---------|
| 1 | AppContext | `API.getProfile()` | `GET /users/me` | Load user profile |
| 2 | SettingsPage | (no API call) | — | Populate form fields from `user` |

---

## 3. API CALL #1 — Load Profile

### Request
```
GET /users/me
Authorization: Bearer <token>
```

### Backend Handler
**File:** `backend/app/routers/auth.py:94`
```python
@router.get("/users/me", response_model=UserResponse)
def get_current_user_endpoint(current_user: User = Depends(get_current_user)):
    return current_user
```

### Response
```json
{
  "UserID": "stoic_trader",
  "firstname": "Marcus",
  "lastname": "Aurelius",
  "email": "marcus.a@stoic-trader.com",
  "tvid": "stoic_trader_tv_99",
  "phone_number": "+91-9876543210",
  "telegram_user_id": "stoic_trader",
  "telegram_chat_id": "123456789",
  "discord_user_id": "stoic_discord_99",
  "discord_chat_id": "9876543210",
  "is_verified": true
}
```

### Frontend Storage
```typescript
// AppContext.tsx
setUser(profile);
```

### Form Population
```typescript
// settings/page.tsx:43-54
useEffect(() => {
  if (user) {
    setName(user.name);
    setEmail(user.email);
    setTvid(user.tvid || '');
    setTelegramid(user.telegramid || '');   // ← maps to single field
    setDiscordid(user.discordid || '');     // ← maps to single field
    setFirstname(user.firstname || '');
    setLastname(user.lastname || '');
    setUsername(user.username || '');
  }
}, [user]);
```

---

## 4. API CALL #2 — Save Profile

### Trigger
User clicks "Save Profile Settings" button.

### Handler
```typescript
// settings/page.tsx:56-85
const handleSaveProfile = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!tvid) {
    addToast("TradingView ID represents a mandatory parameter.", "error");
    return;
  }
  await updateUserProfile({
    tvid,
    telegramid,
    discordid,
  });
};
```

### AppContext updateUserProfile
```typescript
// AppContext.tsx:308-316
const updateUserProfile = async (updates: Partial<UserProfile>) => {
  const updated = await API.updateProfile(updates);
  setUser(updated);
};
```

### Frontend API Method
**File:** `frontend/src/portal/api.ts:202`
```typescript
async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    await delay(500);
    const profile = getStoredProfile();
    const updated = { ...profile, ...updates };
    saveProfile(updated);  // ← localStorage
    return updated;
}
```

### ⚠️ Currently MOCK — needs to call real backend

### Backend Endpoint
```
PUT /users/me
Authorization: Bearer <token>
Body: {
  "tvid": "stoic_trader_tv_99",
  "firstname": "Marcus",
  "lastname": "Aurelius"
}
```

### Backend Handler
**File:** `backend/app/routers/users.py:54`
```python
class UserProfileUpdate(BaseModel):
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    tvid: Optional[str] = None

@router.put("/users/me", response_model=UserResponse)
def update_my_profile(
    update: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if update.firstname is not None:
        current_user.firstname = update.firstname
    if update.lastname is not None:
        current_user.lastname = update.lastname
    if update.tvid is not None:
        current_user.tvid = update.tvid
    db.commit()
    db.refresh(current_user)
    return current_user
```

### ⚠️ Critical Issue
The backend `UserProfileUpdate` only accepts `firstname`, `lastname`, `tvid`. It does **NOT** accept:
- `telegram_user_id`
- `telegram_chat_id`
- `discord_user_id`
- `discord_chat_id`

**The backend needs to be updated** to accept these fields.

---

## 5. API CALL #3 — Change Password

### Trigger
User clicks "Validate & Update Password" button.

### Handler
```typescript
// settings/page.tsx:87-111
const handlePasswordChange = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!currentPass || !newPass || !confirmPass) {
    addToast("All password fields are required.", "error");
    return;
  }
  if (newPass !== confirmPass) {
    addToast("New password and confirm password do not match.", "error");
    return;
  }
  const res = await API.changePassword(currentPass, newPass);
  addToast(res.message, "success");
};
```

### Frontend API Method
**File:** `frontend/src/portal/api.ts:211`
```typescript
async changePassword(current: string, newPass: string): Promise<{ success: boolean; message: string }> {
    await delay(600);
    if (!current) throw new Error("Current password is required.");
    if (newPass.length < 6) throw new Error("New password must be at least 6 characters.");
    return { success: true, message: "Security credentials updated successfully." };
    // ← MOCK — just validates locally
}
```

### Backend Endpoint
```
PUT /users/me/password
Authorization: Bearer <token>
Body: {
  "current_password": "oldpass123",
  "new_password": "newpass456"
}
```

### Backend Handler
**File:** `backend/app/routers/users.py:72`
```python
@router.put("/users/me/password")
def change_my_password(
    payload: UserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(payload.current_password, current_user.password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}
```

### Backend Schema
```python
class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str
```

---

## 6. FORM FIELDS

### Locked Fields (Read-Only)
| Field | Value Source | UI State |
|---|---|---|
| Full Name | `user.name` | Disabled, lock icon |
| Secured Email | `user.email` | Disabled, lock icon |
| Mobile Number | Hardcoded `"+1 (555) 0168-912"` | Disabled, lock icon |

### Editable Fields
| Field | State Variable | Backend Field | Notes |
|---|---|---|---|
| TradingView ID (TVID) | `tvid` | `users.tvid` | Disabled once set (locked) |
| Telegram Username / ID | `telegramid` | `users.telegram_user_id` | Disabled once set |
| Discord Username / ID | `discordid` | `users.discord_user_id` | Disabled once set |

### ⚠️ Missing Fields (need to add)
| Field | State Variable | Backend Field |
|---|---|---|
| Telegram Chat ID | (new) `telegramChatId` | `users.telegram_chat_id` |
| Discord Chat ID | (new) `discordChatId` | `users.discord_chat_id` |

---

## 7. TVID LOCKING LOGIC

### Behavior
```typescript
// settings/page.tsx:249
disabled={!!user?.tvid}
```

Once a TVID is set, the input becomes **disabled** (locked). This prevents changing TVID after initial setup.

### UI States
```typescript
// settings/page.tsx:250-256
className={`... ${
  hasTvidError
    ? 'border-red-500 ring-2 ring-red-500/10'          // Error state
    : user?.tvid
      ? 'border-[#1e222b] text-neutral-400 cursor-not-allowed select-none'  // Locked
      : 'border-[#1e222b] text-white focus:border-blue-550'  // Editable
}`}
```

---

## 8. TELEGRAM/DISCORD LOCKING LOGIC

### Behavior
```typescript
// settings/page.tsx:276
disabled={!!user?.telegramid}

// settings/page.tsx:302
disabled={!!user?.discordid}
```

Same as TVID — once set, fields become locked.

### ⚠️ Problem
If we add separate username + chat ID inputs, both should lock together when either is set.

---

## 9. IDENTITY CARD SIDEBAR

### Display
```typescript
// settings/page.tsx:430-465
<div className="bg-[#12151c]/30 border border-[#1e222b] p-6 rounded-2xl">
  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-700 to-indigo-950 ...">
    {(name || user.name || "M").charAt(0).toUpperCase()}
  </div>
  <h5>{firstname || user.firstname} {lastname || user.lastname}</h5>
  <p>@{username || user.username}</p>
  
  <div className="font-mono text-[11px]">
    <div>Database TVID: @{tvid || user.tvid}</div>
    <div>Telegram Contact: @{telegramid}</div>
    <div>Discord ID: @{discordid || user.discordid}</div>
  </div>
</div>
```

---

## 10. BACKEND ENDPOINTS SUMMARY

### ✅ Already Exist

| Endpoint | Method | Auth | File | Purpose |
|---|---|---|---|---|
| `GET /users/me` | GET | User | `auth.py:94` | Load profile |
| `PUT /users/me` | PUT | User | `users.py:54` | Update profile (⚠️ limited fields) |
| `PUT /users/me/password` | PUT | User | `users.py:72` | Change password |

### ⚠️ Needs Enhancement

| Endpoint | Method | Issue | Fix Needed |
|---|---|---|---|
| `PUT /users/me` | PUT | Only accepts `firstname`, `lastname`, `tvid` | Add `telegram_user_id`, `telegram_chat_id`, `discord_user_id`, `discord_chat_id` |

### ❌ Frontend MOCK to Rewrite

| File | Function | Current (MOCK) | Target (Real) |
|---|---|---|---|
| `portal/api.ts:197` | `getProfile()` | `localStorage` | `GET /users/me` |
| `portal/api.ts:202` | `updateProfile()` | `localStorage` | `PUT /users/me` |
| `portal/api.ts:211` | `changePassword()` | Local validation only | `PUT /users/me/password` |

---

## 11. COMPLETE DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│                       SETTINGS PAGE LOAD                            │
└─────────────────────────────────────────────────────────────────────┘

  Browser                              Backend                      Database
    │                                      │                            │
    │  GET /users/me                       │                            │
    │─────────────────────────────────────>│  SELECT * FROM users       │
    │                                      │  WHERE username = token    │
    │                                      │───────────────────────────>│
    │  { UserID: "stoic_trader",           │                            │
    │    firstname: "Marcus",              │                            │
    │    lastname: "Aurelius",             │                            │
    │    email: "marcus.a@...",            │                            │
    │    tvid: "stoic_trader_tv_99",       │                            │
    │    telegram_user_id: "stoic_trader", │                            │
    │    telegram_chat_id: "123456789",    │                            │
    │    discord_user_id: "stoic_discord", │                            │
    │    discord_chat_id: "9876543210" }   │                            │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  ┌──────────────────────────────────────────────────────┐        │
    │  │ POPULATE FORM FIELDS:                                │        │
    │  │  name = "Marcus Aurelius"  (locked)                  │        │
    │  │  email = "marcus.a@..."    (locked)                  │        │
    │  │  tvid = "stoic_trader_tv_99"                         │        │
    │  │  telegramid = "stoic_trader"                         │        │
    │  │  discordid = "stoic_discord"                         │        │
    │  └──────────────────────────────────────────────────────┘        │
    │                                      │                            │
    │  (user edits fields & clicks "Save Profile Settings")           │
    │                                      │                            │
    │  PUT /users/me                       │                            │
    │─────────────────────────────────────>│  UPDATE users SET          │
    │  { tvid: "...",                      │  tvid = ...,               │
    │    telegramid: "...",                │  telegram_user_id = ...,   │
    │    discordid: "..." }                │  telegram_chat_id = ...,   │
    │  ⚠️ NEEDS BACKEND UPDATE             │  discord_user_id = ...,    │
    │                                      │  discord_chat_id = ...     │
    │                                      │───────────────────────────>│
    │  { updated user }                    │                            │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  (user changes password)             │                            │
    │                                      │                            │
    │  PUT /users/me/password              │                            │
    │─────────────────────────────────────>│  Verify current password   │
    │  { current_password: "...",          │  Hash new password         │
    │    new_password: "..." }             │  UPDATE users SET          │
    │                                      │───────────────────────────>│
    │  { message: "Password updated" }     │                            │
    │<─────────────────────────────────────│                            │
```

---

## 12. PROPOSED BACKEND UPDATE

### Enhanced `PUT /users/me`

```python
class UserProfileUpdate(BaseModel):
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    tvid: Optional[str] = None
    telegram_user_id: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    discord_user_id: Optional[str] = None
    discord_chat_id: Optional[str] = None

@router.put("/users/me", response_model=UserResponse)
def update_my_profile(
    update: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if update.firstname is not None:
        current_user.firstname = update.firstname
    if update.lastname is not None:
        current_user.lastname = update.lastname
    if update.tvid is not None:
        current_user.tvid = update.tvid
    if update.telegram_user_id is not None:
        current_user.telegram_user_id = update.telegram_user_id
    if update.telegram_chat_id is not None:
        current_user.telegram_chat_id = update.telegram_chat_id
    if update.discord_user_id is not None:
        current_user.discord_user_id = update.discord_user_id
    if update.discord_chat_id is not None:
        current_user.discord_chat_id = update.discord_chat_id
    db.commit()
    db.refresh(current_user)
    return current_user
```

---

## 13. PROPOSED FRONTEND UPDATES

### Updated `UserProfile` Type
```typescript
export interface UserProfile {
  id: number;
  name: string;
  email: string;
  avatar: string;
  tvid: string;
  telegram_username?: string;   // ← renamed from telegramid
  telegram_chat_id?: string;    // ← NEW
  discord_username?: string;    // ← renamed from discordid
  discord_chat_id?: string;     // ← NEW
  firstname?: string;
  lastname?: string;
  username?: string;
  phone_number?: string;
  notificationsEnabled: boolean;
  marketingEmails: boolean;
  compactMode: boolean;
  themeColor: string;
}
```

### Updated Settings Form Fields
```tsx
{/* Telegram Section */}
<div className="grid grid-cols-2 gap-4">
  <div>
    <label>Telegram Username</label>
    <input value={telegramUsername} onChange={...} placeholder="@username" />
  </div>
  <div>
    <label>Telegram Chat ID</label>
    <input value={telegramChatId} onChange={...} placeholder="123456789" />
  </div>
</div>

{/* Discord Section */}
<div className="grid grid-cols-2 gap-4">
  <div>
    <label>Discord Username</label>
    <input value={discordUsername} onChange={...} placeholder="@discord_user" />
  </div>
  <div>
    <label>Discord Chat ID</label>
    <input value={discordChatId} onChange={...} placeholder="9876543210" />
  </div>
</div>
```

### Updated Save Handler
```typescript
const handleSaveProfile = async (e: React.FormEvent) => {
  await updateUserProfile({
    tvid,
    telegram_username: telegramUsername,
    telegram_chat_id: telegramChatId,
    discord_username: discordUsername,
    discord_chat_id: discordChatId,
  });
};
```

---

## 14. REMAINING MOCK CALLS TO REWRITE

| File | Function | Current (MOCK) | Target (Real) |
|---|---|---|---|
| `portal/api.ts:197` | `getProfile()` | `localStorage` | `GET /users/me` |
| `portal/api.ts:202` | `updateProfile()` | `localStorage` | `PUT /users/me` |
| `portal/api.ts:211` | `changePassword()` | Local validation | `PUT /users/me/password` |

---

## 15. INCONSISTENCIES TO FIX

| Issue | Location | Problem |
|---|---|---|
| **Single Telegram/Discord field** | `portal.ts:43-44` | Frontend has `telegramid`/`discordid` but backend has 4 fields |
| **Backend update missing fields** | `users.py:24-28` | `UserProfileUpdate` doesn't accept Telegram/Discord fields |
| **Mobile number hardcoded** | `settings/page.tsx:19` | `"+1 (555) 0168-912"` — should come from `user.phone_number` |
| **TVID locking** | `settings/page.tsx:249` | Locks after first save — consider allowing admin unlock |
| **Profile MOCK** | `api.ts:197-208` | `getProfile()` and `updateProfile()` use localStorage |
| **Password MOCK** | `api.ts:211-221` | `changePassword()` is local-only, doesn't call backend |
