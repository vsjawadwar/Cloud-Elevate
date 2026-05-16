import { Router, Request, Response } from 'express'
import jwt    from 'jsonwebtoken'
import axios  from 'axios'
import { supabase }     from '../db/supabase'
import { authenticate, AuthRequest } from '../middleware/authenticate'

export const authRouter = Router()

// ── Register ──────────────────────────────────
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' })
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      return res.status(400).json({ error: authError.message })
    }

    // Insert into our users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id:       authData.user.id,
        name,
        email,
        phone:    phone || null,
        is_admin: email === process.env.ADMIN_EMAIL
      })
      .select()
      .single()

    if (userError) {
      return res.status(400).json({ error: userError.message })
    }

    res.status(201).json({ message: 'Account created successfully', user })

  } catch (err) {
    res.status(500).json({ error: 'Registration failed' })
  }
})

// ── Login ─────────────────────────────────────
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Verify with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Get user from our table
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // ── Single session enforcement ────────────
    // Invalidate ALL previous sessions for this user
    // This logs out anyone sharing credentials
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', user.id)

    // Get IP geolocation
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || ''
    let city  = 'Unknown'
    try {
      const geo = await axios.get(`http://ip-api.com/json/${ip}`)
      city = geo.data?.city || 'Unknown'
    } catch { /* geo lookup failed — not critical */ }

    // Create new session record
    const { data: session } = await supabase
      .from('user_sessions')
      .insert({
        user_id:     user.id,
        device_info: req.headers['user-agent'] || '',
        ip_address:  ip,
        city,
        is_active:   true,
        last_seen_at: new Date().toISOString()
      })
      .select()
      .single()

    // Sign JWT with session ID embedded
    const token = jwt.sign(
      {
        userId:    user.id,
        email:     user.email,
        sessionId: session!.id,
        isAdmin:   user.is_admin
      },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    )

    res.json({
      token,
      user: {
        id:       user.id,
        name:     user.name,
        email:    user.email,
        isAdmin:  user.is_admin
      }
    })

  } catch (err) {
    res.status(500).json({ error: 'Login failed' })
  }
})

// ── Get current user ──────────────────────────
authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, phone, avatar_url, created_at')
      .eq('id', req.user!.id)
      .single()

    res.json({ user })
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// ── Logout ────────────────────────────────────
authRouter.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Invalidate current session
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('id', req.sessionId!)

    res.json({ message: 'Logged out successfully' })
  } catch {
    res.status(500).json({ error: 'Logout failed' })
  }
})
