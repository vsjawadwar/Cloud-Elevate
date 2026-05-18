import { Link } from 'react-router-dom'
import Navbar from '@/components/Navbar'

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
      </svg>
    ),
    title: 'HD Video Lessons',
    desc: 'Crystal-clear video content delivered via Bunny.net CDN — fast loading anywhere in India.'
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Practice Quizzes',
    desc: 'Exam-style multiple choice questions with detailed explanations to build exam confidence.'
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Completion Certificate',
    desc: 'Earn a verified certificate upon course completion — shareable on LinkedIn and resumes.'
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Secure Access',
    desc: 'Single-device login enforcement prevents credential sharing — your investment is protected.'
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Lifetime Access',
    desc: 'Pay once, access forever. Study at your own pace — no expiry pressure.'
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'Affordable Pricing',
    desc: 'Priced for diploma students in India — world-class content at a fraction of global platforms.'
  }
]

const stats = [
  { value: '2,000+', label: 'Students Enrolled' },
  { value: '92%',    label: 'Pass Rate' },
  { value: '15+',    label: 'Video Hours' },
  { value: '₹999',  label: 'Starting Price' }
]

export default function Landing() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero — always dark for brand impact */}
      <section className="relative overflow-hidden pt-20 pb-28 bg-slate-950">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-slate-950" />
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 70% 20%, #1d4ed8 0%, transparent 40%)' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-950 border border-blue-800 rounded-full px-4 py-1.5 mb-8">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-blue-300 text-sm font-medium">India's #1 GCP Certification Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Master Google Cloud.<br />
            <span className="text-blue-400">Get Certified. Get Hired.</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
            Structured video courses designed for diploma students in India.
            Learn GCP from scratch, pass the certification exam, and unlock cloud career opportunities.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/courses" className="btn-primary text-base w-full sm:w-auto">
              Explore Courses
            </Link>
            <Link to="/register"
              className="bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 text-base w-full sm:w-auto text-center">
              Start Free Today
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{s.value}</div>
                <div className="text-sm text-gray-500 dark:text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Everything you need to pass</h2>
            <p className="text-gray-500 dark:text-slate-400 max-w-xl mx-auto">
              A complete learning system — not just videos. Built specifically for the GCP exam.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="card hover:shadow-md dark:hover:border-slate-700 transition-all">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                  {f.icon}
                </div>
                <h3 className="text-gray-900 dark:text-white font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to start your cloud journey?</h2>
          <p className="text-blue-100 mb-8">
            Join thousands of students who've already taken the first step toward a GCP certification.
          </p>
          <Link to="/register"
            className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8 py-3 rounded-lg transition-colors inline-block text-base">
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-slate-800 py-8 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 dark:text-slate-500 text-sm">
          © {new Date().getFullYear()} Cloud Elevate. Empowering cloud careers across India.
        </div>
      </footer>
    </div>
  )
}
