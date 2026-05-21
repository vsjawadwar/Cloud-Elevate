import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import Navbar from '@/components/Navbar'

interface CertData {
  studentName: string
  courseName:  string
  enrolledAt:  string
  courseId:    string
}

export default function Certificate() {
  const { enrollmentId }              = useParams<{ enrollmentId: string }>()
  const certRef                       = useRef<HTMLDivElement>(null)
  const [cert, setCert]               = useState<CertData | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')

  useEffect(() => {
    if (!enrollmentId) { setError('Invalid certificate link.'); setLoading(false); return }

    api.get(`/api/courses/enrollments/${enrollmentId}/certificate`)
      .then(r => {
        const d = r.data
        if (d.percentage < 100) {
          setError('Complete all lessons to unlock your certificate.')
        } else {
          setCert({
            studentName: d.studentName,
            courseName:  d.courseName,
            enrolledAt:  d.enrolledAt,
            courseId:    d.courseId
          })
        }
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Failed to load certificate.')
      })
      .finally(() => setLoading(false))
  }, [enrollmentId])

  const handlePrint = () => window.print()

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-32 text-slate-400 animate-pulse">Verifying certificate…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-24 text-center">
          <div className="card">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-white font-semibold mb-2">Certificate Locked</h2>
            <p className="text-slate-400 text-sm mb-5">{error}</p>
            <Link to="/dashboard" className="btn-secondary">Back to Dashboard</Link>
          </div>
        </div>
      </div>
    )
  }

  if (!cert) return null

  const issueDate = new Date(cert.enrolledAt).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="min-h-screen">
      <div className="print:hidden">
        <Navbar />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 print:py-0">
        {/* Actions */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link to="/dashboard" className="text-slate-400 hover:text-white text-sm transition-colors">
            ← Dashboard
          </Link>
          <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / Save PDF
          </button>
        </div>

        {/* Certificate */}
        <div
          ref={certRef}
          className="bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl print:shadow-none print:rounded-none"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {/* Top accent */}
          <div className="h-3 bg-gradient-to-r from-blue-600 to-blue-400" />

          <div className="px-12 py-14 text-center">
            {/* Logo + org */}
            <div className="flex items-center justify-center gap-3 mb-10">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <span className="text-slate-900 font-bold text-xl">Cloud Elevate</span>
            </div>

            {/* Decorative badge */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 border-4 border-blue-100 mb-8">
              <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>

            <p className="text-slate-500 text-sm uppercase tracking-widest mb-3">Certificate of Completion</p>
            <h1 className="text-4xl font-bold text-slate-900 mb-1">This certifies that</h1>

            <div className="my-6 border-b-2 border-blue-600 pb-2 inline-block px-8">
              <p className="text-3xl font-bold text-blue-700">{cert.studentName}</p>
            </div>

            <p className="text-slate-600 text-lg mb-2">has successfully completed the course</p>
            <h2 className="text-2xl font-bold text-slate-900 mb-8">{cert.courseName}</h2>

            <div className="flex items-center justify-center gap-8 mt-8 pt-8 border-t border-slate-200">
              <div className="text-center">
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Date of Completion</p>
                <p className="text-slate-800 font-semibold">{issueDate}</p>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="text-center">
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Certificate ID</p>
                <p className="text-slate-800 font-mono text-sm">{enrollmentId?.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="text-center">
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Issued By</p>
                <p className="text-slate-800 font-semibold">Cloud Elevate</p>
              </div>
            </div>
          </div>

          {/* Bottom accent */}
          <div className="h-2 bg-gradient-to-r from-blue-400 to-blue-600" />
        </div>
      </div>
    </div>
  )
}
