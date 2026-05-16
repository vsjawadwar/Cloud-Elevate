import { Router, Response } from 'express'
import crypto from 'crypto'
import { supabase } from '../db/supabase'
import { authenticate, AuthRequest } from '../middleware/authenticate'

export const videoRouter = Router()

// ── Get signed video URL ──────────────────────
// Only enrolled students can get a signed URL
// URL expires in 2 hours — useless if shared
videoRouter.get('/signed-url/:lessonId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params

    // Fetch lesson
    const { data: lesson } = await supabase
      .from('lessons')
      .select('id, video_url, module_id, is_preview, modules(course_id)')
      .eq('id', lessonId)
      .single()

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' })
    }

    const courseId = (lesson.modules as any)?.course_id

    // Allow free previews without enrollment check
    if (!lesson.is_preview) {
      // Check enrollment
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', req.user!.id)
        .eq('course_id', courseId)
        .single()

      if (!enrollment) {
        return res.status(403).json({ error: 'Not enrolled in this course' })
      }
    }

    // Generate Bunny.net signed URL
    const signedUrl = generateBunnySignedUrl(lesson.video_url)

    // Log the watch event for analytics + leak tracing
    await supabase.from('video_watch_logs').insert({
      user_id:    req.user!.id,
      lesson_id:  lessonId,
      session_id: req.sessionId,
      ip_address: req.ip
    })

    res.json({ signedUrl })
  } catch {
    res.status(500).json({ error: 'Failed to generate video URL' })
  }
})

// ── Bunny.net signed URL generator ───────────
function generateBunnySignedUrl(videoUrl: string): string {
  const bunnyHostname = process.env.BUNNY_CDN_HOSTNAME!
  const bunnyApiKey   = process.env.BUNNY_API_KEY!

  // Token expires in 2 hours
  const expiryTime  = Math.floor(Date.now() / 1000) + (2 * 60 * 60)
  const urlPath     = new URL(videoUrl).pathname

  // SHA256 hash: APIKey + URLPath + ExpiryTime
  const hashInput = `${bunnyApiKey}${urlPath}${expiryTime}`
  const token     = crypto
    .createHash('sha256')
    .update(hashInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  return `${bunnyHostname}${urlPath}?token=${token}&expires=${expiryTime}`
}
