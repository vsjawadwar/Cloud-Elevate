import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import Navbar from '@/components/Navbar'
import type { Enrollment, CourseProgress } from '@cloud-elevate/shared'

interface EnrollmentWithProgress extends Enrollment {
  progress?: CourseProgress
}

export default function Dashboard() {
  const { user }                      = useAuthStore()
  const [enrollments, setEnrollments] = useState<EnrollmentWithProgress[]>([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    api.get('/api/auth/me').then(async () => {
      const { data: coursesData } = await api.get('/api/courses')
      const allCourses = coursesData.courses || []

      const enrollmentChecks = await Promise.all(
        allCourses.map((c: any) =>
          api.get(`/api/courses/${c.id}/enrolled`).then(r => ({ ...r.data, course: c }))
        )
      )
      const myEnrollments = enrollmentChecks
        .filter(e => e.enrolled)
        .map(e => ({ id: e.enrollment?.id, course_id: e.course.id, course: e.course, enrolled_at: e.enrollment?.enrolled_at } as EnrollmentWithProgress))

      const withProgress = await Promise.all(
        myEnrollments.map(async e => {
          try {
            const { data } = await api.get(`/api/progress/course/${e.course_id}`)
            return { ...e, progress: data }
          } catch { return e }
        })
      )
      setEnrollments(withProgress)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.name.split(' ')[0]}!
          </h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Continue where you left off</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Enrolled',    value: enrollments.length },
            { label: 'In Progress', value: enrollments.filter(e => (e.progress?.percentage || 0) > 0 && (e.progress?.percentage || 0) < 100).length },
            { label: 'Completed',   value: enrollments.filter(e => (e.progress?.percentage || 0) === 100).length }
          ].map(s => (
            <div key={s.label} className="card text-center py-5">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</div>
              <div className="text-gray-500 dark:text-slate-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Enrolled courses */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">My Courses</h2>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="card animate-pulse flex gap-4">
                <div className="w-24 h-16 bg-gray-200 dark:bg-slate-800 rounded-lg shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="card text-center py-16">
            <svg className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-gray-500 dark:text-slate-400 mb-4">You haven't enrolled in any courses yet</p>
            <Link to="/courses" className="btn-primary">Browse Courses</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {enrollments.map(e => {
              const pct  = e.progress?.percentage || 0
              const done = pct === 100
              return (
                <div key={e.id} className="card flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  {e.course?.thumbnail_url ? (
                    <img src={e.course.thumbnail_url} alt={e.course.title}
                      className="w-full sm:w-28 h-20 object-cover rounded-lg shrink-0" />
                  ) : (
                    <div className="w-full sm:w-28 h-20 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950 dark:to-slate-900 rounded-lg shrink-0 flex items-center justify-center">
                      <svg className="w-8 h-8 text-blue-300 dark:text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-1 truncate">{e.course?.title}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 bg-gray-200 dark:bg-slate-800 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-gray-400 dark:text-slate-400 text-xs shrink-0">{pct}%</span>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-slate-500">
                      {e.progress?.completed_lessons || 0}/{e.progress?.total_lessons || 0} lessons
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {done && (
                      <Link to={`/certificate/${e.id}`}
                        className="text-xs bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900 transition-colors">
                        Certificate
                      </Link>
                    )}
                    <Link to={`/learn/${e.course_id}`} className="btn-primary !py-1.5 !px-4 text-sm">
                      {pct === 0 ? 'Start' : done ? 'Review' : 'Continue'}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-8">
          <Link to="/courses" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 text-sm transition-colors">
            ← Browse more courses
          </Link>
        </div>
      </div>
    </div>
  )
}
