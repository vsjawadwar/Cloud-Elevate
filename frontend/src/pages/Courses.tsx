import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import Navbar from '@/components/Navbar'
import type { Course } from '@cloud-elevate/shared'

const levelBadge = {
  beginner:     'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  intermediate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  advanced:     'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
}

export default function Courses() {
  const [courses, setCourses]   = useState<Course[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    api.get('/api/courses')
      .then(r => setCourses(r.data.courses || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = courses.filter(c =>
    !search || c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.short_description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header + search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">GCP Certification Courses</h1>
            <p className="text-gray-500 dark:text-slate-400">Industry-aligned courses for Google Cloud certifications</p>
          </div>
          <div className="relative w-full sm:w-72">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500"
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search courses…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input !pl-9 !py-2.5"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="card animate-pulse p-0 overflow-hidden">
                <div className="h-44 bg-gray-200 dark:bg-slate-800" />
                <div className="p-5">
                  <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-full mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-slate-500">
            {search ? `No courses found for "${search}"` : 'No courses published yet. Check back soon!'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(course => (
              <Link key={course.id} to={`/courses/${course.id}`}
                className="card hover:shadow-lg dark:hover:border-slate-700 transition-all group flex flex-col p-0 overflow-hidden">
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title}
                    className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-44 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950 dark:to-slate-900 flex items-center justify-center">
                    <svg className="w-16 h-16 text-blue-300 dark:text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                        d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                  </div>
                )}
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${levelBadge[course.level]}`}>
                      {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-slate-500">{course.language}</span>
                  </div>
                  <h3 className="text-gray-900 dark:text-white font-semibold text-lg mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed flex-1 line-clamp-2">
                    {course.short_description}
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-gray-900 dark:text-white font-bold text-xl">₹{course.price}</span>
                      {course.original_price && (
                        <span className="text-gray-400 dark:text-slate-500 line-through text-sm">₹{course.original_price}</span>
                      )}
                    </div>
                    <span className="text-gray-400 dark:text-slate-500 text-xs">{course.total_duration_mins} mins</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
