import { Router, Response } from 'express'
import { supabase } from '../db/supabase'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/authenticate'

export const adminRouter = Router()

// All admin routes require auth + admin role
adminRouter.use(authenticate, requireAdmin)

// ── Dashboard stats ───────────────────────────
adminRouter.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const [users, enrollments, payments] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact' }),
      supabase.from('enrollments').select('id', { count: 'exact' }),
      supabase.from('payments').select('amount').eq('status', 'paid')
    ])

    const totalRevenue = payments.data?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0

    res.json({
      totalStudents:   users.count  || 0,
      totalEnrollments: enrollments.count || 0,
      totalRevenuePaise: totalRevenue,
      totalRevenueINR:   totalRevenue / 100
    })
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// ── All students ──────────────────────────────
adminRouter.get('/students', async (_req: AuthRequest, res: Response) => {
  try {
    const { data: students } = await supabase
      .from('users')
      .select(`
        id, name, email, phone, created_at,
        enrollments ( id, course_id, enrolled_at ),
        user_sessions ( id, created_at, last_seen_at, is_active, device_info, ip_address, city )
      `)
      .eq('is_admin', false)
      .order('created_at', { ascending: false })

    res.json({ students })
  } catch {
    res.status(500).json({ error: 'Failed to fetch students' })
  }
})

// ── Student login activity ────────────────────
adminRouter.get('/students/:id/activity', async (req: AuthRequest, res: Response) => {
  try {
    const { data: sessions } = await supabase
      .from('user_sessions')
      .select('id, created_at, last_seen_at, is_active, device_info, ip_address, city')
      .eq('user_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(30)

    res.json({ sessions: sessions || [] })
  } catch {
    res.status(500).json({ error: 'Failed to fetch activity' })
  }
})

// ── Suspicious activity ───────────────────────
// Students with multiple active sessions or many different IPs
adminRouter.get('/suspicious', async (_req: AuthRequest, res: Response) => {
  try {
    const { data: sessions } = await supabase
      .from('user_sessions')
      .select(`
        user_id, ip_address, city, device_info,
        last_seen_at, created_at,
        users ( name, email )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    // Group by user and flag those with multiple distinct IPs
    const grouped: Record<string, any> = {}
    sessions?.forEach((s: any) => {
      if (!grouped[s.user_id]) {
        grouped[s.user_id] = {
          user:     s.users,
          sessions: []
        }
      }
      grouped[s.user_id].sessions.push(s)
    })

    const suspicious = Object.values(grouped).filter(
      (u: any) => u.sessions.length > 1
    )

    res.json({ suspicious })
  } catch {
    res.status(500).json({ error: 'Failed to fetch suspicious activity' })
  }
})

// ── Suspend student account ───────────────────
adminRouter.post('/students/:id/suspend', async (req: AuthRequest, res: Response) => {
  try {
    // Invalidate all their sessions
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', req.params.id)

    // Mark user as suspended
    await supabase
      .from('users')
      .update({ is_suspended: true })
      .eq('id', req.params.id)

    res.json({ message: 'Student account suspended' })
  } catch {
    res.status(500).json({ error: 'Failed to suspend student' })
  }
})
