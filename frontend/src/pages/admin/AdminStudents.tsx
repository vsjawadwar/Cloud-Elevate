import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

interface Student {
  id:         string
  name:       string
  email:      string
  phone?:     string
  created_at: string
  enrollments: { id: string; course_id: string }[]
}

export default function AdminStudents() {
  const [students, setStudents]   = useState<Student[]>([])
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [suspending, setSuspending] = useState<string | null>(null)

  useEffect(() => {
    api.get('/api/admin/students')
      .then(r => setStudents(r.data.students || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSuspend = async (id: string, name: string) => {
    if (!confirm(`Suspend ${name}? This will log them out immediately.`)) return
    setSuspending(id)
    try {
      await api.post(`/api/admin/students/${id}/suspend`)
      setStudents(s => s.filter(st => st.id !== id))
      toast.success(`${name} has been suspended`)
    } catch {
      toast.error('Failed to suspend student')
    } finally {
      setSuspending(null)
    }
  }

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Students</h1>
          <p className="text-slate-400 text-sm mt-1">{students.length} registered students</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <svg className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 animate-pulse">Loading students…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No students found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-5 py-3 text-slate-400 text-xs font-medium">Student</th>
                <th className="text-left px-5 py-3 text-slate-400 text-xs font-medium hidden sm:table-cell">Phone</th>
                <th className="text-left px-5 py-3 text-slate-400 text-xs font-medium">Enrollments</th>
                <th className="text-left px-5 py-3 text-slate-400 text-xs font-medium hidden md:table-cell">Joined</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map(student => (
                <tr key={student.id} className="hover:bg-slate-900 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center text-blue-300 text-sm font-semibold shrink-0">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{student.name}</p>
                        <p className="text-slate-500 text-xs">{student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-sm hidden sm:table-cell">
                    {student.phone || '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-full">
                      {student.enrollments?.length || 0} courses
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs hidden md:table-cell">
                    {new Date(student.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleSuspend(student.id, student.name)}
                      disabled={suspending === student.id}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 px-3 py-1.5 rounded-lg hover:bg-red-950 border border-transparent hover:border-red-900"
                    >
                      {suspending === student.id ? 'Suspending…' : 'Suspend'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
