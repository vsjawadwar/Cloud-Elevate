# ☁️ Cloud Elevate — GCP Certification Course Platform

A full-stack LMS (Learning Management System) built for selling and delivering Google Cloud certification courses.

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + JWT |
| Payments | Razorpay |
| Video | Bunny.net (CDN + Stream) |
| Email | Resend |
| Deploy (FE) | Vercel (SPA rewrite via `frontend/vercel.json`) |
| Deploy (BE) | Railway (Dockerfile, Node 20-alpine) |

## 📁 Project Structure

```
cloud-elevate/
├── frontend/          ← React + Vite app
│   └── src/
│       ├── pages/     ← All page components
│       ├── components/← Reusable UI components
│       ├── lib/       ← Supabase client, API, Zustand store
│       └── hooks/     ← Custom React hooks
│
├── backend/           ← Node.js + Express API
│   └── src/
│       ├── routes/    ← All API routes
│       ├── middleware/ ← Auth, error handling
│       ├── db/        ← Supabase client + SQL schema
│       └── services/  ← Business logic
│
└── shared/            ← TypeScript types shared by both
```

## 🚀 Quick Start

### 1. Clone and install
```bash
git clone https://github.com/yourusername/cloud-elevate.git
cd cloud-elevate
npm install
```

### 2. Set up Supabase
- Go to https://supabase.com and create a new project
- Open SQL Editor and paste + run `backend/src/db/schema.sql`
- Copy your Project URL and keys

### 3. Configure environment variables

**Frontend** — create `frontend/.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:4000
VITE_RAZORPAY_KEY_ID=rzp_test_your_key
```

**Backend** — create `backend/.env`:
```
PORT=4000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-minimum-32-character-secret-key
RAZORPAY_KEY_ID=rzp_test_your_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
BUNNY_API_KEY=your-bunny-api-key
BUNNY_CDN_HOSTNAME=https://cloud-elevate.b-cdn.net
FRONTEND_URL=http://localhost:3000
ADMIN_EMAIL=your-email@gmail.com
```

### 4. Run locally
```bash
# Run both frontend and backend together
npm run dev

# Or separately
npm run dev:frontend   # http://localhost:3000
npm run dev:backend    # http://localhost:4000
```

## 🔑 Key Features

- ✅ Secure video streaming via Bunny.net signed URLs
- ✅ Floating watermark with student name + email on every video
- ✅ Single active session — credential sharing auto-kicks old session
- ✅ Session heartbeat — detects concurrent logins every 30 seconds
- ✅ Resume video playback from where student left off
- ✅ Chapter markers for easy navigation
- ✅ MCQ quiz engine with timer, shuffle, explanations
- ✅ Razorpay payment integration
- ✅ Student progress tracking
- ✅ PDF certificate generation on course completion
- ✅ Admin dashboard with suspicious activity detection

## 📡 API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/auth/register | — | Register new student |
| POST | /api/auth/login | — | Login + create session |
| GET | /api/auth/me | ✅ | Get current user |
| POST | /api/auth/logout | ✅ | Logout + invalidate session |
| GET | /api/courses | — | All published courses |
| GET | /api/courses/:id | — | Course with modules + lessons |
| GET | /api/courses/:id/enrolled | ✅ | Check enrollment status |
| GET | /api/video/signed-url/:lessonId | ✅ | Get secure video URL |
| POST | /api/payments/create-order | ✅ | Create Razorpay order |
| POST | /api/payments/verify | ✅ | Verify payment + enroll |
| POST | /api/progress/save | ✅ | Save lesson progress |
| GET | /api/progress/:lessonId | ✅ | Get lesson progress |
| GET | /api/progress/course/:courseId | ✅ | Get course completion % |
| GET | /api/quiz/:quizId | ✅ | Get quiz + questions |
| POST | /api/quiz/:quizId/start | ✅ | Start quiz attempt |
| POST | /api/quiz/:quizId/submit | ✅ | Submit quiz answers |
| GET | /api/quiz/result/:attemptId | ✅ | Get result + explanations |
| POST | /api/session/heartbeat | ✅ | Keep session alive |
| GET | /api/admin/stats | 👑 | Dashboard stats |
| GET | /api/admin/students | 👑 | All students |
| GET | /api/admin/suspicious | 👑 | Suspicious activity |

## 🚢 Deployment

### Frontend → Vercel
```bash
# Connect GitHub repo to Vercel
# Set root directory: frontend
# Add environment variables in Vercel dashboard
```

### Backend → Railway
```bash
# Connect GitHub repo to Railway
# Build: uses Dockerfile at repo root (multi-stage, Node 20-alpine)
# Start: node backend/dist/index.js (set in railway.json deploy.startCommand)
# Add environment variables in Railway service settings
```
See **APPLICATION_GUIDE.md → Section 3** for the full env-var list.

## 📄 License
Private — Cloud Elevate. All rights reserved.
