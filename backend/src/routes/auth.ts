import { Router, Request, Response } from 'express'
import jwt    from 'jsonwebtoken'
import axios  from 'axios'
import { supabase }     from '../db/supabase'
import { authenticate, AuthRequest } from '../middleware/authenticate'
import { sendOtpEmail, sendWelcomeEmail } from '../lib/email'

export const authRouter = Router()

// ── Register ──────────────────────────────────
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ error: 'Name, email, phone and password are required' })
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

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, name).catch(() => {})

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

// ── Update profile ────────────────────────────
authRouter.patch('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })

    const { data: user, error } = await supabase
      .from('users')
      .update({ name, phone: phone || null })
      .eq('id', req.user!.id)
      .select('id, name, email, phone, avatar_url, created_at')
      .single()

    if (error) throw error
    res.json({ user })
  } catch {
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

// ── Forgot Password — Send OTP ────────────────
authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })

    const { data: user } = await supabase
      .from('users')
      .select('id, name')
      .eq('email', email.toLowerCase().trim())
      .single()

    // Always return same message — don't reveal if email exists
    if (!user) {
      return res.json({ message: 'If this email is registered, an OTP has been sent.' })
    }

    const otp       = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Remove any existing OTPs for this email
    await supabase.from('password_reset_otps').delete().eq('email', email)

    await supabase.from('password_reset_otps').insert({
      email: email.toLowerCase().trim(),
      otp,
      expires_at: expiresAt,
      used: false
    })

    await sendOtpEmail(email, user.name, otp)

    res.json({ message: 'If this email is registered, an OTP has been sent.' })
  } catch {
    res.status(500).json({ error: 'Failed to send OTP' })
  }
})

// ── Verify Reset OTP ──────────────────────────
authRouter.post('/verify-reset-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' })

    const { data: record } = await supabase
      .from('password_reset_otps')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('otp', otp)
      .eq('used', false)
      .single()

    if (!record) return res.status(400).json({ error: 'Invalid OTP. Please check and try again.' })
    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' })
    }

    res.json({ valid: true })
  } catch {
    res.status(500).json({ error: 'Failed to verify OTP' })
  }
})

// ── Reset Password ────────────────────────────
authRouter.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP and new password are required' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    // Re-verify OTP before resetting
    const { data: record } = await supabase
      .from('password_reset_otps')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('otp', otp)
      .eq('used', false)
      .single()

    if (!record) return res.status(400).json({ error: 'Invalid or expired OTP.' })
    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' })
    }

    // Get Supabase Auth user
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const authUser = users.find(u => u.email === email.toLowerCase().trim())
    if (!authUser) return res.status(404).json({ error: 'User not found' })

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: newPassword
    })
    if (updateError) throw updateError

    // Mark OTP as used
    await supabase.from('password_reset_otps').update({ used: true }).eq('id', record.id)

    res.json({ message: 'Password reset successfully. Please login with your new password.' })
  } catch {
    res.status(500).json({ error: 'Failed to reset password' })
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
