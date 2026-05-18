import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import { useThemeStore } from '@/lib/store/themeStore'
import type { Module, Lesson } from '@cloud-elevate/shared'

interface CourseWithModules {
  id: string
  title: string
  modules: (Module & { lessons: Lesson[] })[]
}

function fmtSecs(s: number) {
  const m   = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function CourseLearning() {
  const { courseId }                      = useParams<{ courseId: string }>()
  const navigate                          = useNavigate()
  const { dark, toggle }                  = useThemeStore()
  const { user }                          = useAuthStore()
  const videoRef                          = useRef<HTMLVideoElement>(null)
  const progressTimer                     = useRef<ReturnType<typeof setInterval>>()
  const heartbeatTimer                    = useRef<ReturnType<typeof setInterval>>()

  const [wmPos, setWmPos] = useState({ top: 20, left: 20 })

  const [course, setCourse]               = useState<CourseWithModules | null>(null)
  const [activeLesson, setActiveLesson]   = useState<Lesson | null>(null)
  const [signedUrl, setSignedUrl]         = useState('')
  const [completedIds, setCompletedIds]   = useState<Set<string>>(new Set())
  const [openModule, setOpenModule]       = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen]     = useState(true)
  const [loadingLesson, setLoadingLesson] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/api/courses/${courseId}`),
      api.get(`/api/courses/${courseId}/enrolled`)
    ]).then(([courseRes, enrollRes]) => {
      if (!enrollRes.data.enrolled) { navigate(`/courses/${courseId}`); return }
      const c = courseRes.data.course as CourseWithModules
      setCourse(c)
      setOpenModule(c.modules?.[0]?.id || null)
      const firstLesson = c.modules?.[0]?.lessons?.[0]
      if (firstLesson) loadLesson(firstLesson)
    }).catch(() => navigate('/dashboard'))

    return () => {
      clearInterval(progressTimer.current)
      clearInterval(heartbeatTimer.current)
    }
  }, [courseId])

  useEffect(() => {
    heartbeatTimer.current = setInterval(() => {
      api.post('/api/session/heartbeat').catch(() => {})
    }, 30_000)
    return () => clearInterval(heartbeatTimer.current)
  }, [])

  // Move watermark to a new random position every 8 seconds
  useEffect(() => {
    const move = () => setWmPos({
      top:  10 + Math.random() * 70,
      left: 5  + Math.random() * 60
    })
    const id = setInterval(move, 8_000)
    return () => clearInterval(id)
  }, [])

  const saveProgress = useCallback(async (lessonId: string, completed: boolean) => {
    const watched = Math.floor(videoRef.current?.currentTime || 0)
    try {
      await api.post('/api/progress/save', { lesson_id: lessonId, watched_seconds: watched, completed })
      if (completed) setCompletedIds(s => new Set(s).add(lessonId))
    } catch {}
  }, [])

  const loadLesson = async (lesson: Lesson) => {
    setLoadingLesson(true)
    setActiveLesson(lesson)
    clearInterval(progressTimer.current)
    try {
      const { data } = await api.get(`/api/video/signed-url/${lesson.id}`)
      setSignedUrl(data.signedUrl)
      const { data: prog } = await api.get(`/api/progress/${lesson.id}`)
      if (prog.watched_seconds > 5 && videoRef.current) {
        videoRef.current.currentTime = prog.watched_seconds
      }
      if (prog.completed) setCompletedIds(s => new Set(s).add(lesson.id))
      progressTimer.current = setInterval(() => {
        if (videoRef.current && !videoRef.current.paused) saveProgress(lesson.id, false)
      }, 10_000)
    } catch { setSignedUrl('') }
    finally { setLoadingLesson(false) }
  }

  const onVideoEnded = () => {
    if (activeLesson) saveProgress(activeLesson.id, true)
  }

  if (!course) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 text-gray-400 dark:text-slate-400">
        Loading course…
      </div>
    )
  }

  const allLessons = course.modules.flatMap(m => m.lessons)
  const activeIdx  = allLessons.findIndex(l => l.id === activeLesson?.id)
  const nextLesson = allLessons[activeIdx + 1]
  const prevLesson = allLessons[activeIdx - 1]
  const totalDone  = completedIds.size
  const totalCount = allLessons.length
  const pct        = totalCount ? Math.round((totalDone / totalCount) * 100) : 0

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-slate-950 overflow-hidden">

      {/* ── Thin top bar (no full Navbar) ──────── */}
      <div className="h-14 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center px-4 gap-3 shrink-0 shadow-sm dark:shadow-none">
        {/* Back */}
        <Link to="/dashboard"
          className="p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(s => !s)}
          className="p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Course title */}
        <h1 className="flex-1 text-gray-900 dark:text-white font-semibold text-sm truncate">
          {course.title}
        </h1>

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0"
        >
          {dark ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Previous / Next */}
        <button
          disabled={!prevLesson}
          onClick={() => prevLesson && loadLesson(prevLesson)}
          className="hidden sm:flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>
        <button
          disabled={!nextLesson}
          onClick={() => nextLesson && loadLesson(nextLesson)}
          className="flex items-center gap-1 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg transition-colors font-medium"
        >
          Next
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* ── Progress bar ───────────────────────── */}
      <div className="h-0.5 bg-gray-200 dark:bg-slate-800 shrink-0">
        <div className="h-0.5 bg-blue-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      {/* ── Body: sidebar + video ──────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT Sidebar */}
        {sidebarOpen && (
          <div className="w-80 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 hidden md:flex flex-col shrink-0">
            {/* Progress summary */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{pct}%</span> completed
                </span>
                <span className="text-xs text-gray-400 dark:text-slate-500">{totalDone}/{totalCount}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {/* Module list */}
            <div className="flex-1 overflow-y-auto">
              {course.modules.map((module, mi) => (
                <div key={module.id} className="border-b border-gray-100 dark:border-slate-800">
                  <button
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left"
                    onClick={() => setOpenModule(openModule === module.id ? null : module.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-gray-400 dark:text-slate-600 text-xs font-mono shrink-0">{mi + 1}</span>
                      <span className="text-gray-800 dark:text-slate-200 text-sm font-medium truncate">{module.title}</span>
                    </div>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ml-2 ${openModule === module.id ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {openModule === module.id && module.lessons.map((lesson, li) => {
                    const isActive = lesson.id === activeLesson?.id
                    const isDone   = completedIds.has(lesson.id)
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => loadLesson(lesson)}
                        className={`w-full flex items-start gap-3 px-5 py-3 text-left transition-colors ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-l-2 border-l-blue-500'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-800 border-l-2 border-l-transparent'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 text-xs ${
                          isDone
                            ? 'bg-green-500 border-green-500'
                            : isActive
                              ? 'border-blue-500'
                              : 'border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500'
                        }`}>
                          {isDone ? (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : isActive ? (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          ) : li + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm leading-snug ${
                            isActive ? 'text-blue-700 dark:text-blue-300 font-medium'
                            : isDone  ? 'text-gray-400 dark:text-slate-500'
                                      : 'text-gray-700 dark:text-slate-300'
                          }`}>
                            {lesson.title}
                          </p>
                          <p className="text-gray-400 dark:text-slate-600 text-xs mt-0.5">{fmtSecs(lesson.duration_seconds)}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Certificate link */}
            {pct === 100 && (
              <div className="border-t border-gray-100 dark:border-slate-800 p-4">
                <Link to="/dashboard"
                  className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  Get Certificate
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── Video + content area ───────────────── */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Video — fills all available height */}
          <div className="bg-black flex-1 min-h-0 flex items-center justify-center relative">
            {loadingLesson ? (
              <div className="text-slate-400 animate-pulse text-sm">Loading video…</div>
            ) : signedUrl ? (
              <video
                ref={videoRef}
                key={signedUrl}
                src={signedUrl}
                controls
                className="w-full h-full object-contain"
                onEnded={onVideoEnded}
                autoPlay
              />
            ) : (
              <div className="text-slate-500 text-sm">Select a lesson from the sidebar</div>
            )}

            {/* Floating watermark */}
            {signedUrl && user && (
              <div
                className="pointer-events-none absolute select-none transition-all duration-[2000ms] ease-in-out"
                style={{ top: `${wmPos.top}%`, left: `${wmPos.left}%` }}
              >
                <p className="text-white text-xs font-medium opacity-30 whitespace-nowrap">
                  {user.email}
                </p>
              </div>
            )}
          </div>

          {/* Below video: lesson info */}
          <div className="shrink-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 px-6 py-4">
            <h2 className="text-gray-900 dark:text-white font-semibold text-lg mb-1">
              {activeLesson?.title || 'Select a lesson'}
            </h2>
            {activeLesson?.description && (
              <p className="text-gray-500 dark:text-slate-400 text-sm">{activeLesson.description}</p>
            )}
          </div>

          {/* Chapters / timestamps */}
          {activeLesson?.chapters && activeLesson.chapters.length > 0 && (
            <div className="shrink-0 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 px-6 py-3 flex flex-wrap gap-3">
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-500 self-center">Chapters:</span>
              {activeLesson.chapters.map(ch => (
                <button
                  key={ch.id}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-full transition-colors"
                  onClick={() => { if (videoRef.current) videoRef.current.currentTime = ch.start_seconds }}
                >
                  {fmtSecs(ch.start_seconds)} — {ch.title}
                </button>
              ))}
            </div>
          )}

          {/* Course complete banner */}
          {pct === 100 && (
            <div className="shrink-0 bg-green-50 dark:bg-green-950 border-t border-green-200 dark:border-green-900 px-6 py-3 flex items-center justify-between">
              <span className="text-green-700 dark:text-green-400 text-sm font-medium">
                Course complete! You earned your certificate.
              </span>
              <Link to="/dashboard" className="text-sm text-green-700 dark:text-green-400 hover:text-green-600 font-medium">
                View Certificate →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
