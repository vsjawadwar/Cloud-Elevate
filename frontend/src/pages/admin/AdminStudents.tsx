import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

interface Session {
  id:           string
  created_at:   string
  last_seen_at: string
  is_active:    boolean
  device_info:  string
  ip_address:   string
  city:         string
}

interface Student {
  id:            string
  name:          string
  email:         string
  phone?:        string
  created_at:    string
  enrollments:   { id: string; course_id: string; enrolled_at: string }[]
  user_sessions: Session[]
}

function parseDevice(ua: string): string {
  if (!ua) return 'Unknown'
  if (ua.includes('iPhone'))  return 'iPhone'
  if (ua.includes('iPad'))    return 'iPad'
  if (ua.includes('Android')) return 'Android'
  const browser = ua.includes('Chrome') ? 'Chrome'
    : ua.includes('Firefox') ? 'Firefox'
    : ua.includes('Safari')  ? 'Safari'
    : 'Browser'
  const os = ua.includes('Windows') ? 'Windows'
    : ua.includes('Mac')     ? 'Mac'
    : ua.includes('Linux')   ? 'Linux'
    : ''
  return os ? `${browser} / ${os}` : browser
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)    return 'Just now'
  if (mins < 60)   return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  if (days < 30)   return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN')
}

function getLastSession(sessions: Session[]) {
  if (!sessions?.length) return null
  return sessions.reduce((a, b) =>
    new Date(a.created_at) > new Date(b.created_at) ? a : b
  )
}

export default function AdminStudents() {
  const [students, setStudents]     = useState<Student[]>([])
  const [search, setSearch]         = useState('')
  const [loading, setLoading]       = useState(true)
  const [suspending, setSuspending] = useState<string | null>(null)
  const [selected, setSelected]     = useState<Student | null>(null)
  const [sessions, setSessions]     = useState<Session[]>([])
  const [sessLoading, setSessLoading] = useState(false)

  useEffect(() => {
    api.get('/api/admin/students')
      .then(r => setStudents(r.data.students || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const openActivity = async (student: Student) => {
    setSelected(student)
    setSessLoading(true)
    try {
      const { data } = await api.get(`/api/admin/students/${student.id}/activity`)
      setSessions(data.sessions || [])
    } catch {
      toast.error('Failed to load activity')
    } finally {
      setSessLoading(false)
    }
  }

  const handleSuspend = async (id: string, name: string) => {
    if (!confirm(`Suspend ${name}? This will log them out immediately.`)) return
    setSuspending(id)
    try {
      await api.post(`/api/admin/students/${id}/suspend`)
      setStudents(s => s.filter(st => st.id !== id))
      if (selected?.id === id) setSelected(null)
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
    <div className="flex h-full">
      {/* Main panel */}
      <div className={`flex-1 px-8 py-8 overflow-auto transition-all ${selected ? 'mr-[400px]' : ''}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Students</h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">{students.length} registered students</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <svg className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <div className="p-8 text-center text-gray-400 dark:text-slate-400 animate-pulse">Loading students…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-slate-500">No students found</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-slate-400 text-xs font-medium">Student</th>
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-slate-400 text-xs font-medium hidden sm:table-cell">Phone</th>
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-slate-400 text-xs font-medium">Courses</th>
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-slate-400 text-xs font-medium hidden lg:table-cell">Last Login</th>
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-slate-400 text-xs font-medium hidden md:table-cell">Joined</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filtered.map(student => {
                  const lastSession = getLastSession(student.user_sessions)
                  const isActive    = student.user_sessions?.some(s => s.is_active)
                  return (
                    <tr
                      key={student.id}
                      onClick={() => openActivity(student)}
                      className={`hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors cursor-pointer ${selected?.id === student.id ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 text-sm font-semibold">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`} />
                          </div>
                          <div>
                            <p className="text-gray-900 dark:text-white text-sm font-medium">{student.name}</p>
                            <p className="text-gray-500 dark:text-slate-500 text-xs">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400 text-sm hidden sm:table-cell">
                        {student.phone || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-xs px-2 py-1 rounded-full">
                          {student.enrollments?.length || 0} courses
                        </span>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        {lastSession ? (
                          <div>
                            <p className="text-gray-700 dark:text-slate-300 text-xs font-medium">{timeAgo(lastSession.created_at)}</p>
                            <p className="text-gray-400 dark:text-slate-500 text-xs">{lastSession.city || 'Unknown'}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-slate-600 text-xs">Never logged in</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 dark:text-slate-500 text-xs hidden md:table-cell">
                        {new Date(student.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleSuspend(student.id, student.name)}
                          disabled={suspending === student.id}
                          className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors disabled:opacity-50 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 border border-transparent hover:border-red-200 dark:hover:border-red-900"
                        >
                          {suspending === student.id ? 'Suspending…' : 'Suspend'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Activity slide-in panel */}
      {selected && (
        <div className="fixed right-0 top-0 h-full w-[400px] bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 shadow-xl flex flex-col z-40">
          {/* Panel header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold">
                {selected.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-gray-900 dark:text-white font-semibold text-sm">{selected.name}</p>
                <p className="text-gray-500 dark:text-slate-400 text-xs">{selected.email}</p>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-500 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-px bg-gray-200 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-800">
            {[
              { label: 'Total Logins', value: sessions.length || selected.user_sessions?.length || 0 },
              { label: 'Courses',      value: selected.enrollments?.length || 0 },
              { label: 'Member Since', value: new Date(selected.created_at).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) }
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-slate-900 px-4 py-3 text-center">
                <p className="text-gray-900 dark:text-white font-bold text-lg">{s.value}</p>
                <p className="text-gray-500 dark:text-slate-500 text-xs">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Session history */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-4">Login History</h3>

            {sessLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-slate-700 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-1.5" />
                      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-gray-400 dark:text-slate-500 text-sm text-center py-8">No login history found</p>
            ) : (
              <div className="space-y-1">
                {sessions.map((session, i) => (
                  <div key={session.id} className="flex gap-3 py-3 border-b border-gray-100 dark:border-slate-800 last:border-0">
                    {/* Status dot */}
                    <div className="flex flex-col items-center pt-1 shrink-0">
                      <div className={`w-2 h-2 rounded-full ${session.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`} />
                      {i < sessions.length - 1 && <div className="w-px flex-1 bg-gray-100 dark:bg-slate-800 mt-1" />}
                    </div>
                    {/* Session info */}
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${session.is_active ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}>
                          {session.is_active ? 'Active' : 'Ended'}
                        </span>
                        <span className="text-gray-400 dark:text-slate-500 text-xs shrink-0">{timeAgo(session.created_at)}</span>
                      </div>
                      <p className="text-gray-700 dark:text-slate-300 text-xs mt-1.5 truncate">{parseDevice(session.device_info)}</p>
                      <p className="text-gray-400 dark:text-slate-500 text-xs">
                        {session.city && session.city !== 'Unknown' ? `${session.city} · ` : ''}{session.ip_address}
                      </p>
                      <p className="text-gray-400 dark:text-slate-600 text-xs mt-0.5">
                        {new Date(session.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Panel footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800">
            <button
              onClick={() => handleSuspend(selected.id, selected.name)}
              disabled={suspending === selected.id}
              className="w-full text-sm text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 border border-red-200 dark:border-red-900 hover:border-red-300 dark:hover:border-red-800 rounded-lg py-2 transition-colors disabled:opacity-50"
            >
              {suspending === selected.id ? 'Suspending…' : `Suspend ${selected.name.split(' ')[0]}'s Account`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
