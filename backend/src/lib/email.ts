import nodemailer from 'nodemailer'

const configured = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)

const transporter = configured
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    })
  : null

async function send(to: string, subject: string, html: string) {
  if (!transporter) {
    console.log(`[EMAIL SKIPPED] To: ${to} | Subject: ${subject}`)
    return
  }
  try {
    await transporter.sendMail({
      from: `"Cloud Elevate" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html
    })
  } catch (err) {
    console.error('[EMAIL ERROR]', err)
  }
}

export async function sendEnrollmentEmail(to: string, name: string, courseTitle: string) {
  const subject = `You're enrolled in ${courseTitle}!`
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px">
      <div style="margin-bottom:24px">
        <span style="background:#2563eb;color:#fff;padding:6px 14px;border-radius:8px;font-weight:700;font-size:14px">
          Cloud Elevate
        </span>
      </div>
      <h1 style="color:#fff;font-size:22px;margin:0 0 12px">Enrollment Confirmed!</h1>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 20px">
        Hi ${name}, you're now enrolled in <strong style="color:#fff">${courseTitle}</strong>.
        You have lifetime access — start learning whenever you're ready.
      </p>
      <a href="${process.env.FRONTEND_URL}/dashboard"
        style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
        Go to Dashboard →
      </a>
      <p style="color:#475569;font-size:12px;margin-top:32px">
        Cloud Elevate — GCP Certification Platform
      </p>
    </div>
  `
  await send(to, subject, html)
}

export async function sendModuleCompletionEmail(
  to: string,
  name: string,
  moduleTitle: string,
  courseTitle: string,
  courseId: string
) {
  const subject = `You completed "${moduleTitle}"!`
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px">
      <div style="margin-bottom:24px">
        <span style="background:#2563eb;color:#fff;padding:6px 14px;border-radius:8px;font-weight:700;font-size:14px">
          Cloud Elevate
        </span>
      </div>
      <h1 style="color:#fff;font-size:22px;margin:0 0 12px">Module Complete!</h1>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 8px">
        Great work, ${name}!
      </p>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 20px">
        You've completed <strong style="color:#fff">${moduleTitle}</strong> in
        <strong style="color:#fff">${courseTitle}</strong>. Keep going!
      </p>
      <a href="${process.env.FRONTEND_URL}/learn/${courseId}"
        style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
        Continue Learning →
      </a>
      <p style="color:#475569;font-size:12px;margin-top:32px">
        Cloud Elevate — GCP Certification Platform
      </p>
    </div>
  `
  await send(to, subject, html)
}
