import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/lib/store/authStore'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

export default function Navbar() {
  const { user, isAdmin, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    try { await api.post('/api/auth/logout') } catch {}
    clearAuth()
    navigate('/login')
    toast.success('Logged out successfully')
  }

  const isActive = (path: string) =>
    location.pathname.startsWith(path) ? 'text-white' : 'text-slate-400 hover:text-white'

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg">Cloud Elevate</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/courses" className={`text-sm font-medium transition-colors ${isActive('/courses')}`}>
              Courses
            </Link>
            {user && (
              <Link to="/dashboard" className={`text-sm font-medium transition-colors ${isActive('/dashboard')}`}>
                Dashboard
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" className={`text-sm font-medium transition-colors ${isActive('/admin')}`}>
                Admin
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-300">{user.name.split(' ')[0]}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Login
                </Link>
                <Link to="/register" className="btn-primary !py-2 !px-4 text-sm">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
