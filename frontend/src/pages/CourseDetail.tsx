import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import Navbar from '@/components/Navbar'
import type { Course, Module } from '@cloud-elevate/shared'

function fmtDuration(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function CourseDetail() {
  const { id }                      = useParams<{ id: string }>()
  const { user }                    = useAuthStore()
  const navigate                    = useNavigate()
  const [course, setCourse]         = useState<(Course & { modules: Module[] }) | null>(null)
  const [enrolled, setEnrolled]     = useState(false)
  const [openModule, setOpenModule] = useState<string | null>(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/api/courses/${id}`),
      user ? api.get(`/api/courses/${id}/enrolled`) : Promise.resolve(null)
    ]).then(([courseRes, enrollRes]) => {
      setCourse(courseRes.data.course)
      setOpenModule(courseRes.data.course.modules?.[0]?.id || null)
      if (enrollRes) setEnrolled(enrollRes.data.enrolled)
    }).catch(() => navigate('/courses'))
      .finally(() => setLoading(false))
  }, [id, user])

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-12 animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-slate-800 rounded w-2/3 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-full mb-2" />
          <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-3/4" />
        </div>
      </div>
    )
  }

  if (!course) return null

  const totalLessons = course.modules?.reduce((s, m) => s + (m.lessons?.length || 0), 0) || 0

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row gap-10">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <Link to="/courses" className="text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors">
                  Courses
                </Link>
                <span className="text-gray-300 dark:text-slate-600">/</span>
                <span className="text-gray-700 dark:text-slate-300 text-sm">{course.title}</span>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{course.title}</h1>
              <p className="text-gray-500 dark:text-slate-400 leading-relaxed mb-6">{course.short_description}</p>

              <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  {totalLessons} lessons
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {course.total_duration_mins} minutes
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  {course.language}
                </span>
              </div>
            </div>

            {/* Enroll card */}
            <div className="lg:w-80 shrink-0">
              <div className="card sticky top-24">
                {course.thumbnail_url && (
                  <img src={course.thumbnail_url} alt={course.title}
                    className="w-full h-36 object-cover rounded-lg mb-4" />
                )}

                {!enrolled && (
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">₹{course.price}</span>
                    {course.original_price && (
                      <span className="text-gray-400 dark:text-slate-500 line-through">₹{course.original_price}</span>
                    )}
                    {course.original_price && (
                      <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                        {Math.round((1 - course.price / course.original_price) * 100)}% off
                      </span>
                    )}
                  </div>
                )}

                {enrolled ? (
                  <Link to={`/learn/${course.id}`} className="btn-primary w-full text-center block">
                    Continue Learning →
                  </Link>
                ) : (
                  <button
                    onClick={() => user ? navigate(`/checkout/${course.id}`) : navigate('/login')}
                    className="btn-primary w-full"
                  >
                    {user ? 'Enroll Now' : 'Login to Enroll'}
                  </button>
                )}

                <ul className="mt-4 space-y-2 text-sm text-gray-500 dark:text-slate-400">
                  {[
                    'Lifetime access',
                    'Certificate on completion',
                    'Practice quizzes included'
                  ].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Course Curriculum</h2>
        <p className="text-gray-500 dark:text-slate-400 text-sm mb-8">{course.description}</p>

        <div className="space-y-3">
          {course.modules?.map(module => (
            <div key={module.id} className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left"
                onClick={() => setOpenModule(openModule === module.id ? null : module.id)}
              >
                <span className="font-medium text-gray-900 dark:text-white">{module.title}</span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 dark:text-slate-400 text-sm">{module.lessons?.length || 0} lessons</span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${openModule === module.id ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {openModule === module.id && (
                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                  {module.lessons?.map(lesson => (
                    <div key={lesson.id} className="flex items-center gap-3 px-5 py-3 bg-gray-50 dark:bg-slate-950">
                      <svg className="w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-gray-700 dark:text-slate-300 text-sm flex-1">{lesson.title}</span>
                      {lesson.is_preview && (
                        <span className="text-xs bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                          Free Preview
                        </span>
                      )}
                      <span className="text-gray-400 dark:text-slate-500 text-xs">{fmtDuration(lesson.duration_seconds)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
