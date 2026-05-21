import { Router, Request, Response } from 'express'
import { supabase } from '../db/supabase'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/authenticate'

export const coursesRouter = Router()

// ── Get all published courses (public) ────────
coursesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ courses })
  } catch {
    res.status(500).json({ error: 'Failed to fetch courses' })
  }
})

// ── Get single course with modules + lessons ──
coursesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { data: course, error } = await supabase
      .from('courses')
      .select(`
        *,
        modules (
          id, title, order,
          lessons (
            id, title, description, duration_seconds,
            order, is_preview
          )
        )
      `)
      .eq('id', req.params.id)
      .eq('is_published', true)
      .single()

    if (error || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    // Sort modules and lessons by order
    course.modules?.sort((a: any, b: any) => a.order - b.order)
    course.modules?.forEach((m: any) => {
      m.lessons?.sort((a: any, b: any) => a.order - b.order)
    })

    res.json({ course })
  } catch {
    res.status(500).json({ error: 'Failed to fetch course' })
  }
})

// ── Get certificate data by enrollment ID ─────
coursesRouter.get('/enrollments/:enrollmentId/certificate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { data: enrollment, error: enrollErr } = await supabase
      .from('enrollments')
      .select('id, enrolled_at, course_id, user_id, courses(id, title)')
      .eq('id', req.params.enrollmentId)
      .eq('user_id', req.user!.id)
      .single()

    if (enrollErr || !enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' })
    }

    const course: any = Array.isArray(enrollment.courses) ? enrollment.courses[0] : enrollment.courses
    if (!course) return res.status(404).json({ error: 'Course not found' })

    // Count total lessons in the course
    const { data: modules } = await supabase
      .from('modules')
      .select('id, lessons(id)')
      .eq('course_id', course.id)

    const allLessonIds: string[] = []
    modules?.forEach((m: any) => m.lessons?.forEach((l: any) => allLessonIds.push(l.id)))
    const totalLessons = allLessonIds.length

    let completedCount = 0
    if (totalLessons > 0) {
      const { count } = await supabase
        .from('lesson_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', req.user!.id)
        .eq('completed', true)
        .in('lesson_id', allLessonIds)
      completedCount = count || 0
    }

    const percentage = totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100)

    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('id', req.user!.id)
      .single()

    res.json({
      studentName: user?.name || 'Student',
      courseName:  course.title,
      courseId:    course.id,
      enrolledAt:  enrollment.enrolled_at,
      percentage
    })
  } catch (err) {
    console.error('[CERTIFICATE ERROR]', err)
    res.status(500).json({ error: 'Failed to load certificate' })
  }
})

// ── Check enrollment ──────────────────────────
coursesRouter.get('/:id/enrolled', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id, enrolled_at')
      .eq('user_id', req.user!.id)
      .eq('course_id', req.params.id)
      .single()

    res.json({ enrolled: !!enrollment, enrollment })
  } catch {
    res.status(500).json({ error: 'Failed to check enrollment' })
  }
})

// ── Admin: create course ──────────────────────
coursesRouter.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, short_description, price, original_price,
            thumbnail_url, level, language, total_duration_mins } = req.body

    const { data: course, error } = await supabase
      .from('courses')
      .insert({
        title,
        description,
        short_description,
        price:               Number(price),
        original_price:      original_price ? Number(original_price) : null,
        thumbnail_url:       thumbnail_url || null,
        level,
        language,
        total_duration_mins: Number(total_duration_mins) || 0,
        is_published:        false
      })
      .select()
      .single()

    if (error) {
      console.error('[CREATE COURSE ERROR]', error)
      return res.status(400).json({ error: error.message })
    }
    res.status(201).json({ course })
  } catch (err) {
    console.error('[CREATE COURSE EXCEPTION]', err)
    res.status(500).json({ error: 'Failed to create course' })
  }
})

// ── Admin: update course ──────────────────────
coursesRouter.patch('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { data: course, error } = await supabase
      .from('courses')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error
    res.json({ course })
  } catch {
    res.status(500).json({ error: 'Failed to update course' })
  }
})
