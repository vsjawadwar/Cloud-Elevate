import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import type { Course } from '@cloud-elevate/shared'

const EMPTY_COURSE = {
  title: '', short_description: '', description: '', price: '',
  original_price: '', thumbnail_url: '', level: 'beginner',
  language: 'Hindi', total_duration_mins: ''
}

const EMPTY_LESSON = {
  title: '', description: '', video_url: '', duration_seconds: '', order: '', is_preview: false
}

interface Lesson {
  id: string; title: string; video_url: string
  duration_seconds: number; order: number; is_preview: boolean
}
interface Module { id: string; title: string; order: number; lessons: Lesson[] }

export default function AdminCourses() {
  const [courses, setCourses]           = useState<Course[]>([])
  const [loading, setLoading]           = useState(true)
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [editingCourse, setEditingCourse]   = useState<Course | null>(null)
  const [courseForm, setCourseForm]         = useState(EMPTY_COURSE)
  const [savingCourse, setSavingCourse]     = useState(false)

  // Content management (modules + lessons)
  const [activeCourse, setActiveCourse] = useState<Course | null>(null)
  const [modules, setModules]           = useState<Module[]>([])
  const [loadingModules, setLoadingModules] = useState(false)

  // Module form
  const [showModuleForm, setShowModuleForm] = useState(false)
  const [moduleTitle, setModuleTitle]       = useState('')
  const [savingModule, setSavingModule]     = useState(false)

  // Lesson form
  const [showLessonForm, setShowLessonForm] = useState(false)
  const [activeModuleId, setActiveModuleId] = useState('')
  const [lessonForm, setLessonForm]         = useState(EMPTY_LESSON)
  const [savingLesson, setSavingLesson]     = useState(false)

  const setCourse = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setCourseForm(f => ({ ...f, [k]: e.target.value }))

  const setLesson = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setLessonForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => { fetchCourses() }, [])

  const fetchCourses = () => {
    api.get('/api/courses')
      .then(r => setCourses(r.data.courses || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const fetchModules = (courseId: string) => {
    setLoadingModules(true)
    api.get(`/api/modules/course/${courseId}`)
      .then(r => setModules(r.data.modules || []))
      .catch(() => {})
      .finally(() => setLoadingModules(false))
  }

  // ── Course CRUD ─────────────────────────────
  const openCreateCourse = () => {
    setEditingCourse(null)
    setCourseForm(EMPTY_COURSE)
    setShowCourseForm(true)
  }

  const openEditCourse = (course: Course) => {
    setEditingCourse(course)
    setCourseForm({
      title: course.title, short_description: course.short_description,
      description: course.description, price: String(course.price),
      original_price: course.original_price ? String(course.original_price) : '',
      thumbnail_url: course.thumbnail_url || '', level: course.level,
      language: course.language, total_duration_mins: String(course.total_duration_mins)
    })
    setShowCourseForm(true)
  }

  const saveCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingCourse(true)
    const payload = {
      ...courseForm,
      price:               Number(courseForm.price),
      original_price:      courseForm.original_price ? Number(courseForm.original_price) : null,
      total_duration_mins: Number(courseForm.total_duration_mins)
    }
    try {
      if (editingCourse) {
        const { data } = await api.patch(`/api/courses/${editingCourse.id}`, payload)
        setCourses(cs => cs.map(c => c.id === editingCourse.id ? data.course : c))
        toast.success('Course updated')
      } else {
        const { data } = await api.post('/api/courses', payload)
        setCourses(cs => [data.course, ...cs])
        toast.success('Course created')
      }
      setShowCourseForm(false)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Save failed')
    } finally {
      setSavingCourse(false)
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

  // ── Open content manager ─────────────────────
  const openContent = (course: Course) => {
    setActiveCourse(course)
    fetchModules(course.id)
  }

  // ── Module CRUD ──────────────────────────────
  const saveModule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCourse) return
    setSavingModule(true)
    try {
      const { data } = await api.post('/api/modules', {
        course_id: activeCourse.id,
        title: moduleTitle,
        order: modules.length
      })
      setModules(m => [...m, { ...data.module, lessons: [] }])
      setModuleTitle('')
      setShowModuleForm(false)
      toast.success('Module added')
    } catch {
      toast.error('Failed to add module')
    } finally {
      setSavingModule(false)
    }
  }

  const deleteModule = async (moduleId: string) => {
    if (!confirm('Delete this module and all its lessons?')) return
    try {
      await api.delete(`/api/modules/${moduleId}`)
      setModules(m => m.filter(mod => mod.id !== moduleId))
      toast.success('Module deleted')
    } catch {
      toast.error('Failed to delete module')
    }
  }

  // ── Lesson CRUD ──────────────────────────────
  const openAddLesson = (moduleId: string) => {
    setActiveModuleId(moduleId)
    const mod = modules.find(m => m.id === moduleId)
    setLessonForm({ ...EMPTY_LESSON, order: String(mod?.lessons?.length ?? 0) })
    setShowLessonForm(true)
  }

  const saveLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingLesson(true)
    try {
      const { data } = await api.post('/api/lessons', {
        module_id:        activeModuleId,
        title:            lessonForm.title,
        description:      lessonForm.description || null,
        video_url:        lessonForm.video_url,
        duration_seconds: Number(lessonForm.duration_seconds) || 0,
        order:            Number(lessonForm.order) || 0,
        is_preview:       lessonForm.is_preview
      })
      setModules(mods => mods.map(m =>
        m.id === activeModuleId
          ? { ...m, lessons: [...(m.lessons || []), data.lesson] }
          : m
      ))
      setShowLessonForm(false)
      setLessonForm(EMPTY_LESSON)
      toast.success('Lesson added')
    } catch {
      toast.error('Failed to add lesson')
    } finally {
      setSavingLesson(false)
    }
  }

  // ── Content panel ────────────────────────────
  if (activeCourse) {
    return (
      <div className="px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setActiveCourse(null)}
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All Courses
          </button>
          <span className="text-slate-600">/</span>
          <span className="text-white font-semibold">{activeCourse.title}</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Course Content</h2>
          <button onClick={() => setShowModuleForm(true)} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Module
          </button>
        </div>

        {/* Add module form */}
        {showModuleForm && (
          <form onSubmit={saveModule} className="card mb-6 flex gap-3 items-end">
            <div className="flex-1">
              <label className="label">Module Title</label>
              <input className="input" required autoFocus
                placeholder="e.g. Introduction to GCP"
                value={moduleTitle}
                onChange={e => setModuleTitle(e.target.value)} />
            </div>
            <button type="submit" disabled={savingModule} className="btn-primary">
              {savingModule ? 'Adding…' : 'Add'}
            </button>
            <button type="button" onClick={() => setShowModuleForm(false)} className="btn-secondary">
              Cancel
            </button>
          </form>
        )}

        {loadingModules ? (
          <div className="text-slate-400 text-sm animate-pulse py-8 text-center">Loading modules…</div>
        ) : modules.length === 0 ? (
          <div className="card text-center py-12 text-slate-500">
            <p className="mb-3">No modules yet. Add your first module above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {modules.map((mod, mi) => (
              <div key={mod.id} className="card p-0 overflow-hidden">
                {/* Module header */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs font-mono">M{mi + 1}</span>
                    <span className="text-white font-medium">{mod.title}</span>
                    <span className="text-slate-500 text-xs">· {mod.lessons?.length || 0} lessons</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openAddLesson(mod.id)}
                      className="text-xs text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-950 transition-colors flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Lesson
                    </button>
                    <button onClick={() => deleteModule(mod.id)}
                      className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-950 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>

                {/* Lessons */}
                {mod.lessons?.length > 0 ? (
                  <div className="divide-y divide-slate-800">
                    {mod.lessons.map((lesson, li) => (
                      <div key={lesson.id} className="flex items-center gap-3 px-5 py-3">
                        <span className="text-slate-600 text-xs font-mono w-6">{li + 1}</span>
                        <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-200 text-sm">{lesson.title}</p>
                          <p className="text-slate-500 text-xs truncate">{lesson.video_url}</p>
                        </div>
                        {lesson.is_preview && (
                          <span className="text-xs bg-blue-950 border border-blue-900 text-blue-400 px-2 py-0.5 rounded-full shrink-0">
                            Free Preview
                          </span>
                        )}
                        <span className="text-slate-500 text-xs shrink-0">
                          {Math.floor(lesson.duration_seconds / 60)}m
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-4 text-slate-600 text-sm">
                    No lessons yet — click "Add Lesson" above.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add lesson modal */}
        {showLessonForm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-white font-semibold">Add Lesson</h3>
                <button onClick={() => setShowLessonForm(false)} className="text-slate-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={saveLesson} className="p-6 space-y-4">
                <div>
                  <label className="label">Lesson Title</label>
                  <input className="input" required autoFocus
                    placeholder="e.g. What is Google Cloud?"
                    value={lessonForm.title} onChange={setLesson('title')} />
                </div>
                <div>
                  <label className="label">Video URL</label>
                  <input className="input" required type="url"
                    placeholder="https://cloud-elevate.b-cdn.net/..."
                    value={lessonForm.video_url} onChange={setLesson('video_url')} />
                  <p className="text-slate-500 text-xs mt-1">
                    Paste your Bunny.net CDN video URL here
                  </p>
                </div>
                <div>
                  <label className="label">Description <span className="text-slate-500">(optional)</span></label>
                  <input className="input"
                    placeholder="Brief description of this lesson"
                    value={lessonForm.description} onChange={setLesson('description')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Duration (seconds)</label>
                    <input className="input" type="number" min={0}
                      placeholder="e.g. 600 for 10 mins"
                      value={lessonForm.duration_seconds} onChange={setLesson('duration_seconds')} />
                  </div>
                  <div>
                    <label className="label">Order</label>
                    <input className="input" type="number" min={0}
                      value={lessonForm.order} onChange={setLesson('order')} />
                  </div>
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-blue-500"
                    checked={lessonForm.is_preview}
                    onChange={e => setLessonForm(f => ({ ...f, is_preview: e.target.checked }))} />
                  <span className="text-slate-300 text-sm">Free preview (visible without enrollment)</span>
                </label>
                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={savingLesson} className="btn-primary flex-1">
                    {savingLesson ? 'Adding…' : 'Add Lesson'}
                  </button>
                  <button type="button" onClick={() => setShowLessonForm(false)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Courses list ─────────────────────────────
  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Courses</h1>
          <p className="text-slate-400 text-sm mt-1">{courses.length} courses</p>
        </div>
        <button onClick={openCreateCourse} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Course
        </button>
      </div>

      {/* Course form modal */}
      {showCourseForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-white font-semibold">{editingCourse ? 'Edit Course' : 'New Course'}</h2>
              <button onClick={() => setShowCourseForm(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={saveCourse} className="p-6 space-y-4">
              <div>
                <label className="label">Title</label>
                <input className="input" required value={courseForm.title} onChange={setCourse('title')}
                  placeholder="GCP Associate Cloud Engineer" />
              </div>
              <div>
                <label className="label">Short Description</label>
                <input className="input" required value={courseForm.short_description} onChange={setCourse('short_description')}
                  placeholder="One-line summary shown on the course card" />
              </div>
              <div>
                <label className="label">Full Description</label>
                <textarea className="input min-h-[80px] resize-none" required value={courseForm.description} onChange={setCourse('description')}
                  placeholder="Detailed course description shown on the course detail page" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Price (₹)</label>
                  <input className="input" type="number" required min={0} value={courseForm.price} onChange={setCourse('price')} placeholder="999" />
                </div>
                <div>
                  <label className="label">Original Price (₹) <span className="text-slate-500">optional</span></label>
                  <input className="input" type="number" min={0} value={courseForm.original_price} onChange={setCourse('original_price')} placeholder="1999" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Level</label>
                  <select className="input" value={courseForm.level} onChange={setCourse('level')}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="label">Language</label>
                  <select className="input" value={courseForm.language} onChange={setCourse('language')}>
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
                  <label className="label">Total Duration (mins)</label>
                  <input className="input" type="number" min={0} value={courseForm.total_duration_mins} onChange={setCourse('total_duration_mins')} placeholder="180" />
                </div>
                <div>
                  <label className="label">Thumbnail URL <span className="text-slate-500">optional</span></label>
                  <input className="input" value={courseForm.thumbnail_url} onChange={setCourse('thumbnail_url')} placeholder="https://..." />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingCourse} className="btn-primary flex-1">
                  {savingCourse ? 'Saving…' : editingCourse ? 'Update Course' : 'Create Course'}
                </button>
                <button type="button" onClick={() => setShowCourseForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Courses table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 animate-pulse">Loading courses…</div>
        ) : courses.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p className="mb-3">No courses yet</p>
            <button onClick={openCreateCourse} className="btn-primary text-sm">Create First Course</button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-5 py-3 text-slate-400 text-xs font-medium">Course</th>
                <th className="text-left px-5 py-3 text-slate-400 text-xs font-medium hidden sm:table-cell">Price</th>
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
                        <div className="w-10 h-8 bg-blue-950 rounded-md shrink-0 flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <p className="text-white text-sm font-medium">{course.title}</p>
                        <p className="text-slate-500 text-xs">{course.total_duration_mins} mins · {course.level}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <span className="text-white text-sm font-medium">₹{course.price}</span>
                    {course.original_price && (
                      <span className="text-slate-500 text-xs line-through ml-1">₹{course.original_price}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => togglePublish(course)}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                        course.is_published
                          ? 'bg-green-950 border-green-900 text-green-400 hover:bg-green-900'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                      }`}>
                      {course.is_published ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openContent(course)}
                        className="text-xs text-green-400 hover:text-green-300 px-3 py-1.5 rounded-lg hover:bg-green-950 transition-colors">
                        Content
                      </button>
                      <button onClick={() => openEditCourse(course)}
                        className="text-xs text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-950 transition-colors">
                        Edit
                      </button>
                    </div>
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
