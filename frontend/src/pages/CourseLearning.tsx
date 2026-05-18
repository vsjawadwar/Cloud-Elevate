import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import Navbar from '@/components/Navbar'
import type { Module, Lesson } from '@cloud-elevate/shared'

interface CourseWithModules {
  id: string
  title: string
  modules: (Module & { lessons: Lesson[] })[]
}

function fmtSecs(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function CourseLearning() {
  const { courseId }                      = useParams<{ courseId: string }>()
  const navigate                          = useNavigate()
  const videoRef                          = useRef<HTMLVideoElement>(null)
  const progressTimer                     = useRef<ReturnType<typeof setInterval>>()
  const heartbeatTimer                    = useRef<ReturnType<typeof setInterval>>()

  const [course, setCourse]               = useState<CourseWithModules | null>(null)
  const [activeLesson, setActiveLesson]   = useState<Lesson | null>(null)
  const [signedUrl, setSignedUrl]         = useState('')
  const [completedIds, setCompletedIds]   = useState<Set<string>>(new Set())
  const [openModule, setOpenModule]       = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen]     = useState(true)
  const [loadingLesson, setLoadingLesson] = useState(false)

  // Load course structure and check enrollment
  useEffect(() => {
    Promise.all([
      api.get(`/api/courses/${courseId}`),
      api.get(`/api/courses/${courseId}/enrolled`)
    ]).then(([courseRes, enrollRes]) => {
      if (!enrollRes.data.enrolled) {
        navigate(`/courses/${courseId}`)
        return
      }
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

  // Heartbeat every 30s to validate session
  useEffect(() => {
    heartbeatTimer.current = setInterval(() => {
      api.post('/api/session/heartbeat').catch(() => {})
    }, 30_000)
    return () => clearInterval(heartbeatTimer.current)
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

      // Restore watched position
      const { data: prog } = await api.get(`/api/progress/${lesson.id}`)
      if (prog.watched_seconds > 5 && videoRef.current) {
        videoRef.current.currentTime = prog.watched_seconds
      }
      if (prog.completed) setCompletedIds(s => new Set(s).add(lesson.id))

      // Save progress every 10s
      progressTimer.current = setInterval(() => {
        if (videoRef.current && !videoRef.current.paused) {
          saveProgress(lesson.id, false)
        }
      }, 10_000)
    } catch { setSignedUrl('') }
    finally { setLoadingLesson(false) }
  }

  const onVideoEnded = () => {
    if (activeLesson) saveProgress(activeLesson.id, true)
  }

  if (!course) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-32 text-slate-400">Loading course…</div>
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
    <div className="flex flex-col h-screen bg-slate-950">
      <Navbar />

      {/* Progress bar */}
      <div className="h-1 bg-slate-800">
        <div className="h-1 bg-blue-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-black flex-1 flex items-center justify-center relative">
            {loadingLesson ? (
              <div className="text-slate-400 animate-pulse">Loading video…</div>
            ) : signedUrl ? (
              <video
                ref={videoRef}
                key={signedUrl}
                src={signedUrl}
                controls
                className="w-full h-full max-h-full object-contain"
                onEnded={onVideoEnded}
                autoPlay
              />
            ) : (
              <div className="text-slate-500 text-sm">Select a lesson to begin</div>
            )}
          </div>

          {/* Lesson info + nav */}
          <div className="bg-slate-900 border-t border-slate-800 px-4 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-white font-medium truncate">{activeLesson?.title}</h2>
              {activeLesson?.description && (
                <p className="text-slate-400 text-xs mt-0.5 truncate">{activeLesson.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                disabled={!prevLesson}
                onClick={() => prevLesson && loadLesson(prevLesson)}
                className="btn-secondary !py-1.5 !px-3 text-sm disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                disabled={!nextLesson}
                onClick={() => nextLesson && loadLesson(nextLesson)}
                className="btn-primary !py-1.5 !px-3 text-sm disabled:opacity-40"
              >
                Next →
              </button>
              <button
                onClick={() => setSidebarOpen(s => !s)}
                className="btn-secondary !py-1.5 !px-3 text-sm hidden md:block"
              >
                {sidebarOpen ? 'Hide' : 'Lessons'}
              </button>
            </div>
          </div>

          {/* Chapters */}
          {activeLesson?.chapters && activeLesson.chapters.length > 0 && (
            <div className="bg-slate-950 border-t border-slate-800 px-4 py-2 flex gap-3 overflow-x-auto">
              {activeLesson.chapters.map(ch => (
                <button
                  key={ch.id}
                  className="text-xs text-slate-400 hover:text-blue-400 whitespace-nowrap transition-colors"
                  onClick={() => { if (videoRef.current) videoRef.current.currentTime = ch.start_seconds }}
                >
                  {fmtSecs(ch.start_seconds)} {ch.title}
                </button>
              ))}
            </div>
          )}

          {/* Complete badge */}
          {pct === 100 && (
            <div className="bg-green-950 border-t border-green-900 px-4 py-2 flex items-center justify-between">
              <span className="text-green-400 text-sm font-medium">🎉 Course complete!</span>
              <Link to={`/dashboard`} className="text-green-400 text-sm hover:text-green-300">
                Get Certificate →
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-80 bg-slate-900 border-l border-slate-800 md:flex flex-col hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-white font-semibold text-sm">{course.title}</span>
              <span className="text-slate-400 text-xs">{totalDone}/{totalCount}</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {course.modules.map(module => (
                <div key={module.id}>
                  <button
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-800 transition-colors text-left"
                    onClick={() => setOpenModule(openModule === module.id ? null : module.id)}
                  >
                    <span className="text-slate-300 text-xs font-medium">{module.title}</span>
                    <svg
                      className={`w-3.5 h-3.5 text-slate-500 transition-transform ${openModule === module.id ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {openModule === module.id && module.lessons.map(lesson => {
                    const isActive = lesson.id === activeLesson?.id
                    const isDone   = completedIds.has(lesson.id)
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => loadLesson(lesson)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isActive ? 'bg-blue-950 border-r-2 border-blue-500' : 'hover:bg-slate-800'}`}
                      >
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isDone ? 'bg-green-500 border-green-500' : isActive ? 'border-blue-500' : 'border-slate-600'
                        }`}>
                          {isDone ? (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : isActive ? (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs truncate ${isActive ? 'text-blue-300 font-medium' : isDone ? 'text-slate-400' : 'text-slate-300'}`}>
                            {lesson.title}
                          </p>
                          <p className="text-slate-600 text-xs">{fmtSecs(lesson.duration_seconds)}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
