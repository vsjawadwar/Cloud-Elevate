import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import Navbar from '@/components/Navbar'
import toast from 'react-hot-toast'

interface UserProfile {
  id: string
  name: string
  email: string
  phone: string | null
  avatar_url: string | null
  created_at: string
}

export default function Profile() {
  const { setAuth, token, isAdmin } = useAuthStore()
  const [profile, setProfile]       = useState<UserProfile | null>(null)
  const [form, setForm]             = useState({ name: '', phone: '' })
  const [saving, setSaving]         = useState(false)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    api.get('/api/auth/me')
      .then(({ data }) => {
        setProfile(data.user)
        setForm({ name: data.user.name, phone: data.user.phone || '' })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const { data } = await api.patch('/api/auth/profile', {
        name:  form.name.trim(),
        phone: form.phone.trim() || null
      })
      setProfile(data.user)
      if (token) setAuth(data.user, token, isAdmin)
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-32 text-gray-400 dark:text-slate-400 animate-pulse">Loading…</div>
      </div>
    )
  }

  if (!profile) return null

  const initials = profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const joined   = new Date(profile.created_at).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">My Profile</h1>

        <div className="card mb-6">
          <div className="flex items-center gap-5 mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-gray-900 dark:text-white font-semibold text-lg">{profile.name}</p>
              <p className="text-gray-500 dark:text-slate-400 text-sm">{profile.email}</p>
              <p className="text-gray-400 dark:text-slate-500 text-xs mt-1">Member since {joined}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input
                className="input"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                className="input opacity-60 cursor-not-allowed"
                value={profile.email}
                disabled
              />
              <p className="text-gray-400 dark:text-slate-600 text-xs mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                type="tel"
                placeholder="9876543210"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <Link to="/dashboard" className="btn-secondary">
                Back to Dashboard
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
