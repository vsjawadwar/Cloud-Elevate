import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { supabase } from '../db/supabase'

export interface AuthRequest extends Request {
  user?: { id: string; email: string; isAdmin: boolean }
  sessionId?: string
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]
    const secret = process.env.JWT_SECRET!

    // Verify JWT
    const decoded = jwt.verify(token, secret) as {
      userId: string
      email: string
      sessionId: string
      isAdmin: boolean
    }

    // Check session is still active in DB
    // This is how we detect credential sharing — if session was
    // invalidated (someone else logged in), this check fails
    const { data: session } = await supabase
      .from('user_sessions')
      .select('id, is_active')
      .eq('id', decoded.sessionId)
      .single()

    if (!session || !session.is_active) {
      return res.status(401).json({
        error: 'Session expired. Please login again.',
        code:  'SESSION_INVALIDATED'
      })
    }

    req.user      = { id: decoded.userId, email: decoded.email, isAdmin: decoded.isAdmin }
    req.sessionId = decoded.sessionId
    next()

  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// Admin only middleware — use after authenticate
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}
