import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Step = 'email' | 'otp' | 'password'

export default function ForgotPassword() {
  const navigate            = useNavigate()
  const [step, setStep]     = useState<Step>('email')
  const [email, setEmail]   = useState('')
  const [otp, setOtp]       = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confPwd, setConf]  = useState('')
  const [loading, setLoading] = useState(false)

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/auth/forgot-password', { email })
      toast.success('OTP sent to your email')
      setStep('otp')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/auth/verify-reset-otp', { email, otp })
      toast.success('OTP verified')
      setStep('password')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPwd !== confPwd) { toast.error('Passwords do not match'); return }
    if (newPwd.length < 6)  { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await api.post('/api/auth/reset-password', { email, otp, newPassword: newPwd })
      toast.success('Password reset successfully!')
      navigate('/login')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  const stepLabel = { email: 1, otp: 2, password: 3 }[step]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50 dark:bg-slate-950">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-sm">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
            <path fill="white" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
            <path stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M20 19v-8m0 0-2 2m2-2 2 2"/>
          </svg>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-gray-900 dark:text-white font-bold text-base tracking-tight">Cloud Elevate</span>
          <span className="text-blue-500 dark:text-blue-400 text-[10px] font-semibold tracking-widest uppercase mt-0.5">Upskill. Certify. Succeed.</span>
        </div>
      </Link>

      <div className="w-full max-w-md">
        <div className="card">
          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-6">
            {(['email', 'otp', 'password'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  stepLabel > i + 1
                    ? 'bg-green-500 text-white'
                    : stepLabel === i + 1
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500'
                }`}>
                  {stepLabel > i + 1 ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : i + 1}
                </div>
                {i < 2 && <div className={`flex-1 h-px w-8 ${stepLabel > i + 1 ? 'bg-green-400' : 'bg-gray-200 dark:bg-slate-700'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1 — Email */}
          {step === 'email' && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Forgot Password</h1>
              <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">Enter your registered email to receive an OTP</p>
              <form onSubmit={sendOtp} className="space-y-4">
                <div>
                  <label className="label">Email Address</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Sending OTP…' : 'Send OTP'}
                </button>
              </form>
            </>
          )}

          {/* Step 2 — OTP */}
          {step === 'otp' && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Enter OTP</h1>
              <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">
                We sent a 6-digit OTP to <span className="text-gray-700 dark:text-slate-300 font-medium">{email}</span>.
                Valid for 10 minutes.
              </p>
              <form onSubmit={verifyOtp} className="space-y-4">
                <div>
                  <label className="label">6-Digit OTP</label>
                  <input
                    type="text"
                    className="input text-center text-2xl font-bold tracking-[0.5em]"
                    placeholder="------"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
                <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full">
                  {loading ? 'Verifying…' : 'Verify OTP'}
                </button>
              </form>
              <button
                onClick={() => { setOtp(''); setStep('email') }}
                className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 mt-4 transition-colors"
              >
                Didn't receive it? Change email or resend
              </button>
            </>
          )}

          {/* Step 3 — New Password */}
          {step === 'password' && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Set New Password</h1>
              <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">Choose a strong password for your account</p>
              <form onSubmit={resetPassword} className="space-y-4">
                <div>
                  <label className="label">New Password</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Minimum 6 characters"
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Confirm Password</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Re-enter your password"
                    value={confPwd}
                    onChange={e => setConf(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Resetting…' : 'Reset Password'}
                </button>
              </form>
            </>
          )}

          <div className="border-t border-gray-100 dark:border-slate-800 mt-6 pt-5 text-center">
            <Link to="/login" className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
