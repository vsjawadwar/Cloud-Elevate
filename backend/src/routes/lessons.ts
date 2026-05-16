import { Router, Request, Response } from 'express'
import { supabase } from '../db/supabase'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/authenticate'

export const lessonsRouter = Router()

// ── Get single lesson ─────────────────────────
lessonsRouter.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { data: lesson } = await supabase
      .from('lessons')
      .select('*, chapters(*), modules(course_id)')
      .eq('id', req.params.id)
      .single()

    if (!lesson) return res.status(404).json({ error: 'Lesson not found' })

    // Check access — enrollment required unless preview
    if (!lesson.is_preview) {
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', req.user!.id)
        .eq('course_id', (lesson.modules as any).course_id)
        .single()

      if (!enrollment) {
        return res.status(403).json({ error: 'Not enrolled in this course' })
      }
    }

    lesson.chapters?.sort((a: any, b: any) => a.start_seconds - b.start_seconds)

    res.json({ lesson })
  } catch {
    res.status(500).json({ error: 'Failed to fetch lesson' })
  }
})

// ── Admin: create lesson ──────────────────────
lessonsRouter.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { module_id, title, description, video_url,
            duration_seconds, order, is_preview } = req.body

    const { data: lesson, error } = await supabase
      .from('lessons')
      .insert({ module_id, title, description, video_url,
                duration_seconds, order, is_preview: is_preview || false })
      .select()
      .single()

    if (error) throw error
    res.status(201).json({ lesson })
  } catch {
    res.status(500).json({ error: 'Failed to create lesson' })
  }
})
