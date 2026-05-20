import { Router, Response } from 'express'
import Razorpay from 'razorpay'
import crypto   from 'crypto'
import { supabase } from '../db/supabase'
import { authenticate, AuthRequest } from '../middleware/authenticate'
import { sendEnrollmentEmail, sendAdminPurchaseAlert } from '../lib/email'

export const paymentsRouter = Router()

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
})

// ── Create Razorpay order ─────────────────────
paymentsRouter.post('/create-order', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.body

    // Check if already enrolled
    const { data: existing } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', req.user!.id)
      .eq('course_id', courseId)
      .single()

    if (existing) {
      return res.status(400).json({ error: 'Already enrolled in this course' })
    }

    // Get course price
    const { data: course } = await supabase
      .from('courses')
      .select('id, title, price')
      .eq('id', courseId)
      .single()

    if (!course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    // Amount in paise (₹999 = 99900 paise)
    const amountPaise = course.price * 100

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount:   amountPaise,
      currency: 'INR',
      receipt:  `ce_${courseId.slice(0, 8)}_${Date.now()}`
    })

    // Save payment record
    await supabase.from('payments').insert({
      user_id:           req.user!.id,
      course_id:         courseId,
      razorpay_order_id: order.id,
      amount:            amountPaise,
      currency:          'INR',
      status:            'created'
    })

    res.json({
      orderId:  order.id,
      amount:   amountPaise,
      currency: 'INR',
      course:   { title: course.title }
    })

  } catch {
    res.status(500).json({ error: 'Failed to create payment order' })
  }
})

// ── Verify payment & enroll student ──────────
paymentsRouter.post('/verify', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId
    } = req.body

    // Verify Razorpay signature
    const body      = `${razorpay_order_id}|${razorpay_payment_id}`
    const expected  = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex')

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' })
    }

    // Update payment status
    await supabase
      .from('payments')
      .update({
        razorpay_payment_id,
        status: 'paid'
      })
      .eq('razorpay_order_id', razorpay_order_id)

    // Enroll student
    const { data: enrollment } = await supabase
      .from('enrollments')
      .insert({
        user_id:    req.user!.id,
        course_id:  courseId,
        payment_id: razorpay_payment_id
      })
      .select()
      .single()

    // Send emails (non-blocking)
    Promise.all([
      supabase.from('users').select('name').eq('id', req.user!.id).single(),
      supabase.from('courses').select('title, price').eq('id', courseId).single()
    ]).then(([{ data: u }, { data: c }]) => {
      if (u && c) {
        sendEnrollmentEmail(req.user!.email, u.name, c.title)
        if (process.env.ADMIN_EMAIL) {
          sendAdminPurchaseAlert(process.env.ADMIN_EMAIL, u.name, req.user!.email, c.title, c.price)
        }
      }
    }).catch(() => {})

    res.json({
      success:    true,
      message:    'Payment verified. You are now enrolled!',
      enrollment
    })

  } catch {
    res.status(500).json({ error: 'Payment verification failed' })
  }
})
