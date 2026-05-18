import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import Navbar from '@/components/Navbar'
import type { Quiz as QuizType, Question } from '@cloud-elevate/shared'

export default function Quiz() {
  const { quizId }                          = useParams<{ quizId: string }>()
  const navigate                            = useNavigate()

  const [quiz, setQuiz]                     = useState<QuizType & { questions: Question[] } | null>(null)
  const [attemptId, setAttemptId]           = useState('')
  const [answers, setAnswers]               = useState<Record<string, string>>({})
  const [current, setCurrent]               = useState(0)
  const [timeLeft, setTimeLeft]             = useState(0)
  const [loading, setLoading]               = useState(true)
  const [submitting, setSubmitting]         = useState(false)
  const [error, setError]                   = useState('')
  const timerRef                            = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    api.get(`/api/quiz/${quizId}`)
      .then(async r => {
        setQuiz(r.data.quiz)
        setTimeLeft(r.data.quiz.time_limit_mins * 60)
        const startRes = await api.post(`/api/quiz/${quizId}/start`)
        setAttemptId(startRes.data.attemptId)
      })
      .catch(err => setError(err.response?.data?.error || 'Failed to load quiz'))
      .finally(() => setLoading(false))
    return () => clearInterval(timerRef.current)
  }, [quizId])

  // Countdown timer
  useEffect(() => {
    if (!quiz || timeLeft === 0) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          handleSubmit()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [quiz])

  const handleSubmit = async () => {
    if (submitting || !quiz || !attemptId) return
    setSubmitting(true)
    clearInterval(timerRef.current)

    const answerList = quiz.questions.map((q: Question) => ({
      questionId:       q.id,
      selectedOptionId: answers[q.id] || ''
    }))

    try {
      await api.post(`/api/quiz/${quizId}/submit`, { attemptId, answers: answerList })
      navigate(`/quiz/${quizId}/result/${attemptId}`)
    } catch {
      setSubmitting(false)
    }
  }

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-32 text-slate-400 animate-pulse">Loading quiz…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-24 text-center">
          <div className="card">
            <div className="text-red-400 text-lg mb-2">⚠️ {error}</div>
            <button onClick={() => navigate(-1)} className="btn-secondary mt-4">Go Back</button>
          </div>
        </div>
      </div>
    )
  }

  if (!quiz) return null

  const question   = quiz.questions[current]
  const answered   = Object.keys(answers).length
  const isLast     = current === quiz.questions.length - 1
  const timerColor = timeLeft < 60 ? 'text-red-400' : timeLeft < 300 ? 'text-yellow-400' : 'text-green-400'

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Quiz header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">{quiz.title}</h1>
            <p className="text-slate-400 text-sm">
              Question {current + 1} of {quiz.questions.length} · {answered} answered
            </p>
          </div>
          <div className={`text-2xl font-mono font-bold ${timerColor}`}>
            {fmtTime(timeLeft)}
          </div>
        </div>

        {/* Progress */}
        <div className="h-1.5 bg-slate-800 rounded-full mb-8">
          <div
            className="h-1.5 bg-blue-500 rounded-full transition-all"
            style={{ width: `${((current + 1) / quiz.questions.length) * 100}%` }}
          />
        </div>

        {/* Question card */}
        <div className="card mb-6">
          <p className="text-white font-medium text-lg leading-relaxed mb-6">
            {question.question_text}
          </p>

          <div className="space-y-3">
            {question.options.map(opt => {
              const selected = answers[question.id] === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setAnswers(a => ({ ...a, [question.id]: opt.id }))}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                    selected
                      ? 'border-blue-500 bg-blue-950 text-white'
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-700'
                  }`}
                >
                  {opt.option_text}
                </button>
              )
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <button
            disabled={current === 0}
            onClick={() => setCurrent(c => c - 1)}
            className="btn-secondary disabled:opacity-40"
          >
            ← Previous
          </button>

          {/* Question dots */}
          <div className="flex gap-1.5 flex-wrap justify-center">
            {quiz.questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrent(i)}
                className={`w-6 h-6 rounded-full text-xs font-medium transition-all ${
                  i === current
                    ? 'bg-blue-600 text-white'
                    : answers[q.id]
                    ? 'bg-green-700 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {isLast ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? 'Submitting…' : 'Submit Quiz'}
            </button>
          ) : (
            <button
              onClick={() => setCurrent(c => c + 1)}
              className="btn-primary"
            >
              Next →
            </button>
          )}
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Passing score: {quiz.passing_score}% · Max attempts: {quiz.max_attempts}
        </p>
      </div>
    </div>
  )
}
