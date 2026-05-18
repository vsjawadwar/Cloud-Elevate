import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import Navbar from '@/components/Navbar'

interface Answer {
  question_id: string
  selected_option_id: string
  questions: {
    question_text: string
    explanation: string
    options: { id: string; option_text: string; is_correct: boolean }[]
  }
}

interface Attempt {
  id: string
  score: number
  passed: boolean
  started_at: string
  submitted_at: string
  quiz_answers: Answer[]
}

export default function QuizResult() {
  const { quizId, attemptId }   = useParams<{ quizId: string; attemptId: string }>()
  const [attempt, setAttempt]   = useState<Attempt | null>(null)
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    api.get(`/api/quiz/result/${attemptId}`)
      .then(r => setAttempt(r.data.attempt))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [attemptId])

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-32 text-slate-400 animate-pulse">Loading results…</div>
      </div>
    )
  }

  if (!attempt) return null

  const correct = attempt.quiz_answers.filter(a => {
    const correct = a.questions.options.find(o => o.is_correct)
    return correct?.id === a.selected_option_id
  }).length
  const total   = attempt.quiz_answers.length

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Score card */}
        <div className={`card text-center mb-8 border-2 ${attempt.passed ? 'border-green-700' : 'border-red-800'}`}>
          <div className={`text-5xl font-bold mb-2 ${attempt.passed ? 'text-green-400' : 'text-red-400'}`}>
            {attempt.score}%
          </div>
          <div className={`text-xl font-semibold mb-1 ${attempt.passed ? 'text-green-300' : 'text-red-300'}`}>
            {attempt.passed ? '🎉 Passed!' : '😢 Not Passed'}
          </div>
          <p className="text-slate-400 text-sm">
            {correct} out of {total} correct
          </p>

          <div className="flex gap-3 justify-center mt-6">
            <Link to="/dashboard" className="btn-secondary">← Dashboard</Link>
            {!attempt.passed && (
              <Link to={`/quiz/${quizId}`} className="btn-primary">Retry Quiz</Link>
            )}
          </div>
        </div>

        {/* Answer review */}
        <h2 className="text-lg font-semibold text-white mb-4">Answer Review</h2>

        <div className="space-y-3">
          {attempt.quiz_answers.map((ans, idx) => {
            const correctOpt    = ans.questions.options.find(o => o.is_correct)
            const selectedOpt   = ans.questions.options.find(o => o.id === ans.selected_option_id)
            const isCorrect     = correctOpt?.id === ans.selected_option_id
            const isOpen        = expanded === ans.question_id

            return (
              <div key={ans.question_id}
                className={`border rounded-xl overflow-hidden ${isCorrect ? 'border-green-900' : 'border-red-900'}`}>
                <button
                  className="w-full flex items-start gap-3 p-4 text-left hover:bg-slate-900 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : ans.question_id)}
                >
                  <div className={`w-5 h-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center ${
                    isCorrect ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {isCorrect ? (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm font-medium">Q{idx + 1}. {ans.questions.question_text}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Your answer: {selectedOpt?.option_text || 'Not answered'}
                    </p>
                  </div>
                  <svg
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 bg-slate-900 border-t border-slate-800">
                    <div className="space-y-2 mb-3 mt-3">
                      {ans.questions.options.map(opt => (
                        <div key={opt.id}
                          className={`px-3 py-2 rounded-lg text-sm ${
                            opt.is_correct
                              ? 'bg-green-950 text-green-300 border border-green-900'
                              : opt.id === ans.selected_option_id
                              ? 'bg-red-950 text-red-300 border border-red-900'
                              : 'text-slate-400'
                          }`}>
                          {opt.is_correct && '✓ '}{opt.option_text}
                          {opt.id === ans.selected_option_id && !opt.is_correct && ' (your answer)'}
                        </div>
                      ))}
                    </div>
                    <div className="bg-blue-950 border border-blue-900 rounded-lg px-3 py-2 text-blue-300 text-xs">
                      <strong>Explanation:</strong> {ans.questions.explanation}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
