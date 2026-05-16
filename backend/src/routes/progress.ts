import { Router, Response } from 'express'
import { supabase } from '../db/supabase'
import { authenticate, AuthRequest } from '../middleware/authenticate'

export const progressRouter = Router()

// ── Save lesson progress (called every 10 seconds) ──
progressRouter.post('/save', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { lesson_id, watched_seconds, completed } = req.body

    await supabase
      .from('lesson_progress')
      .upsert({
        user_id:         req.user!.id,
        lesson_id,
        watched_seconds,
        completed:       completed || false,
        last_watched_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,lesson_id'
      })

    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to save progress' })
  }
})

// ── Get progress for a lesson ─────────────────
progressRouter.get('/:lessonId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('watched_seconds, completed')
      .eq('user_id', req.user!.id)
      .eq('lesson_id', req.params.lessonId)
      .single()

    res.json({
      watched_seconds: progress?.watched_seconds || 0,
      completed:       progress?.completed || false
    })
  } catch {
    res.status(500).json({ error: 'Failed to fetch progress' })
  }
})

// ── Get course completion % ───────────────────
progressRouter.get('/course/:courseId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Get all lessons in course
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, modules!inner(course_id)')
      .eq('modules.course_id', req.params.courseId)

    if (!lessons?.length) {
      return res.json({ percentage: 0, completed: 0, total: 0 })
    }

    const lessonIds = lessons.map((l: any) => l.id)

    // Get completed lessons for this user
    const { data: completed } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', req.user!.id)
      .eq('completed', true)
      .in('lesson_id', lessonIds)

    const total       = lessons.length
    const completedCount = completed?.length || 0
    const percentage  = Math.round((completedCount / total) * 100)

    res.json({ percentage, completed: completedCount, total })
  } catch {
    res.status(500).json({ error: 'Failed to fetch course progress' })
  }
})
