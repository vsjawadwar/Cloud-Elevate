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
11. [Full Testing Checklist](#11-full-testing-checklist)

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
| Email | Nodemailer via Gmail |
| Frontend Hosting | Vercel |
| Backend Hosting | Railway |
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
      └── Gmail SMTP           (all email notifications)
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
| `GMAIL_USER` | thecloudelevate@gmail.com |
| `GMAIL_APP_PASSWORD` | Gmail App Password (16-char) |
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
- Progress saved automatically every 10 seconds while watching
- Lesson marked complete when watched 80%+ of video
- Sidebar updates in real time — checkmarks appear on completed lessons
- Progress bar at top of sidebar updates

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

All emails sent from: `thecloudelevate@gmail.com`
All emails include: Individual Use warning, watermark notice, support email

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
  - http://localhost:3000 (development)

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

## 11. Full Testing Checklist

### Guest / Public
- [ ] Landing page loads at thecloudelevate.in
- [ ] HTTPS padlock shown (SSL active)
- [ ] Dark/light mode toggle works
- [ ] Navbar logo and tagline correct
- [ ] Courses page loads and shows all courses
- [ ] Search bar filters courses in real time
- [ ] Course detail shows curriculum, price, features
- [ ] Free preview lessons marked correctly
- [ ] Enroll Now → redirects to login (not logged in)

### Registration
- [ ] Register with all 4 fields → success
- [ ] Welcome email received within 1 minute
- [ ] Try registering with same email → error shown
- [ ] Try submitting with missing field → validation error

### Login
- [ ] Login with correct credentials → dashboard
- [ ] Login with wrong password → error
- [ ] Forgot Password link visible on login page
- [ ] Stay logged in after page refresh

### Forgot Password
- [ ] Click Forgot Password → step 1 shown
- [ ] Enter email → OTP email received
- [ ] Enter correct OTP → step 3 shown
- [ ] Enter wrong OTP → error shown
- [ ] Set new password → redirected to login
- [ ] Login with new password → works

### Dashboard
- [ ] Shows enrolled courses with progress
- [ ] Progress bar matches lessons completed
- [ ] Start / Continue / Review buttons correct
- [ ] Certificate button shows when 100% complete

### Payment
- [ ] Click Enroll → checkout page loads
- [ ] Razorpay modal shows "Cloud Elevate" as merchant
- [ ] Complete payment → enrolled and redirected to learn page
- [ ] Student enrollment email received
- [ ] Admin purchase alert email received
- [ ] Course detail now shows "Continue Learning" (no price)

### Learning
- [ ] Video loads and plays
- [ ] Watermark (email) visible on video
- [ ] Watermark moves every 8 seconds
- [ ] Progress saves while watching
- [ ] Lesson marked complete after 80% watched
- [ ] Sidebar checkmark appears on completion
- [ ] Previous / Next buttons navigate correctly
- [ ] Progress bar updates in sidebar

### Quiz
- [ ] Quiz loads with questions
- [ ] Can select and change answers
- [ ] Submit → results page with score
- [ ] Explanations shown for each question

### Certificate
- [ ] Complete all lessons → certificate link appears
- [ ] Certificate page shows correct name and course
- [ ] Course completion email received with certificate link
- [ ] Email certificate link → opens correct certificate

### Profile
- [ ] Profile page loads with correct info
- [ ] Edit name → saves and updates navbar
- [ ] Edit phone → saves successfully
- [ ] Email field is disabled (read-only)

### Admin — Students
- [ ] Admin panel accessible with admin account
- [ ] Student list loads
- [ ] Search filters correctly
- [ ] Green/grey dot shows login status
- [ ] Last Login column shows time and city
- [ ] Click student row → activity panel opens
- [ ] Login history shows device, city, IP, time
- [ ] Suspend button → student gets logged out

### Admin — Courses
- [ ] Courses list loads
- [ ] Create new course → appears in student course list
- [ ] Edit course details → updates on frontend
- [ ] Add module → appears in curriculum
- [ ] Add lesson with video ID → video plays for enrolled students

### Security
- [ ] Login on two devices → first device gets logged out
- [ ] Video URL cannot be replayed after 2 hours
- [ ] Non-admin cannot access /admin → redirected to dashboard
- [ ] Unenrolled student cannot access /learn/:id → redirected

### Emails
- [ ] Welcome email — correct name, 1 year access, T&C warning
- [ ] Enrollment email — correct course name from DB, T&C warning
- [ ] Admin alert — correct student name, course, amount in ₹
- [ ] Module completion — correct module and course name
- [ ] Course completion — certificate link works
- [ ] OTP email — 6-digit OTP, correct formatting

---

*Last updated: May 2026*
*Platform: thecloudelevate.in*
*Support: thecloudelevate@gmail.com*
