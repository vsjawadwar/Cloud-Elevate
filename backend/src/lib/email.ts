import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    console.log(`[EMAIL SKIPPED] To: ${to} | Subject: ${subject}`)
    return
  }
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'Cloud Elevate <noreply@thecloudelevate.in>',
      to,
      subject,
      html
    })
  } catch (err) {
    console.error('[EMAIL ERROR]', err)
  }
}

// ── Shared blocks ─────────────────────────────

const header = `
  <div style="margin-bottom:24px">
    <span style="background:#2563eb;color:#fff;padding:6px 14px;border-radius:8px;font-weight:700;font-size:14px">
      Cloud Elevate
    </span>
  </div>`

const termsBlock = `
  <div style="background:#1c1917;border:1px solid #dc2626;border-radius:10px;padding:18px;margin:24px 0">
    <p style="color:#fca5a5;font-size:13px;font-weight:700;margin:0 0 10px">
      ⚠️ Individual Use Only — Please Read
    </p>
    <ul style="color:#94a3b8;font-size:12px;margin:0;padding-left:16px;line-height:2">
      <li>This course is licensed for <strong style="color:#e2e8f0">your personal use only</strong></li>
      <li>Do not share your login credentials with anyone</li>
      <li>Do not share course content with anyone</li>
      <li>Your registered email is displayed as a <strong style="color:#e2e8f0">live watermark</strong> on every video to deter misuse</li>
      <li>Sharing or misuse will result in <strong style="color:#fca5a5">immediate account suspension</strong></li>
    </ul>
    <p style="color:#64748b;font-size:12px;margin:12px 0 0">
      For support: <a href="mailto:thecloudelevate@gmail.com" style="color:#60a5fa;text-decoration:none">thecloudelevate@gmail.com</a>
    </p>
  </div>`

const footer = `
  <p style="color:#475569;font-size:12px;margin-top:28px;border-top:1px solid #1e293b;padding-top:16px">
    Cloud Elevate — Upskill. Certify. Succeed.<br>
    <span style="color:#334155">Support: thecloudelevate@gmail.com</span>
  </p>`

const wrap = (content: string) => `
  <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px">
    ${header}
    ${content}
    ${footer}
  </div>`

// ── Emails ────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  const subject = `Welcome to Cloud Elevate, ${name.split(' ')[0]}!`
  const html = wrap(`
    <h1 style="color:#fff;font-size:24px;margin:0 0 12px">Welcome aboard, ${name.split(' ')[0]}! 👋</h1>
    <p style="color:#94a3b8;line-height:1.7;margin:0 0 16px">
      Your Cloud Elevate account is ready. Browse our courses, enroll, and start learning
      at your own pace.
    </p>
    <a href="${process.env.FRONTEND_URL}/courses"
      style="background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;margin-bottom:24px">
      Browse Courses →
    </a>
    <div style="background:#1e293b;border-radius:10px;padding:20px;margin-bottom:4px">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 10px;font-weight:600">What's included with every course:</p>
      <ul style="color:#64748b;font-size:13px;margin:0;padding-left:18px;line-height:2">
        <li>HD video lessons with <strong style="color:#e2e8f0">1 year access</strong></li>
        <li>Practice quizzes &amp; mock exams</li>
        <li>Verified completion certificate</li>
      </ul>
    </div>
    ${termsBlock}
  `)
  await send(to, subject, html)
}

export async function sendEnrollmentEmail(to: string, name: string, courseTitle: string) {
  const subject = `You're enrolled in ${courseTitle}!`
  const html = wrap(`
    <h1 style="color:#fff;font-size:22px;margin:0 0 12px">Enrollment Confirmed! 🎉</h1>
    <p style="color:#94a3b8;line-height:1.7;margin:0 0 8px">
      Hi ${name.split(' ')[0]}, you're now enrolled in
      <strong style="color:#fff">${courseTitle}</strong>.
    </p>
    <p style="color:#94a3b8;line-height:1.7;margin:0 0 20px">
      You have <strong style="color:#fff">1 year access</strong> from the date of purchase —
      start learning whenever you're ready.
    </p>
    <a href="${process.env.FRONTEND_URL}/dashboard"
      style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
      Go to Dashboard →
    </a>
    ${termsBlock}
  `)
  await send(to, subject, html)
}

