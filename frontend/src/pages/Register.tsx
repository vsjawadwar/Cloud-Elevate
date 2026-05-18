import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

export default function Register() {
  const [form, setForm]       = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const navigate              = useNavigate()

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
    if (form.password.length < 6)       { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await api.post('/api/auth/register', {
        name: form.name, email: form.email, phone: form.phone, password: form.password
      })
      toast.success('Account created! Please sign in.')
      navigate('/login')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gray-50 dark:bg-slate-950">
      <Link to="/" className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        </div>
        <span className="text-gray-900 dark:text-white font-bold text-lg">Cloud Elevate</span>
      </Link>

      <div className="w-full max-w-md">
        <div className="card">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Create your account</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">Start your GCP certification journey</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" type="text" placeholder="Priya Sharma"
                value={form.name} onChange={set('name')} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@example.com"
                value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" placeholder="9876543210"
                value={form.phone} onChange={set('phone')} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="Min 6 characters"
                value={form.password} onChange={set('password')} required />
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input className="input" type="password" placeholder="Repeat password"
                value={form.confirm} onChange={set('confirm')} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-gray-500 dark:text-slate-400 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
