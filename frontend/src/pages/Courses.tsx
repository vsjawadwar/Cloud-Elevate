import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import Navbar from '@/components/Navbar'
import type { Course } from '@cloud-elevate/shared'

const levelColor = {
  beginner:     'bg-green-950 text-green-400 border-green-900',
  intermediate: 'bg-yellow-950 text-yellow-400 border-yellow-900',
  advanced:     'bg-red-950 text-red-400 border-red-900'
}

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/courses')
      .then(r => setCourses(r.data.courses || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">GCP Certification Courses</h1>
          <p className="text-slate-400">Industry-aligned courses for Google Cloud certifications</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="card animate-pulse">
                <div className="h-40 bg-slate-800 rounded-lg mb-4" />
                <div className="h-4 bg-slate-800 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-800 rounded w-full mb-1" />
                <div className="h-3 bg-slate-800 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            No courses published yet. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <Link key={course.id} to={`/courses/${course.id}`}
                className="card hover:border-slate-700 transition-all group flex flex-col p-0 overflow-hidden">
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title}
                    className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-44 bg-gradient-to-br from-blue-950 to-slate-900 flex items-center justify-center">
                    <svg className="w-16 h-16 text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                        d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                  </div>
                )}
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${levelColor[course.level]}`}>
                      {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
                    </span>
                    <span className="text-xs text-slate-500">{course.language}</span>
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-blue-400 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed flex-1 line-clamp-2">
                    {course.short_description}
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-white font-bold text-xl">₹{course.price}</span>
                      {course.original_price && (
                        <span className="text-slate-500 line-through text-sm">₹{course.original_price}</span>
                      )}
                    </div>
                    <span className="text-slate-400 text-xs">{course.total_duration_mins} mins</span>
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
