-- ═══════════════════════════════════════════════
-- CLOUD ELEVATE — Complete Database Schema
-- Paste this entire file into Supabase SQL Editor
-- and click "Run"
-- ═══════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Users ────────────────────────────────────────
create table users (
  id            uuid primary key,           -- matches Supabase Auth user id
  name          text not null,
  email         text not null unique,
  phone         text,
  avatar_url    text,
  is_admin      boolean default false,
  is_suspended  boolean default false,
  created_at    timestamptz default now()
);

-- ── Courses ──────────────────────────────────────
create table courses (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null,
  description          text not null,
  short_description    text not null,
  price                int not null,         -- in INR (₹999)
  original_price       int,                  -- for showing strikethrough price
  thumbnail_url        text,
  level                text default 'beginner' check (level in ('beginner','intermediate','advanced')),
  language             text default 'English',
  total_duration_mins  int default 0,
  is_published         boolean default false,
  created_at           timestamptz default now()
);

-- ── Modules ──────────────────────────────────────
create table modules (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid references courses(id) on delete cascade,
  title      text not null,
  "order"    int not null default 0,
  created_at timestamptz default now()
);

-- ── Lessons ──────────────────────────────────────
create table lessons (
  id               uuid primary key default gen_random_uuid(),
  module_id        uuid references modules(id) on delete cascade,
  title            text not null,
  description      text,
  video_url        text not null,
  duration_seconds int not null default 0,
  "order"          int not null default 0,
  is_preview       boolean default false,   -- free preview without purchase
  created_at       timestamptz default now()
);

-- ── Chapters (timestamps inside a lesson) ────────
create table chapters (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid references lessons(id) on delete cascade,
  title         text not null,
  start_seconds int not null
);

-- ── Enrollments ──────────────────────────────────
create table enrollments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete cascade,
  course_id   uuid references courses(id) on delete cascade,
  payment_id  text not null,
  enrolled_at timestamptz default now(),
  unique(user_id, course_id)              -- one enrollment per student per course
);

-- ── Lesson Progress ──────────────────────────────
create table lesson_progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references users(id) on delete cascade,
  lesson_id       uuid references lessons(id) on delete cascade,
  watched_seconds int default 0,
  completed       boolean default false,
  last_watched_at timestamptz default now(),
  unique(user_id, lesson_id)
);

-- ── Payments ─────────────────────────────────────
create table payments (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references users(id) on delete cascade,
  course_id            uuid references courses(id),
  razorpay_order_id    text not null unique,
  razorpay_payment_id  text,
  amount               int not null,        -- in paise (₹999 = 99900)
  currency             text default 'INR',
  status               text default 'created' check (status in ('created','paid','failed')),
  created_at           timestamptz default now()
);

-- ── User Sessions ────────────────────────────────
create table user_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references users(id) on delete cascade,
  device_info  text,
  ip_address   text,
  city         text,
  is_active    boolean default true,
  last_seen_at timestamptz default now(),
  created_at   timestamptz default now()
);

-- ── Video Watch Logs ─────────────────────────────
create table video_watch_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references users(id) on delete cascade,
  lesson_id  uuid references lessons(id),
  session_id uuid references user_sessions(id),
  ip_address text,
  created_at timestamptz default now()
);

-- ── Quizzes ──────────────────────────────────────
create table quizzes (
  id              uuid primary key default gen_random_uuid(),
  course_id       uuid references courses(id) on delete cascade,
  title           text not null,
  description     text,
  time_limit_mins int not null default 60,
  passing_score   int not null default 70,  -- percentage e.g. 70 = 70%
  total_questions int not null default 0,
  max_attempts    int not null default 3,
  created_at      timestamptz default now()
);

-- ── Questions ────────────────────────────────────
create table questions (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid references quizzes(id) on delete cascade,
  question_text text not null,
  explanation   text not null,             -- shown after submission
  "order"       int default 0,
  created_at    timestamptz default now()
);

-- ── Options ──────────────────────────────────────
create table options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id) on delete cascade,
  option_text text not null,
  is_correct  boolean default false
);

-- ── Quiz Attempts ────────────────────────────────
create table quiz_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references users(id) on delete cascade,
  quiz_id      uuid references quizzes(id) on delete cascade,
  score        int,                         -- percentage 0-100
  passed       boolean,
  started_at   timestamptz default now(),
  submitted_at timestamptz
);

-- ── Quiz Answers ─────────────────────────────────
create table quiz_answers (
  id                 uuid primary key default gen_random_uuid(),
  attempt_id         uuid references quiz_attempts(id) on delete cascade,
  question_id        uuid references questions(id),
  selected_option_id uuid references options(id)
);

-- ── Password Reset OTPs ──────────────────────────
create table password_reset_otps (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  otp        text not null,
  used       boolean default false,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- ── Completion Email Dedup ───────────────────────
-- One row per (user, module|course) prevents duplicate completion emails
create table completion_emails (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type    text not null check (type in ('module','course')),
  ref_id  uuid not null,
  sent_at timestamptz default now(),
  unique(user_id, type, ref_id)
);

-- ═══════════════════════════════════════════════
-- INDEXES — for fast queries
-- ═══════════════════════════════════════════════
create index idx_enrollments_user     on enrollments(user_id);
create index idx_enrollments_course   on enrollments(course_id);
create index idx_lesson_progress_user on lesson_progress(user_id);
create index idx_sessions_user        on user_sessions(user_id);
create index idx_sessions_active      on user_sessions(user_id, is_active);
create index idx_watch_logs_user      on video_watch_logs(user_id);
create index idx_watch_logs_lesson    on video_watch_logs(lesson_id);
create index idx_quiz_attempts_user   on quiz_attempts(user_id);
create index idx_questions_quiz       on questions(quiz_id);
create index idx_options_question     on options(question_id);
create index idx_password_reset_email on password_reset_otps(email);

-- ═══════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Users can only access their own data
-- ═══════════════════════════════════════════════
alter table users           enable row level security;
alter table enrollments     enable row level security;
alter table lesson_progress enable row level security;
alter table quiz_attempts   enable row level security;
alter table quiz_answers    enable row level security;
alter table user_sessions   enable row level security;
alter table video_watch_logs enable row level security;

-- Note: We use service role key in backend so RLS is bypassed server-side.
-- These policies protect direct client-side Supabase calls.

create policy "Users can read own data"
  on users for select using (auth.uid() = id);

create policy "Users can read own enrollments"
  on enrollments for select using (auth.uid() = user_id);

create policy "Users can read own progress"
  on lesson_progress for select using (auth.uid() = user_id);

create policy "Users can read own quiz attempts"
  on quiz_attempts for select using (auth.uid() = user_id);
