# Cloud Elevate — Complete Application Guide

> Use this document to understand, test, and verify every feature of the platform.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Architecture Overview](#2-architecture-overview)
3. [Environment Variables](#3-environment-variables)
4. [User Roles](#4-user-roles)
5. [Student Flows](#5-student-flows)
   - 5.1 Registration
   - 5.2 Login & Session
   - 5.3 Forgot Password
   - 5.4 Browse Courses
   - 5.5 Purchase a Course
   - 5.6 Watch Videos
   - 5.7 Track Progress
   - 5.8 Take a Quiz
   - 5.9 Course Completion & Certificate
   - 5.10 Profile Management
6. [Admin Flows](#6-admin-flows)
   - 6.1 Admin Access
   - 6.2 Dashboard Stats
   - 6.3 Manage Students
   - 6.4 Student Activity & Login History
   - 6.5 Manage Courses
   - 6.6 Manage Modules & Lessons
7. [Email Notifications](#7-email-notifications)
8. [Security Features](#8-security-features)
9. [Payment Flow](#9-payment-flow)
10. [Video Hosting](#10-video-hosting)
11. [Pre-Launch Test Plan](#11-pre-launch-test-plan)
12. [Recent Changes (May 2026)](#12-recent-changes-may-2026)
13. [Required Database Tables](#13-required-database-tables)

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + JWT tokens |
| Payments | Razorpay (Live mode) |
| Video CDN | Bunny.net Stream |
| Email | Resend API (transactional) |
| Frontend Hosting | Vercel (with SPA rewrite via `vercel.json`) |
| Backend Hosting | Railway (Dockerfile build, Node 20-alpine) |
| Domain | thecloudelevate.in (GoDaddy → Vercel DNS) |

---

## 2. Architecture Overview

```
Student Browser
      │
      ▼
thecloudelevate.in  (Vercel — React frontend)
      │
      │  API calls (axios)
      ▼
cloud-elevatebackend-production.up.railway.app  (Railway — Express backend)
      │
      ├── Supabase PostgreSQL  (users, courses, enrollments, progress, payments)
      ├── Supabase Auth        (password hashing, session management)
      ├── Razorpay             (payment processing)
      ├── Bunny.net            (video streaming with signed URLs)
      └── Resend               (all transactional emails)
```

---

## 3. Environment Variables

### Railway (Backend)
| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (bypasses RLS) |
| `JWT_SECRET` | Signs auth tokens (min 32 chars) |
| `RAZORPAY_KEY_ID` | Razorpay live key ID (rzp_live_...) |
| `RAZORPAY_KEY_SECRET` | Razorpay live secret |
| `BUNNY_API_KEY` | Bunny.net API key |
| `BUNNY_STORAGE_ZONE` | Bunny storage zone name |
| `BUNNY_CDN_HOSTNAME` | Bunny CDN URL |
| `BUNNY_LIBRARY_ID` | Bunny Stream library ID |
| `BUNNY_STREAM_API_KEY` | Bunny Stream API key |
| `RESEND_API_KEY` | Resend API key (starts with `re_...`) |
| `RESEND_FROM` | From address — e.g. `Cloud Elevate <noreply@thecloudelevate.in>` (domain must be verified in Resend) |
| `ADMIN_EMAIL` | Your email — gets purchase alerts |
| `FRONTEND_URL` | https://thecloudelevate.in |
| `NODE_ENV` | production |
| `PORT` | 4000 |

### Vercel (Frontend)
| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Railway backend URL |
| `VITE_RAZORPAY_KEY_ID` | Razorpay live key ID (same as above) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

---

## 4. User Roles

| Role | Access |
|---|---|
| **Guest** | Landing page, Courses list, Course detail (curriculum only) |
| **Student** | Everything above + Dashboard, enrolled courses, videos, quiz, certificate, profile |
| **Admin** | Everything above + Admin panel (students, courses, stats) |

Admin is determined by `is_admin = true` in the `users` table.
Set via: `ADMIN_EMAIL` env var — anyone who registers with that email gets admin automatically.

---

## 5. Student Flows

### 5.1 Registration

**URL:** `/register`

**Steps:**
1. Student fills: Full Name, Email, Phone, Password
2. All 4 fields are required
3. Backend creates user in Supabase Auth → inserts into `users` table
4. Welcome email sent automatically to student

**What to test:**
- Try submitting with missing fields → should show validation error
- Register with a new email → should redirect to `/login`
- Check inbox → Welcome email should arrive within 1 minute
- Try registering with same email again → should show "User already registered" error

---

### 5.2 Login & Session

**URL:** `/login`

**Steps:**
1. Student enters Email + Password
2. Backend verifies with Supabase Auth
3. All previous sessions for that user are invalidated (single-device enforcement)
4. New session created in `user_sessions` table with device info, IP, city
5. JWT token returned → stored in `localStorage` as `ce_token`
6. Redirected to `/dashboard`

**Single Device Enforcement:**
- If Student A logs in from Phone, then logs in from Laptop → Phone session is immediately invalidated
- On next API call from Phone, gets `SESSION_INVALIDATED` error → auto-logged out with message: *"Someone else logged into your account"*

**What to test:**
- Login with correct credentials → lands on dashboard
- Login with wrong password → shows "Invalid email or password"
- Login on two different browsers → first browser should get logged out on next page action
- Refresh page after login → should stay logged in (token persists)

---

### 5.3 Forgot Password

**URL:** `/forgot-password` (also linked from Login page as "Forgot Password?")

**3-Step Flow:**

**Step 1 — Enter Email**
- Student enters registered email
- Backend generates 6-digit OTP, stores in `password_reset_otps` table (10 min expiry)
- OTP email sent to student

**Step 2 — Enter OTP**
- Student enters 6-digit OTP from email
- Backend verifies: correct OTP + not expired + not already used
- If wrong → "Invalid OTP" error
- If expired → "OTP has expired" error

**Step 3 — Set New Password**
- Student enters new password (min 6 chars) + confirm password
- Backend updates password in Supabase Auth
- OTP marked as `used = true` so it cannot be reused
- Redirected to `/login`

**What to test:**
- Enter unregistered email → no error shown (security — doesn't reveal if email exists)
- Enter registered email → OTP arrives in inbox
- Enter wrong OTP → error shown
- Enter correct OTP → moves to step 3
- Enter mismatched passwords → "Passwords do not match" error
- Complete flow → login with new password works
- Try using same OTP again → "Invalid OTP" error

---

### 5.4 Browse Courses

**URL:** `/courses`

**Features:**
- Lists all published courses (fetched from `courses` table)
- Search bar filters by course title and description in real time
- Each card shows: thumbnail, title, description, price, level badge, total duration
- Clicking a course → goes to `/courses/:id` (Course Detail)

**Course Detail (`/courses/:id`):**
- Shows full course info, language, duration, lesson count
- Curriculum accordion — click module to expand and see lessons
- Free preview lessons marked with "Free Preview" badge
- If not enrolled: shows price + Enroll Now button
- If enrolled: shows "Continue Learning →" button (no price shown)
- If not logged in: "Login to Enroll" button

**What to test:**
- Search "GCP" → filters correctly
- Click course → detail page loads
- Expand module accordion → lessons appear
- As guest: Enroll Now → redirects to login
- As enrolled student: price section hidden, Continue Learning shown

---

### 5.5 Purchase a Course

**URL:** `/checkout/:courseId`

**Flow:**
1. Student clicks "Enroll Now" on Course Detail
2. If not logged in → redirected to `/login` first
3. Checkout page shows: order summary, price breakdown, discount if any
4. Student clicks "Pay ₹XXX"
5. Razorpay modal opens (shows "Cloud Elevate" as merchant name)
6. Student pays via UPI / Card / Net Banking / Wallet
7. On success: backend verifies Razorpay signature → creates enrollment record
8. Student redirected to `/learn/:courseId`

**Emails triggered:**
- Student receives: Enrollment Confirmation email
- Admin receives: Purchase Alert email with student name, course, amount

**What to test:**
- Buy a course → Razorpay modal opens
- Complete payment → redirected to learning page
- Go back to Course Detail → should now show "Continue Learning" (no price)
- Go to Dashboard → course appears in My Courses
- Check student inbox → enrollment email received
- Check admin inbox (thecloudelevate@gmail.com) → purchase alert received
- Try visiting `/checkout/:id` for already-enrolled course → auto-redirects to learn page

---

### 5.6 Watch Videos

**URL:** `/learn/:courseId`

**Layout:**
- Thin top bar: back arrow, hamburger (mobile), course title, dark/light toggle, Prev/Next buttons
- Left sidebar (desktop): progress bar, lesson count, module list with lessons
- Main area: video player (full height), lesson info below

**Video Security:**
- Videos served via **Bunny.net signed URLs** (expire after 2 hours)
- Direct URL sharing won't work after 2 hours
- **Floating watermark**: student's registered email displayed on screen
  - Moves to a new random position every 8 seconds
  - Smooth CSS transition between positions
  - Semi-transparent (opacity 30%) — visible but not blocking
  - `pointer-events: none` — doesn't interfere with video controls

**Progress Tracking:**
- `watched_seconds` saved every 10 seconds while video is playing (not paused)
- Lesson marked **complete** when the video reaches the end (`onEnded` event)
- Sidebar updates in real time — checkmarks appear on completed lessons
- Progress bar at top of sidebar updates
- On reload, video resumes from last saved position (if > 5 seconds in)

**Navigation:**
- Previous / Next buttons in top bar skip between lessons
- Click any lesson in sidebar to jump directly to it
- Completed lessons show green checkmark in sidebar

**What to test:**
- Open a course → video loads and plays
- Watch 80%+ of a lesson → sidebar shows checkmark
- Refresh page → picks up where you left off
- Check watermark → your email should appear and move every 8 seconds
- Click Next → goes to next lesson
- Complete last lesson → progress hits 100% → Certificate link appears in sidebar

---

### 5.7 Track Progress

**URL:** `/dashboard`

**Shows:**
- Stats: Enrolled / In Progress / Completed counts
- Each enrolled course with progress bar and % complete
- Lesson count (e.g. "4/12 lessons")
- Start / Continue / Review button based on progress
- Certificate link appears when course is 100% complete

**What to test:**
- Watch some lessons → progress bar updates on dashboard
- Complete all lessons → shows 100%, Certificate button appears

---

### 5.8 Take a Quiz

**URL:** `/quiz/:quizId`

**Flow:**
1. Quiz linked from within a lesson or module
2. Multiple choice questions, one at a time
3. Student selects answer → can change before submitting
4. On completion → results page at `/quiz/:quizId/result/:attemptId`
5. Results show: score, correct/incorrect breakdown, explanations

**What to test:**
- Open a quiz → questions load
- Answer all questions → submit
- Results page shows score and explanations
- Retake quiz → new attempt recorded

---

### 5.9 Course Completion & Certificate

**URL:** `/certificate/:enrollmentId`

**Triggered when:** All lessons in all modules of a course are completed

**Certificate shows:**
- Student's full name
- Course name
- Completion date
- Cloud Elevate branding
- Unique enrollment ID

**Email triggered:**
- Course Completion email sent with direct certificate link

**What to test:**
- Complete all lessons in a course → certificate link appears in sidebar and dashboard
- Open certificate page → shows correct name and course
- Check inbox → course completion email with certificate link received
- Certificate link in email → opens correct certificate

---

### 5.10 Profile Management

**URL:** `/profile` (accessible from navbar dropdown)

**Features:**
- View: name, email, phone, member since date
- Edit: name and phone number
- Email is read-only (cannot be changed)
- Changes saved to `users` table

**What to test:**
- Change name → save → navbar updates to new name
- Change phone → save → success toast shown
- Try saving with empty name → "Name is required" error

---

## 6. Admin Flows

**URL:** `/admin`

Only accessible if `is_admin = true` in database. Redirects non-admins to dashboard.

### 6.1 Admin Access

Admin is set automatically when registering with the email matching `ADMIN_EMAIL` env var.
To manually make someone admin: update `is_admin = true` in Supabase → `users` table.

---

### 6.2 Dashboard Stats

**URL:** `/admin`

Shows live counts:
- Total Students registered
- Total Enrollments
- Total Revenue (in ₹)

**What to test:**
- Numbers match what you see in Supabase tables
- After a new purchase → revenue updates

---

### 6.3 Manage Students

**URL:** `/admin/students`

**Features:**
- Full list of all non-admin users
- Search by name or email
- Green dot on avatar = active session (currently logged in)
- Grey dot = not logged in
- Last Login column: shows time + city
- Click any row → opens activity panel on right
- Suspend button → invalidates all sessions + marks account suspended

**What to test:**
- Search a student → filters correctly
- Click a student row → activity panel opens
- Suspend a student → they get logged out immediately

---

### 6.4 Student Activity & Login History

**Opened by:** Clicking any student row in Students page

**Activity Panel shows:**
- Student name + email
- Stats: Total Logins, Courses Enrolled, Member Since
- Login History timeline:
  - Each login: Active/Ended badge, time ago, device type, city, IP, exact datetime
  - Green dot = active session, grey = ended

**Device detection examples:**
- Chrome on Mac
- Safari on iPhone
- Android
- Firefox / Windows

**What to test:**
- Login from different devices → each appears in history
- Logout → session shows "Ended" badge
- Login again → new entry at top of timeline

---

### 6.5 Manage Courses

**URL:** `/admin/courses`

**Features:**
- List all courses with title, price, level, status
- Create new course: title, description, short description, price, original price, language, level, thumbnail URL
- Edit existing course details
- Delete course (removes from listing)
- Toggle published/unpublished status

**What to test:**
- Create a course → appears in `/courses` for students
- Edit price → checkout shows updated price
- Unpublish → course disappears from student view

---

### 6.6 Manage Modules & Lessons

**Within Course management:**

**Modules:**
- Add modules to a course (ordered sections)
- Each module has: title, order position

**Lessons:**
- Add lessons to a module
- Each lesson has: title, Bunny.net video ID, duration, is_preview flag
- `is_preview = true` → students can watch without purchasing (Free Preview badge)

**What to test:**
- Add a module → appears in course curriculum
- Add a lesson with Bunny video ID → video plays in learning page
- Mark lesson as preview → Free Preview badge shows on course detail

---

## 7. Email Notifications

Sent via **Resend API**. From address is set by `RESEND_FROM` env var — default `noreply@thecloudelevate.in`. The sending domain must be verified in the Resend dashboard or delivery will silently fail (the call returns success but the email never lands).

All transactional emails include: Individual Use warning, login-credential reminder, watermark notice, suspension warning, and support email. (The "Do not share course content" line was removed in May 2026.)

**Idempotency:** Module and course completion emails are deduplicated via the `completion_emails` table. Each (user, type, ref_id) combination can only insert once, so re-watching a finished lesson will never re-trigger the email.

| Trigger | Recipient | Subject |
|---|---|---|
| New registration | Student | Welcome to Cloud Elevate, [Name]! |
| Course purchased | Student | You're enrolled in [Course]! |
| Course purchased | Admin | New Purchase — ₹[amount] from [Name] |
| Module completed | Student | Module Complete — "[Module]" |
| Course completed | Student | You completed "[Course]" — Claim your certificate! |
| Forgot password | Student | Your Password Reset OTP — Cloud Elevate |

**OTP details:** 6 digits, expires in 10 minutes, single use only.

---

## 8. Security Features

### Single Device Login
- Only one active session per user at any time
- Logging in from a new device immediately invalidates all previous sessions
- Previous device gets SESSION_INVALIDATED error on next API call → auto logout

### Video Watermark
- Student's registered email overlaid on every video
- Moves to a random position every 8 seconds (smooth transition)
- Semi-transparent so it's visible but not blocking
- Cannot be clicked or interacted with (`pointer-events: none`)
- Purpose: if content is leaked/recorded, the source account can be identified

### Signed Video URLs
- Bunny.net video URLs are signed and expire after 2 hours
- Direct URL cannot be shared and reused
- Every page load generates a fresh signed URL

### OTP Security
- OTPs are single use — cannot be reused after password reset
- OTPs expire in 10 minutes
- Requesting new OTP invalidates previous one
- Wrong email shows same success message (doesn't reveal if email is registered)

### CORS Protection
- Backend only accepts requests from:
  - https://thecloudelevate.in
  - https://www.thecloudelevate.in
  - https://thecloudelevate.com
  - https://www.thecloudelevate.com
  - http://localhost:3000 (development)
  - Plus whatever is in `FRONTEND_URL` env var

### SPA Routing
- The frontend (`frontend/vercel.json`) declares a catch-all rewrite of `/(.*)` → `/index.html`.
- Without this, deep links from emails like `/certificate/:id` or `/learn/:id` would return Vercel's generic 404. With it, React Router handles every path.

---

## 9. Payment Flow

```
Student clicks Enroll
        │
        ▼
POST /api/payments/create-order
  → Checks not already enrolled
  → Fetches course price from DB
  → Creates Razorpay order
  → Saves payment record (status: created)
  → Returns orderId to frontend
        │
        ▼
Razorpay Modal opens in browser
  → Student pays (UPI/Card/Wallet)
  → Razorpay calls handler with:
     razorpay_order_id
     razorpay_payment_id
     razorpay_signature
        │
        ▼
POST /api/payments/verify
  → Verifies HMAC signature (tamper check)
  → Updates payment status to "paid"
  → Creates enrollment record
  → Sends enrollment email to student
  → Sends purchase alert to admin
        │
        ▼
Student redirected to /learn/:courseId
```

**Live Keys:** `rzp_live_...` — real money is charged
**Test Keys:** `rzp_test_...` — no real money, use test cards only

---

## 10. Video Hosting

**Provider:** Bunny.net Stream

**Upload flow (Admin):**
1. Go to Bunny.net → Stream → your Library
2. Upload video file
3. Copy the Video ID (UUID format)
4. In Admin panel → add/edit lesson → paste Video ID

**Playback flow:**
1. Student opens a lesson
2. Backend calls Bunny Stream API to get signed URL (2hr expiry)
3. Signed URL returned to frontend
4. Video plays via iframe embed or direct URL

**CDN:** Videos served from Bunny CDN — fast loading across India

---

## 11. Pre-Launch Test Plan

> Use this plan end-to-end before announcing to your college. Order matters — earlier sections set up data later sections rely on. Allow ~2 hours for a complete pass.

### 11.0 — Before You Start

**Browsers & devices to test on (minimum):**
- Desktop: Chrome (latest) + Safari (or Firefox)
- Mobile: at least one Android (Chrome) and one iPhone (Safari)
- Slow network: use Chrome DevTools → Network → "Slow 4G" for at least one full flow

**Test accounts to create (pre-launch):**
| Account | Email | Purpose |
|---|---|---|
| Admin | the email matching `ADMIN_EMAIL` env var | Full admin access |
| Student-A | studentA-test@yourgmail+test1.com | Will buy a course end-to-end |
| Student-B | studentB-test@yourgmail+test2.com | Will trigger single-device kick |
| Suspended | studentC-test@yourgmail+test3.com | To test suspension flow |

> Gmail trick: `youraddress+anything@gmail.com` all land in the same inbox — use `+test1`, `+test2` etc. for distinct test users without making new accounts.

**Razorpay mode for this round:**
- If `RAZORPAY_KEY_ID` starts with `rzp_test_` → safe, use test instruments below
- If it starts with `rzp_live_` → **real money is charged**. Either switch to test keys for this pass, or use a ₹1 throwaway test course

**Resend status check (do first):**
- Open Resend → **Domains** — `thecloudelevate.in` should be **Verified** (green). If not, no emails will land.
- Open Resend → **Logs** — leave open in a tab so you can watch each send in real time

---

### 11.1 — 5-Minute Smoke Test (do this first)

If any of these break, stop and fix before deeper testing.

1. Open `https://thecloudelevate.in` → landing page loads, no console errors
2. Open `https://cloud-elevatebackend-production.up.railway.app/health` → returns `{"status":"ok",...}`
3. In an **incognito** window, visit `https://thecloudelevate.in/certificate/anything` directly → you should land on the React app (the login redirect or a certificate page), **not** a Vercel 404 page. This confirms `vercel.json` is deployed.
4. Visit `/courses` → at least one published course shows
5. Click a course → detail page loads with curriculum

If 1-5 all pass, continue.

---

### 11.2 — Guest / Public Pages

| # | Action | Expected |
|---|---|---|
| G1 | Open `/` in incognito | Landing renders, HTTPS padlock, favicon shows in tab |
| G2 | Toggle dark/light mode | Theme switches, persists on reload |
| G3 | Resize window to mobile (≤640px) | Layout reflows, no horizontal scroll |
| G4 | Open `/courses` | All published courses listed; search box visible |
| G5 | Type a partial course title in search | List filters live (no submit needed) |
| G6 | Click a course card | `/courses/:id` loads; price, level, language, duration all show |
| G7 | Expand a module in the curriculum | Lessons appear; "Free Preview" badge on `is_preview` lessons |
| G8 | Click **Enroll Now** while logged out | Redirects to `/login` |
| G9 | Try a free preview lesson video | Video plays (no enrollment required) |

---

### 11.3 — Registration

| # | Action | Expected |
|---|---|---|
| R1 | Visit `/register`, submit with one field blank | Inline validation; form does not submit |
| R2 | Submit with valid name/email/phone/password (Student-A) | Success → redirected to `/login` |
| R3 | Check Student-A inbox within 1 minute | Welcome email arrives, correct first name, "Browse Courses" button links to `/courses` |
| R4 | Try registering Student-A again | Server returns "User already registered" |
| R5 | In Supabase → `users` table | Row exists for Student-A with `is_admin=false`, `is_suspended=false` |
| R6 | Repeat R2-R3 for Student-B and Student-C | Three test users created |

---

### 11.4 — Login & Single-Device Enforcement

| # | Action | Expected |
|---|---|---|
| L1 | `/login` with wrong password | "Invalid email or password" |
| L2 | `/login` with correct credentials (Student-A) | Lands on `/dashboard`, navbar shows Student-A name |
| L3 | Reload `/dashboard` | Still logged in (token persists in `ce_token`) |
| L4 | In a **different browser** (or incognito), log in as Student-A | New session starts |
| L5 | Go back to first browser, click any link or wait ~30s | Auto-logout with toast: "Someone else logged into your account" |
| L6 | In Supabase → `user_sessions` for Student-A | Only one row with `is_active=true` |
| L7 | Click "Logout" from navbar | Returns to landing, session marked `is_active=false` in DB |

---

### 11.5 — Forgot Password

| # | Action | Expected |
|---|---|---|
| F1 | `/forgot-password`, enter an **unregistered** email | Shows "If this email is registered, an OTP has been sent." (security — no info leak) |
| F2 | Enter Student-A's email | Same success message; check inbox for OTP email within 1 minute |
| F3 | In Supabase → `password_reset_otps` | New row for Student-A's email, `used=false`, `expires_at` ~10 min in future |
| F4 | Enter a wrong 6-digit OTP | "Invalid OTP. Please check and try again." |
| F5 | Enter the correct OTP | Moves to Step 3 (new password) |
| F6 | Set mismatched passwords | "Passwords do not match" |
| F7 | Set valid new password (≥6 chars) | "Password reset successfully" → redirects to `/login` |
| F8 | Try the same OTP again from a new browser tab | "Invalid or expired OTP" (`used=true` now) |
| F9 | Log in with the new password | Works |
| F10 | Wait 11 minutes, request a fresh OTP, then try entering it | If wait > 10 min, "OTP has expired" — repeat F2 |

---

### 11.6 — Browse → Enroll → Payment

Use **Razorpay test mode** (`rzp_test_...` keys) for this section unless you intentionally want a live charge.

**Razorpay test instruments:**
- UPI: `success@razorpay` (auto-succeeds), `failure@razorpay` (auto-fails)
- Card: `4111 1111 1111 1111`, any future expiry, any CVV, OTP `1234`
- Netbanking: any bank → "Success" button

| # | Action | Expected |
|---|---|---|
| P1 | As Student-A, open a course detail page | "Enroll Now" button visible |
| P2 | Click Enroll | Lands on `/checkout/:courseId` with price breakdown |
| P3 | Click "Pay ₹XXX" | Razorpay modal opens, merchant name = "Cloud Elevate" |
| P4 | Complete payment with test UPI/card | Modal closes, success toast, redirect to `/learn/:courseId` |
| P5 | Check Supabase `payments` | New row, `status='paid'`, `razorpay_payment_id` set |
| P6 | Check Supabase `enrollments` | New row for (Student-A, course) |
| P7 | Student-A inbox | "You're enrolled in [Course]!" email received |
| P8 | Admin inbox (`ADMIN_EMAIL`) | "New Purchase — ₹X from [Student-A]" alert received |
| P9 | Go back to course detail page | Price section is hidden, "Continue Learning →" shown |
| P10 | Try visiting `/checkout/:courseId` again | Auto-redirects to `/learn/:courseId` (no double-charge) |
| P11 | Try the failure UPI (`failure@razorpay`) on a 2nd course | Razorpay modal shows failure; no enrollment created |
| P12 | Network DevTools open during success: inspect `POST /api/payments/verify` | Returns 200 with `success: true` |

**Refund / dispute handling:** Not built in — handled out-of-band via Razorpay dashboard. Make a note in your launch comms.

---

### 11.7 — Watch Videos & Track Progress

| # | Action | Expected |
|---|---|---|
| V1 | Open `/learn/:courseId` as Student-A | Sidebar shows modules + lessons; first lesson auto-selected |
| V2 | Press play | Video streams from Bunny (check Network tab — URL contains a signed token) |
| V3 | Watch ~30 seconds, then reload page | Video resumes near where you left off (any position > 5s) |
| V4 | Observe watermark | Student-A's email visible, semi-transparent, repositions roughly every 8s |
| V5 | Try to right-click / select watermark | Cannot interact (CSS `pointer-events: none`) |
| V6 | Let video play to the end (or seek to ~last 5s) | `onEnded` fires → green checkmark appears on lesson in sidebar |
| V7 | Click Next → finish each lesson of a module | When the LAST lesson in a module completes, Student-A receives "Module Complete" email |
| V8 | **Re-watch** a lesson that's already complete to the end again | **No duplicate email** (dedup via `completion_emails` table) |
| V9 | Complete ALL lessons in ALL modules of the course | Student-A receives "Course Completed" email with certificate link |
| V10 | Check `completion_emails` in Supabase | One row per (user, 'module', module_id), one per (user, 'course', course_id) — no duplicates |
| V11 | Open the certificate link from V9's email | Loads `/certificate/:enrollmentId`; if logged out, prompts login then loads; **no Vercel 404** |
| V12 | On certificate page, click "Print / Save PDF" | Browser print dialog opens with "Save as PDF" destination |
| V13 | Open `/dashboard` | Course shows 100%, Certificate button visible |

**Heartbeat sanity check:** With Network tab open, you should see `POST /api/session/heartbeat` every 30s while on `/learn/:id`. This keeps the session alive.

---

### 11.8 — Quizzes (if your course has quizzes published)

| # | Action | Expected |
|---|---|---|
| Q1 | Open a quiz link | First question loads |
| Q2 | Select an answer, navigate to next question, come back | Selection persists |
| Q3 | Submit all answers | `/quiz/:quizId/result/:attemptId` shows score |
| Q4 | Each question shows correct/wrong + explanation | Yes |
| Q5 | Retake the quiz | New attempt row in `quiz_attempts` |
| Q6 | Exceed `max_attempts` | Blocked from starting a new attempt |

> If you haven't seeded quizzes yet, this section is optional for v1 launch.

---

### 11.9 — Profile

| # | Action | Expected |
|---|---|---|
| Pr1 | Open `/profile` | Name, email, phone, member-since-date all correct |
| Pr2 | Edit name, save | Toast success; navbar reflects new name |
| Pr3 | Edit phone | Saves |
| Pr4 | Try clearing name and saving | "Name is required" |
| Pr5 | Email field | Disabled / read-only |

---

### 11.10 — Admin Panel

Switch to the admin account.

| # | Action | Expected |
|---|---|---|
| A1 | Non-admin tries `/admin` | Redirected to `/dashboard` |
| A2 | Admin opens `/admin` | Dashboard loads with Total Students / Enrollments / Revenue |
| A3 | Numbers match Supabase row counts | Verify with `select count(*) from users where is_admin=false;` etc. |
| A4 | `/admin/students` lists all non-admin users | Search filters live |
| A5 | Green dot on a currently-logged-in user | Yes |
| A6 | Click a student row | Activity panel opens with login history (device, city, IP) |
| A7 | Click "Suspend" on Student-C | They're immediately logged out; `is_suspended=true` in DB |
| A8 | Student-C tries to log in again | Blocked (suspended) — verify error message |
| A9 | `/admin/courses` lists courses | Create / Edit / Publish toggle work |
| A10 | Create a new course, mark published | Appears at `/courses` for students |
| A11 | Add a module + lesson with a Bunny video ID | Video plays for an enrolled student |
| A12 | Unpublish the new course | Disappears from public `/courses` |

---

### 11.11 — Security Spot-Checks

| # | Action | Expected |
|---|---|---|
| S1 | Copy a video signed URL from Network tab, wait > 2 hours, paste in incognito | Returns 401/403 (URL expired) |
| S2 | As a non-enrolled student, visit `/learn/:id` of a course you didn't buy | Redirected away (not allowed to play) |
| S3 | Try `curl` to `/api/admin/stats` with no Authorization header | 401 |
| S4 | Try `curl` to `/api/admin/stats` with a non-admin JWT | 403 |
| S5 | From browser console at `evil-site.com`, fetch `https://cloud-elevatebackend-production.up.railway.app/api/auth/me` | Blocked by CORS |
| S6 | After password reset, try old OTP again | Rejected (`used=true`) |
| S7 | Right-click on a video → no useful "Save Video As" (Bunny stream is HLS) | Confirms |

---

### 11.12 — Email Delivery Sweep

Open Resend → Logs side-by-side with these checks. Each row should show `delivered` (or `delivery_delayed` then `delivered`).

| Trigger | Expect in Resend Logs |
|---|---|
| Register new user | `Welcome to Cloud Elevate, X!` → delivered |
| Forgot password | `Your Password Reset OTP — Cloud Elevate` → delivered |
| Buy a course | `You're enrolled in X!` (to student) + `New Purchase — ₹X from X` (to admin) — two rows |
| Complete a module | `Module Complete — "X"` → delivered, **once** |
| Re-complete the same module | **No new send** (dedup) |
| Complete the course | `You completed "X" — Claim your certificate!` → delivered, **once** |

**Spam check:** Have at least one tester confirm the emails land in the Primary tab (not Spam/Promotions) in Gmail, Outlook, and Yahoo. If they land in Spam:
- In Resend → Domains, ensure SPF, DKIM, and DMARC are all green.
- Send a few real opens to "warm up" the sender reputation before launch day.

---

### 11.13 — Cross-Browser & Mobile

For each (Chrome desktop, Safari desktop, Chrome Android, Safari iOS):
- Register → login → buy course → watch one video → log out
- No layout breakage, no console errors that block functionality
- Razorpay modal opens correctly
- Watermark visible on video

**Particular mobile checks:**
- Pinch-zoom on video doesn't break layout
- Sidebar opens via hamburger
- Print/Save PDF on certificate — works on desktop; on mobile, fallback may be "Share → Save to Files"

---

### 11.14 — Performance / Load (light)

You don't need a full load test for a college launch, but at least:
- Open `/courses` with DevTools → Lighthouse → Performance score > 70 on desktop
- Time-to-interactive on `/learn/:id` < 3s on a decent connection
- Backend `/health` < 300ms response
- Watch Railway metrics during a small test group — CPU should stay < 50%

If you expect a launch spike (50+ concurrent), consider scaling Railway to a higher plan for the first 24-48 hours.

---

### 11.15 — Go/No-Go Checklist (sign off before announcement)

- [ ] Smoke test (11.1) passes 100%
- [ ] All Resend domain DNS records green (SPF, DKIM, DMARC)
- [ ] `RAZORPAY_KEY_ID` is the correct mode for launch (`rzp_live_...`)
- [ ] Razorpay account has KYC complete; settlements enabled
- [ ] At least one **real** end-to-end purchase tested with a small live amount (e.g. ₹10 throwaway course); refund processed in Razorpay dashboard
- [ ] Test users created in 11.0 are either deleted or marked suspended so they don't pollute live data
- [ ] Course content uploaded, published, video IDs verified
- [ ] Admin can see live revenue/student counts
- [ ] Support email (`thecloudelevate@gmail.com`) is monitored — at least one team member assigned
- [ ] Backup plan: know how to (a) revoke a session, (b) refund a payment, (c) suspend a user, (d) take the site to a maintenance page
- [ ] Railway autodeploy from `main` is working (commit a tiny change, verify it deploys)
- [ ] Vercel autodeploy from `main` is working
- [ ] Supabase has a recent backup (Settings → Database → Backups)

When every box above is ticked, send the announcement.

---

## 12. Recent Changes (May 2026)

These were the production-readiness fixes shipped in May 2026 — listed here so you know what shifted in case you need to roll back or diagnose.

| Date | Change | Why |
|---|---|---|
| 2026-05-21 | Switched Railway build from Nixpacks → Dockerfile (Node 20-alpine) | Resend + supabase-js engine requirements; Nixpacks defaulting to Node 18 |
| 2026-05-21 | Added `start` script to root `package.json` + `startCommand` in `railway.json` | Railway was running `npm start` from workspace root which had no script |
| 2026-05-21 | Replaced startup ASCII banner with a single-line log | Old banner falsely showed `http://localhost:PORT` in Railway logs |
| 2026-05-21 | Forgot password: clean email used in DELETE; `created_at` set on INSERT; verify orders by `expires_at` | Pre-fix, casing differences + null `created_at` caused valid OTPs to be rejected |
| 2026-05-21 | Created `password_reset_otps` table in Supabase | Table was missing — INSERT was silently failing, so verify always failed |
| 2026-05-21 | Removed "Do not share course content with anyone" from email terms block (affects 4 emails: welcome, enrollment, module complete, course complete) | Redundant with the other terms; user request |
| 2026-05-21 | New endpoint `GET /api/courses/enrollments/:enrollmentId/certificate` + simplified `Certificate.tsx` | Old page iterated every published course with N+1 calls; broke when source course was unpublished |
| 2026-05-21 | Added `completion_emails` table + idempotent module/course email sending | Re-watching a finished video re-triggered the completion emails |
| 2026-05-21 | Added `frontend/vercel.json` SPA rewrite | Deep links from emails (`/certificate/:id`, `/learn/:id`) returned Vercel 404 |
| 2026-05-21 | Documented `password_reset_otps` and `completion_emails` in `schema.sql` | Both tables had been created ad-hoc and weren't in source |

---

## 13. Required Database Tables

The full schema lives in `backend/src/db/schema.sql`. If you're spinning up a fresh Supabase project, paste-and-run that file once and you're done.

If you already have a project from before May 2026, you need to add these two tables (the file is up to date now, but legacy projects may be missing them):

```sql
-- Password reset OTPs (forgot-password flow)
create table password_reset_otps (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  otp        text not null,
  used       boolean default false,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
create index idx_password_reset_email on password_reset_otps(email);

-- Completion email dedup (prevents duplicate module/course emails)
create table completion_emails (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type    text not null check (type in ('module','course')),
  ref_id  uuid not null,
  sent_at timestamptz default now(),
  unique(user_id, type, ref_id)
);
```

**How to verify everything is in place:**

```sql
-- All tables — should show 17 rows (15 original + 2 added)
select table_name from information_schema.tables
 where table_schema = 'public' order by table_name;
```

Expected list:
`chapters, completion_emails, courses, enrollments, lesson_progress, lessons, modules, options, password_reset_otps, payments, questions, quiz_answers, quiz_attempts, quizzes, user_sessions, users, video_watch_logs`

---

*Last updated: 2026-05-21*
*Platform: thecloudelevate.in*
*Support: thecloudelevate@gmail.com*
