// ─────────────────────────────────────────────
// @cloud-elevate/shared — All shared types
// Used by both frontend and backend
// ─────────────────────────────────────────────

// ── User ──────────────────────────────────────
export interface User {
  id: string
  clerk_id: string
  name: string
  email: string
  phone?: string
  avatar_url?: string
  created_at: string
}

// ── Course ────────────────────────────────────
export interface Course {
  id: string
  title: string
  description: string
  short_description: string
  price: number
  original_price?: number
  thumbnail_url: string
  is_published: boolean
  level: 'beginner' | 'intermediate' | 'advanced'
  language: string
  total_duration_mins: number
  created_at: string
}

// ── Module ────────────────────────────────────
export interface Module {
  id: string
  course_id: string
  title: string
  order: number
  lessons?: Lesson[]
}

// ── Lesson ────────────────────────────────────
export interface Lesson {
  id: string
  module_id: string
  title: string
  description?: string
  video_url: string
  duration_seconds: number
  order: number
  is_preview: boolean       // free preview visible without purchase
  chapters?: Chapter[]
}

export interface Chapter {
  id: string
  lesson_id: string
  title: string
  start_seconds: number
}

// ── Enrollment ────────────────────────────────
export interface Enrollment {
  id: string
  user_id: string
  course_id: string
  payment_id: string
  enrolled_at: string
  course?: Course
}

// ── Progress ──────────────────────────────────
export interface LessonProgress {
  id: string
  user_id: string
  lesson_id: string
  watched_seconds: number
  completed: boolean
  last_watched_at: string
}

export interface CourseProgress {
  course_id: string
  total_lessons: number
  completed_lessons: number
  percentage: number
}

// ── Quiz ──────────────────────────────────────
export interface Quiz {
  id: string
  course_id: string
  title: string
  description?: string
  time_limit_mins: number
  passing_score: number     // percentage e.g. 70
  total_questions: number
  max_attempts: number
}

export interface Question {
  id: string
  quiz_id: string
  question_text: string
  explanation: string       // shown after submit
  order: number
  options: Option[]
}

export interface Option {
  id: string
  question_id: string
  option_text: string
  is_correct: boolean       // only sent to frontend AFTER submission
}

// ── Quiz Attempt ──────────────────────────────
export interface QuizAttempt {
  id: string
  user_id: string
  quiz_id: string
  score: number             // percentage
  passed: boolean
  started_at: string
  submitted_at?: string
  answers?: QuizAnswer[]
}

export interface QuizAnswer {
  id: string
  attempt_id: string
  question_id: string
  selected_option_id: string
}

// ── Payment ───────────────────────────────────
export interface Payment {
  id: string
  user_id: string
  course_id: string
  razorpay_order_id: string
  razorpay_payment_id?: string
  amount: number            // in paise (₹999 = 99900)
  currency: string          // 'INR'
  status: 'created' | 'paid' | 'failed'
  created_at: string
}

// ── Session ───────────────────────────────────
export interface UserSession {
  id: string
  user_id: string
  token: string
  device_info?: string
  ip_address?: string
  city?: string
  is_active: boolean
  last_seen_at: string
  created_at: string
}

// ── API Response wrapper ──────────────────────
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

// ── Razorpay ──────────────────────────────────
export interface RazorpayOrder {
  id: string
  amount: number
  currency: string
  receipt: string
}

export interface RazorpayVerification {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}
