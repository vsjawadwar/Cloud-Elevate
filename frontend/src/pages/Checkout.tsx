import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import Navbar from '@/components/Navbar'
import toast from 'react-hot-toast'
import type { Course } from '@cloud-elevate/shared'

declare global {
  interface Window {
    Razorpay: any
  }
}

export default function Checkout() {
  const { courseId }              = useParams<{ courseId: string }>()
  const { user }                  = useAuthStore()
  const navigate                  = useNavigate()
  const [course, setCourse]       = useState<Course | null>(null)
  const [loading, setLoading]     = useState(true)
  const [paying, setPaying]       = useState(false)

  useEffect(() => {
    // Redirect if already enrolled
    Promise.all([
      api.get(`/api/courses/${courseId}`),
      api.get(`/api/courses/${courseId}/enrolled`)
    ]).then(([courseRes, enrollRes]) => {
      if (enrollRes.data.enrolled) {
        navigate(`/learn/${courseId}`)
        return
      }
      setCourse(courseRes.data.course)
    }).catch(() => navigate('/courses'))
      .finally(() => setLoading(false))
  }, [courseId])

  const handlePayment = async () => {
    if (!course || !user) return
    setPaying(true)

    try {
      const { data: orderData } = await api.post('/api/payments/create-order', { courseId })

      const options = {
        key:          import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount:       orderData.amount,
        currency:     orderData.currency,
        name:         'Cloud Elevate',
        description:  orderData.course.title,
        order_id:     orderData.orderId,
        prefill: {
          name:  user.name,
          email: user.email,
          contact: user.phone || ''
        },
        theme: { color: '#2563eb' },
        handler: async (response: any) => {
          try {
            await api.post('/api/payments/verify', {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              courseId
            })
            toast.success('Payment successful! You are now enrolled.')
            navigate(`/learn/${courseId}`)
          } catch {
            toast.error('Payment verification failed. Contact support.')
          }
        },
        modal: {
          ondismiss: () => setPaying(false)
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.')
        setPaying(false)
      })
      rzp.open()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to initiate payment')
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-32 text-slate-400 animate-pulse">Loading…</div>
      </div>
    )
  }

  if (!course) return null

  const savings = course.original_price ? course.original_price - course.price : 0

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <Link to={`/courses/${courseId}`} className="text-slate-400 hover:text-white text-sm transition-colors">
            ← Back to course
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-white mb-8">Complete Enrollment</h1>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Order summary */}
          <div className="md:col-span-3">
            <div className="card">
              <h2 className="text-white font-semibold mb-4">Order Summary</h2>

              <div className="flex gap-4 mb-5">
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title}
                    className="w-20 h-14 object-cover rounded-lg shrink-0" />
                ) : (
                  <div className="w-20 h-14 bg-gradient-to-br from-blue-950 to-slate-900 rounded-lg shrink-0" />
                )}
                <div>
                  <h3 className="text-white font-medium">{course.title}</h3>
                  <p className="text-slate-400 text-sm">{course.short_description}</p>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Original Price</span>
                  <span className="text-slate-300">₹{course.original_price || course.price}</span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400">Discount</span>
                    <span className="text-green-400">−₹{savings}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-base pt-2 border-t border-slate-800">
                  <span className="text-white">Total</span>
                  <span className="text-white">₹{course.price}</span>
                </div>
              </div>

              <ul className="mt-5 space-y-1.5 text-sm text-slate-400">
                {['1 year access', 'Certificate on completion', 'Practice quizzes', 'HD video lessons'].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Payment */}
          <div className="md:col-span-2">
            <div className="card">
              <h2 className="text-white font-semibold mb-2">Payment</h2>
              <p className="text-slate-400 text-xs mb-5">Secured by Razorpay. All major UPI, cards & wallets accepted.</p>

              {/* Buyer info */}
              <div className="bg-slate-800 rounded-lg px-4 py-3 mb-5">
                <p className="text-slate-300 text-sm font-medium">{user?.name}</p>
                <p className="text-slate-500 text-xs">{user?.email}</p>
              </div>

              <div className="text-3xl font-bold text-white mb-5">₹{course.price}</div>

              <button
                onClick={handlePayment}
                disabled={paying}
                className="btn-primary w-full"
              >
                {paying ? 'Opening payment…' : `Pay ₹${course.price}`}
              </button>

              <p className="text-slate-500 text-xs text-center mt-4">
                By enrolling, you agree to our terms of service.
              </p>

              <div className="flex items-center justify-center gap-2 mt-3">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-slate-500 text-xs">256-bit SSL encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