export async function sendModuleCompletionEmail(
  to: string,
  name: string,
  moduleTitle: string,
  courseTitle: string,
  courseId: string
) {
  const subject = `Module Complete — "${moduleTitle}"`
  const html = wrap(`
    <h1 style="color:#fff;font-size:22px;margin:0 0 12px">Module Complete! ✅</h1>
    <p style="color:#94a3b8;line-height:1.7;margin:0 0 8px">Great work, ${name.split(' ')[0]}!</p>
    <p style="color:#94a3b8;line-height:1.7;margin:0 0 20px">
      You've completed <strong style="color:#fff">${moduleTitle}</strong> in
      <strong style="color:#fff">${courseTitle}</strong>. Keep going!
    </p>
    <a href="${process.env.FRONTEND_URL}/learn/${courseId}"
      style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
      Continue Learning →
    </a>
    ${termsBlock}
  `)
  await send(to, subject, html)
}

export async function sendCourseCompletionEmail(
  to: string,
  name: string,
  courseTitle: string,
  enrollmentId: string
) {
  const subject = `You completed "${courseTitle}" — Claim your certificate!`
  const html = wrap(`
    <div style="text-align:center;padding:20px 0 24px">
      <div style="font-size:48px;margin-bottom:12px">🏆</div>
      <h1 style="color:#fff;font-size:24px;margin:0 0 8px">Course Completed!</h1>
      <p style="color:#94a3b8;margin:0">You did it, ${name.split(' ')[0]}!</p>
    </div>
    <p style="color:#94a3b8;line-height:1.7;margin:0 0 8px">
      Congratulations on completing <strong style="color:#fff">${courseTitle}</strong>.
      Your verified certificate is ready to download and share.
    </p>
    <p style="color:#94a3b8;line-height:1.7;margin:0 0 24px">
      Add it to your LinkedIn profile or resume to showcase your achievement.
    </p>
    <a href="${process.env.FRONTEND_URL}/certificate/${enrollmentId}"
      style="background:#16a34a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
      Download Certificate →
    </a>
    ${termsBlock}
  `)
  await send(to, subject, html)
}

export async function sendAdminPurchaseAlert(
  adminEmail: string,
  studentName: string,
  studentEmail: string,
  courseTitle: string,
  amountINR: number
) {
  const subject = `New Purchase — ₹${amountINR} from ${studentName}`
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px">
      <div style="margin-bottom:24px">
        <span style="background:#2563eb;color:#fff;padding:6px 14px;border-radius:8px;font-weight:700;font-size:14px">Cloud Elevate Admin</span>
      </div>
      <h1 style="color:#fff;font-size:20px;margin:0 0 20px">New Course Purchase 💰</h1>
      <div style="background:#1e293b;border-radius:10px;padding:20px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr>
            <td style="color:#64748b;padding:7px 0">Student</td>
            <td style="color:#fff;text-align:right;padding:7px 0">${studentName}</td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:7px 0">Email</td>
            <td style="color:#fff;text-align:right;padding:7px 0">${studentEmail}</td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:7px 0">Course</td>
            <td style="color:#fff;text-align:right;padding:7px 0">${courseTitle}</td>
          </tr>
          <tr style="border-top:1px solid #334155">
            <td style="color:#22c55e;padding:12px 0 4px;font-weight:700">Amount Received</td>
            <td style="color:#22c55e;text-align:right;padding:12px 0 4px;font-weight:700;font-size:20px">₹${amountINR}</td>
          </tr>
        </table>
      </div>
      <a href="${process.env.FRONTEND_URL}/admin/students"
        style="background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
        View in Admin Panel →
      </a>
      <p style="color:#475569;font-size:12px;margin-top:28px;border-top:1px solid #1e293b;padding-top:16px">
        ${new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}
      </p>
    </div>`
  await send(adminEmail, subject, html)
}

export async function sendOtpEmail(to: string, name: string, otp: string) {
  const subject = 'Your Password Reset OTP — Cloud Elevate'
  const html = wrap(`
    <h1 style="color:#fff;font-size:22px;margin:0 0 12px">Reset Your Password</h1>
    <p style="color:#94a3b8;line-height:1.6;margin:0 0 24px">
      Hi ${name.split(' ')[0]}, use the OTP below to reset your password.
      It expires in <strong style="color:#fff">10 minutes</strong>.
    </p>
    <div style="background:#1e293b;border:2px dashed #2563eb;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px">
      <div style="font-size:40px;font-weight:700;letter-spacing:14px;color:#fff;font-family:monospace">${otp}</div>
    </div>
    <p style="color:#64748b;font-size:13px;margin:0">
      If you did not request this, ignore this email. Your password remains unchanged.<br>
      For support: <a href="mailto:thecloudelevate@gmail.com" style="color:#60a5fa;text-decoration:none">thecloudelevate@gmail.com</a>
    </p>
  `)
  await send(to, subject, html)
}
