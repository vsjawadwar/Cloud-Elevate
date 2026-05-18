import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface Stats {
  totalStudents:    number
  totalEnrollments: number
  totalRevenueINR:  number
}

interface Suspicious {
  user:     { name: string; email: string }
  sessions: { city: string; ip_address: string; device_info: string; last_seen_at: string }[]
}

export default function AdminDashboard() {
  const [stats, setStats]             = useState<Stats | null>(null)
  const [suspicious, setSuspicious]   = useState<Suspicious[]>([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/api/admin/stats'),
      api.get('/api/admin/suspicious')
    ]).then(([statsRes, suspRes]) => {
      setStats(statsRes.data)
      setSuspicious(suspRes.data.suspicious || [])
    }).catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const statCards = stats ? [
    { label: 'Total Students',    value: stats.totalStudents,                  color: 'text-blue-400',  bg: 'bg-blue-950  border-blue-900' },
    { label: 'Total Enrollments', value: stats.totalEnrollments,               color: 'text-green-400', bg: 'bg-green-950 border-green-900' },
    { label: 'Revenue',           value: `₹${stats.totalRevenueINR.toLocaleString('en-IN')}`, color: 'text-yellow-400', bg: 'bg-yellow-950 border-yellow-900' },
    { label: 'Suspicious Flags',  value: suspicious.length,                    color: 'text-red-400',   bg: 'bg-red-950   border-red-900' }
  ] : []

  return (
    <div className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Platform overview</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map(s => (
            <div key={s.label} className={`border rounded-xl p-5 ${s.bg}`}>
              <p className="text-slate-400 text-xs mb-2">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Suspicious activity */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-white font-semibold">Suspicious Activity</h2>
          <span className="bg-red-950 border border-red-900 text-red-400 text-xs px-2 py-0.5 rounded-full">
            {suspicious.length}
          </span>
        </div>

        {suspicious.length === 0 ? (
          <p className="text-slate-500 text-sm py-4 text-center">No suspicious sessions detected ✓</p>
        ) : (
          <div className="space-y-4">
            {suspicious.map((s, i) => (
              <div key={i} className="bg-slate-950 border border-red-900 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white font-medium text-sm">{s.user.name}</p>
                    <p className="text-slate-400 text-xs">{s.user.email}</p>
                  </div>
                  <span className="text-xs bg-red-950 text-red-400 px-2 py-1 rounded-full border border-red-900">
                    {s.sessions.length} active sessions
                  </span>
                </div>
                <div className="space-y-2">
                  {s.sessions.map((sess, j) => (
                    <div key={j} className="flex items-center gap-3 text-xs text-slate-400">
                      <svg className="w-3.5 h-3.5 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <span>{sess.city} · {sess.ip_address}</span>
                      <span className="text-slate-600 ml-auto">
                        {new Date(sess.last_seen_at).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
