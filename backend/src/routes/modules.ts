import { Router, Response } from 'express'
import { supabase } from '../db/supabase'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/authenticate'

export const modulesRouter = Router()

// ── Create module inside a course ─────────────
modulesRouter.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { course_id, title, order } = req.body

    const { data: module, error } = await supabase
      .from('modules')
      .insert({ course_id, title, order: order ?? 0 })
      .select()
      .single()

    if (error) {
      console.error('[CREATE MODULE ERROR]', error)
      return res.status(400).json({ error: error.message })
    }
    res.status(201).json({ module })
  } catch (err) {
    console.error('[CREATE MODULE EXCEPTION]', err)
    res.status(500).json({ error: 'Failed to create module' })
  }
})

// ── List modules for a course ─────────────────
modulesRouter.get('/course/:courseId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { data: modules, error } = await supabase
      .from('modules')
      .select('*, lessons(*)')
      .eq('course_id', req.params.courseId)
      .order('order', { ascending: true })

    if (error) throw error
    modules?.forEach((m: any) => m.lessons?.sort((a: any, b: any) => a.order - b.order))
    res.json({ modules })
  } catch {
    res.status(500).json({ error: 'Failed to fetch modules' })
  }
})

// ── Delete module ─────────────────────────────
modulesRouter.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await supabase.from('modules').delete().eq('id', req.params.id)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to delete module' })
  }
})
