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
