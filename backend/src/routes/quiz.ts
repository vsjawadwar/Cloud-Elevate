import { Router, Response } from 'express'
import { supabase } from '../db/supabase'
import { authenticate, AuthRequest } from '../middleware/authenticate'

export const quizRouter = Router()

// ── Get quiz info + questions (without correct answers) ──
quizRouter.get('/:quizId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { data: quiz } = await supabase
      .from('quizzes')
      .select(`
        id, title, description, time_limit_mins,
        passing_score, total_questions, max_attempts,
        questions (
          id, question_text, order,
          options ( id, option_text )
        )
      `)
      .eq('id', req.params.quizId)
      .single()

    if (!quiz) return res.status(404).json({ error: 'Quiz not found' })

    // Check attempts used
    const { count } = await supabase
      .from('quiz_attempts')
      .select('id', { count: 'exact' })
      .eq('user_id', req.user!.id)
      .eq('quiz_id', req.params.quizId)
      .not('submitted_at', 'is', null)

    const attemptsUsed = count || 0

    if (attemptsUsed >= quiz.max_attempts) {
      return res.status(403).json({
        error: `Maximum ${quiz.max_attempts} attempts reached`
      })
    }

    // Shuffle questions and options
    quiz.questions = shuffleArray(quiz.questions)
    quiz.questions.forEach((q: any) => {
      q.options = shuffleArray(q.options)
    })

    res.json({ quiz, attemptsUsed, attemptsLeft: quiz.max_attempts - attemptsUsed })
  } catch {
    res.status(500).json({ error: 'Failed to fetch quiz' })
  }
})

// ── Start quiz attempt ────────────────────────
quizRouter.post('/:quizId/start', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { data: attempt } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id:    req.user!.id,
        quiz_id:    req.params.quizId,
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    res.json({ attemptId: attempt!.id })
  } catch {
    res.status(500).json({ error: 'Failed to start quiz' })
  }
})

// ── Submit quiz ───────────────────────────────
quizRouter.post('/:quizId/submit', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId, answers } = req.body
    // answers: [{ questionId, selectedOptionId }]

    // Get correct answers
    const questionIds = answers.map((a: any) => a.questionId)
    const { data: options } = await supabase
      .from('options')
      .select('id, question_id, is_correct')
      .in('question_id', questionIds)

    // Calculate score
    let correct = 0
    const answerRecords = answers.map((a: any) => {
      const selectedOption = options?.find((o: any) => o.id === a.selectedOptionId)
      const isCorrect      = selectedOption?.is_correct || false
      if (isCorrect) correct++

      return {
        attempt_id:         attemptId,
        question_id:        a.questionId,
        selected_option_id: a.selectedOptionId
      }
    })

    const totalQuestions = answers.length
    const score          = Math.round((correct / totalQuestions) * 100)

    // Get passing score for this quiz
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('passing_score')
      .eq('id', req.params.quizId)
      .single()

    const passed = score >= (quiz?.passing_score || 70)

    // Save answers
    await supabase.from('quiz_answers').insert(answerRecords)

    // Update attempt
    await supabase
      .from('quiz_attempts')
      .update({ score, passed, submitted_at: new Date().toISOString() })
      .eq('id', attemptId)

    res.json({ score, passed, correct, total: totalQuestions, attemptId })
  } catch {
    res.status(500).json({ error: 'Failed to submit quiz' })
  }
})

// ── Get attempt result with explanations ──────
quizRouter.get('/result/:attemptId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { data: attempt } = await supabase
      .from('quiz_attempts')
      .select(`
        id, score, passed, started_at, submitted_at,
        quiz_answers (
          question_id, selected_option_id,
          questions ( question_text, explanation,
            options ( id, option_text, is_correct )
          )
        )
      `)
      .eq('id', req.params.attemptId)
      .eq('user_id', req.user!.id)
      .single()

    if (!attempt) return res.status(404).json({ error: 'Attempt not found' })

    res.json({ attempt })
  } catch {
    res.status(500).json({ error: 'Failed to fetch result' })
  }
})

// ── Utility ───────────────────────────────────
function shuffleArray<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}
