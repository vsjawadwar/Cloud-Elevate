import 'dotenv/config'
import express      from 'express'
import cors         from 'cors'
import helmet       from 'helmet'
import morgan       from 'morgan'

import { authRouter     } from './routes/auth'
import { coursesRouter  } from './routes/courses'
import { modulesRouter  } from './routes/modules'
import { lessonsRouter  } from './routes/lessons'
import { quizRouter     } from './routes/quiz'
import { paymentsRouter } from './routes/payments'
import { progressRouter } from './routes/progress'
import { videoRouter    } from './routes/video'
import { adminRouter    } from './routes/admin'
import { sessionRouter  } from './routes/session'
import { errorHandler   } from './middleware/errorHandler'
import { notFound       } from './middleware/notFound'

const app  = express()
const PORT = process.env.PORT || 4000

// ── Security & logging ────────────────────────
app.use(helmet())
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// ── CORS ──────────────────────────────────────
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}))

// ── Body parsing ──────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Health check ──────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:  'ok',
    service: 'cloud-elevate-api',
    time:    new Date().toISOString()
  })
})

// ── Routes ────────────────────────────────────
app.use('/api/auth',     authRouter)
app.use('/api/courses',  coursesRouter)
app.use('/api/modules',  modulesRouter)
app.use('/api/lessons',  lessonsRouter)
app.use('/api/quiz',     quizRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/progress', progressRouter)
app.use('/api/video',    videoRouter)
app.use('/api/session',  sessionRouter)
app.use('/api/admin',    adminRouter)

// ── Error handling ────────────────────────────
app.use(notFound)
app.use(errorHandler)

// ── Start ─────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   Cloud Elevate API                   ║
  ║   Running on http://localhost:${PORT}   ║
  ║   Environment: ${process.env.NODE_ENV}            ║
  ╚═══════════════════════════════════════╝
  `)
})

export default app
