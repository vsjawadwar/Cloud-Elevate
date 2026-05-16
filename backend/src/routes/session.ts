import { Router, Response } from 'express'
import { supabase } from '../db/supabase'
import { authenticate, AuthRequest } from '../middleware/authenticate'

export const sessionRouter = Router()

// ── Heartbeat ─────────────────────────────────
// Frontend calls this every 30 seconds while watching a video
// If session was invalidated (credential sharing detected),
// returns 401 and frontend auto-logs out the user
sessionRouter.post('/heartbeat', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Update last_seen — session is still active
    await supabase
      .from('user_sessions')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', req.sessionId!)

    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Heartbeat failed' })
  }
})

// ── Get my active sessions ────────────────────
// Student can see where they're logged in
sessionRouter.get('/my-sessions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { data: sessions } = await supabase
      .from('user_sessions')
      .select('id, device_info, ip_address, city, last_seen_at, created_at')
      .eq('user_id', req.user!.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    res.json({ sessions })
  } catch {
    res.status(500).json({ error: 'Failed to fetch sessions' })
  }
})
