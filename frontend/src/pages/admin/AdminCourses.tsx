import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import type { Course } from '@cloud-elevate/shared'

const EMPTY_FORM = {
  title: '', short_description: '', description: '', price: '',
  original_price: '', thumbnail_url: '', level: 'beginner', language: 'Hindi', total_duration_mins: ''
}

export default function AdminCourses() {
  const [courses, setCourses]       = useState<Course[]>([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState<Course | null>(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = () => {
    api.get('/api/courses')
      .then(r => setCourses(r.data.courses || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (course: Course) => {
    setEditing(course)
    setForm({
      title:               course.title,
      short_description:   course.short_description,
      description:         course.description,
      price:               String(course.price),
      original_price:      course.original_price ? String(course.original_price) : '',
      thumbnail_url:       course.thumbnail_url || '',
      level:               course.level,
      language:            course.language,
      total_duration_mins: String(course.total_duration_mins)
    })
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      price:               Number(form.price),
      original_price:      form.original_price ? Number(form.original_price) : null,
      total_duration_mins: Number(form.total_duration_mins)
    }
    try {
      if (editing) {
        const { data } = await api.patch(`/api/courses/${editing.id}`, payload)
        setCourses(cs => cs.map(c => c.id === editing.id ? data.course : c))
        toast.success('Course updated')
      } else {
        const { data } = await api.post('/api/courses', payload)
        setCourses(cs => [data.course, ...cs])
        toast.success('Course created')
      }
      setShowForm(false)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async (course: Course) => {
    try {
      const { data } = await api.patch(`/api/courses/${course.id}`, { is_published: !course.is_published })
      setCourses(cs => cs.map(c => c.id === course.id ? data.course : c))
      toast.success(data.course.is_published ? 'Course published' : 'Course unpublished')
    } catch {
      toast.error('Failed to update course')
    }
  }

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Courses</h1>
          <p className="text-slate-400 text-sm mt-1">{courses.length} courses</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Course
        </button>
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-white font-semibold">{editing ? 'Edit Course' : 'New Course'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="label">Title</label>
                <input className="input" required value={form.title} onChange={set('title')} placeholder="GCP Associate Cloud Engineer" />
              </div>
              <div>
                <label className="label">Short Description</label>
                <input className="input" required value={form.short_description} onChange={set('short_description')} placeholder="One-line summary" />
              </div>
              <div>
                <label className="label">Full Description</label>
                <textarea className="input min-h-[80px] resize-none" required value={form.description} onChange={set('description')} placeholder="Detailed course description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Price (₹)</label>
                  <input className="input" type="number" required min={0} value={form.price} onChange={set('price')} placeholder="999" />
                </div>
                <div>
                  <label className="label">Original Price (₹)</label>
                  <input className="input" type="number" min={0} value={form.original_price} onChange={set('original_price')} placeholder="1999" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Level</label>
                  <select className="input" value={form.level} onChange={set('level')}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="label">Language</label>
                  <select className="input" value={form.language} onChange={set('language')}>
                    <option>Hindi</option>
                    <option>English</option>
                    <option>Hinglish</option>
                    <option>Marathi</option>
                    <option>Telugu</option>
                    <option>Tamil</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Duration (mins)</label>
                  <input className="input" type="number" min={0} value={form.total_duration_mins} onChange={set('total_duration_mins')} placeholder="180" />
                </div>
                <div>
                  <label className="label">Thumbnail URL</label>
                  <input className="input" value={form.thumbnail_url} onChange={set('thumbnail_url')} placeholder="https://..." />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving…' : editing ? 'Update Course' : 'Create Course'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Courses list */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 animate-pulse">Loading courses…</div>
        ) : courses.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p className="mb-3">No courses yet</p>
            <button onClick={openCreate} className="btn-primary text-sm">Create First Course</button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-5 py-3 text-slate-400 text-xs font-medium">Course</th>
                <th className="text-left px-5 py-3 text-slate-400 text-xs font-medium hidden sm:table-cell">Price</th>
                <th className="text-left px-5 py-3 text-slate-400 text-xs font-medium hidden md:table-cell">Level</th>
                <th className="text-left px-5 py-3 text-slate-400 text-xs font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {courses.map(course => (
                <tr key={course.id} className="hover:bg-slate-900 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt={course.title}
                          className="w-10 h-8 object-cover rounded-md shrink-0" />
                      ) : (
                        <div className="w-10 h-8 bg-blue-950 rounded-md shrink-0" />
                      )}
                      <div>
                        <p className="text-white text-sm font-medium">{course.title}</p>
                        <p className="text-slate-500 text-xs">{course.total_duration_mins} mins</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <span className="text-white text-sm font-medium">₹{course.price}</span>
                    {course.original_price && (
                      <span className="text-slate-500 text-xs line-through ml-1">₹{course.original_price}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-sm hidden md:table-cell capitalize">
                    {course.level}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => togglePublish(course)}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                        course.is_published
                          ? 'bg-green-950 border-green-900 text-green-400 hover:bg-green-900'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {course.is_published ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => openEdit(course)}
                      className="text-xs text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-950 transition-colors"
                    >
                      Edit
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
