'use client'

import { useState, useRef, useCallback } from 'react'
import type { Question, QuestionType } from '@/lib/forms/types'

interface AiGenerateModalProps {
  open: boolean
  onClose: () => void
  onQuestionsGenerated: (questions: Question[]) => void
}

const TYPE_OPTIONS: { value: QuestionType; label: string; icon: string }[] = [
  { value: 'short_text', label: 'Short text', icon: '─' },
  { value: 'long_text', label: 'Long text', icon: '≡' },
  { value: 'multiple_choice', label: 'Multiple choice', icon: '◉' },
  { value: 'rating', label: 'Rating', icon: '★' },
]

export default function AiGenerateModal({ open, onClose, onQuestionsGenerated }: AiGenerateModalProps) {
  const [purpose, setPurpose] = useState('')
  const [audience, setAudience] = useState('')
  const [questionCount, setQuestionCount] = useState(5)
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>([
    'short_text', 'long_text', 'multiple_choice', 'rating',
  ])
  const [generating, setGenerating] = useState(false)
  const [streamedQuestions, setStreamedQuestions] = useState<Question[]>([])
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<'input' | 'streaming' | 'done'>('input')
  const abortRef = useRef<AbortController | null>(null)

  function toggleType(type: QuestionType) {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const handleGenerate = useCallback(async () => {
    if (!purpose.trim() || !audience.trim() || selectedTypes.length === 0) return
    setError('')
    setGenerating(true)
    setStreamedQuestions([])
    setPhase('streaming')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: purpose.trim(),
          audience: audience.trim(),
          questionCount,
          questionTypes: selectedTypes,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(errBody.error || `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''
      const collected: Question[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()

          if (payload === '[DONE]') {
            setPhase('done')
            continue
          }

          try {
            const parsed = JSON.parse(payload)
            if (parsed.error) {
              setError(parsed.error)
              continue
            }
            // It's a question
            const question = parsed as Question
            collected.push(question)
            setStreamedQuestions([...collected])
          } catch {
            // Skip malformed lines
          }
        }
      }

      setPhase('done')
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setPhase('input')
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setPhase('done')
      }
    } finally {
      setGenerating(false)
      abortRef.current = null
    }
  }, [purpose, audience, questionCount, selectedTypes])

  function handleAccept() {
    if (streamedQuestions.length > 0) {
      onQuestionsGenerated(streamedQuestions)
    }
    handleReset()
    onClose()
  }

  function handleCancel() {
    if (abortRef.current) {
      abortRef.current.abort()
    }
    handleReset()
    onClose()
  }

  function handleReset() {
    setPhase('input')
    setStreamedQuestions([])
    setError('')
    setGenerating(false)
  }

  if (!open) return null

  const TYPE_ICONS: Record<string, string> = {
    short_text: '─',
    long_text: '≡',
    multiple_choice: '◉',
    rating: '★',
  }

  const TYPE_LABELS: Record<string, string> = {
    short_text: 'Short text',
    long_text: 'Long text',
    multiple_choice: 'Multiple choice',
    rating: 'Rating',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) handleCancel() }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        animation: 'fadeScaleIn 0.2s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>✨</span> Generate with AI
            </h2>
            <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>
              Describe your form and let AI create the questions
            </p>
          </div>
          <button
            onClick={handleCancel}
            style={{
              background: 'none', border: 'none', fontSize: 20, color: '#999',
              cursor: 'pointer', padding: '4px 8px', lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>

          {/* Input Phase */}
          {phase === 'input' && (
            <>
              {/* Purpose */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 6 }}>
                  Form purpose <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  placeholder="e.g. Collect feedback about our new mobile app's onboarding experience"
                  rows={3}
                  autoFocus
                  style={{
                    width: '100%', padding: '10px 14px', fontSize: 14,
                    border: '1px solid #e0e0e0', borderRadius: 8,
                    boxSizing: 'border-box', resize: 'vertical', outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Audience */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 6 }}>
                  Target audience <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={audience}
                  onChange={e => setAudience(e.target.value)}
                  placeholder="e.g. New users who signed up in the last 30 days"
                  style={{
                    width: '100%', padding: '10px 14px', fontSize: 14,
                    border: '1px solid #e0e0e0', borderRadius: 8,
                    boxSizing: 'border-box', outline: 'none',
                  }}
                />
              </div>

              {/* Question count */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 6 }}>
                  Number of questions
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[3, 5, 7, 10].map(n => (
                    <button
                      key={n}
                      onClick={() => setQuestionCount(n)}
                      style={{
                        padding: '8px 16px', fontSize: 13, borderRadius: 8, cursor: 'pointer',
                        border: questionCount === n ? '2px solid #18181b' : '1px solid #e0e0e0',
                        background: questionCount === n ? '#18181b' : '#fff',
                        color: questionCount === n ? '#fff' : '#555',
                        fontWeight: questionCount === n ? 600 : 400,
                        transition: 'all 0.15s',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question types */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 8 }}>
                  Question types to include
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TYPE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => toggleType(opt.value)}
                      style={{
                        padding: '7px 14px', fontSize: 13, borderRadius: 8, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                        border: selectedTypes.includes(opt.value)
                          ? '2px solid #18181b'
                          : '1px solid #e0e0e0',
                        background: selectedTypes.includes(opt.value) ? '#f8f8f8' : '#fff',
                        color: selectedTypes.includes(opt.value) ? '#18181b' : '#888',
                        fontWeight: selectedTypes.includes(opt.value) ? 500 : 400,
                        transition: 'all 0.15s',
                      }}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{error}</p>
              )}
            </>
          )}

          {/* Streaming / Done Phase */}
          {(phase === 'streaming' || phase === 'done') && (
            <>
              {/* Progress bar */}
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 8,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#444' }}>
                    {phase === 'streaming' ? '✨ Generating questions...' : `✅ ${streamedQuestions.length} question${streamedQuestions.length !== 1 ? 's' : ''} generated`}
                  </span>
                  <span style={{ fontSize: 12, color: '#999' }}>
                    {streamedQuestions.length} / {questionCount}
                  </span>
                </div>
                <div style={{
                  height: 4, background: '#f0f0f0', borderRadius: 99, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (streamedQuestions.length / questionCount) * 100)}%`,
                    background: phase === 'streaming'
                      ? 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                      : '#22c55e',
                    borderRadius: 99,
                    transition: 'width 0.3s ease, background 0.3s ease',
                  }} />
                </div>
              </div>

              {/* Streamed questions list */}
              <div style={{ maxHeight: 360, overflow: 'auto' }}>
                {streamedQuestions.map((q, i) => (
                  <div
                    key={q.id}
                    style={{
                      padding: '12px 14px', marginBottom: 8,
                      border: '1px solid #f0f0f0', borderRadius: 10,
                      background: '#fafafa',
                      animation: 'fadeSlideIn 0.3s ease-out',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: '#bbb', fontWeight: 600 }}>{i + 1}</span>
                      <span style={{
                        fontSize: 11, color: '#888', background: '#f0f0f0',
                        padding: '1px 8px', borderRadius: 99,
                      }}>
                        {TYPE_ICONS[q.type]} {TYPE_LABELS[q.type]}
                      </span>
                      {q.required && (
                        <span style={{ fontSize: 10, color: '#dc2626' }}>required</span>
                      )}
                    </div>
                    <p style={{ fontSize: 14, margin: 0, color: '#1a1a1a', fontWeight: 500 }}>
                      {q.label}
                    </p>
                    {q.type === 'multiple_choice' && q.options && (
                      <div style={{ marginTop: 6 }}>
                        {q.options.map(opt => (
                          <span
                            key={opt.id}
                            style={{
                              display: 'inline-block', fontSize: 12, color: '#666',
                              background: '#fff', border: '1px solid #e8e8e8',
                              padding: '2px 10px', borderRadius: 99, marginRight: 4, marginTop: 4,
                            }}
                          >
                            {opt.label}
                          </span>
                        ))}
                      </div>
                    )}
                    {q.type === 'rating' && (
                      <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>
                        Scale: 1–{q.max ?? 5}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {phase === 'streaming' && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 0', justifyContent: 'center',
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: '2px solid #e0e0e0', borderTopColor: '#6366f1',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  <span style={{ fontSize: 13, color: '#888' }}>
                    Streaming from Groq llama-3.3-70b...
                  </span>
                </div>
              )}

              {error && (
                <p style={{ fontSize: 13, color: '#dc2626', marginTop: 8 }}>{error}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px 20px', borderTop: '1px solid #f0f0f0',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          {phase === 'input' && (
            <>
              <button
                onClick={handleCancel}
                style={{
                  padding: '9px 18px', fontSize: 13, borderRadius: 8,
                  border: '1px solid #e0e0e0', background: '#fff',
                  color: '#555', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={!purpose.trim() || !audience.trim() || selectedTypes.length === 0}
                style={{
                  padding: '9px 20px', fontSize: 13, fontWeight: 500, borderRadius: 8,
                  border: 'none', cursor: 'pointer',
                  background: purpose.trim() && audience.trim() && selectedTypes.length > 0
                    ? '#18181b' : '#e0e0e0',
                  color: purpose.trim() && audience.trim() && selectedTypes.length > 0
                    ? '#fff' : '#999',
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.15s',
                }}
              >
                ✨ Generate
              </button>
            </>
          )}

          {phase === 'streaming' && (
            <button
              onClick={handleCancel}
              style={{
                padding: '9px 18px', fontSize: 13, borderRadius: 8,
                border: '1px solid #fecaca', background: '#fff',
                color: '#dc2626', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          )}

          {phase === 'done' && (
            <>
              <button
                onClick={handleReset}
                style={{
                  padding: '9px 18px', fontSize: 13, borderRadius: 8,
                  border: '1px solid #e0e0e0', background: '#fff',
                  color: '#555', cursor: 'pointer',
                }}
              >
                Regenerate
              </button>
              <button
                onClick={handleAccept}
                disabled={streamedQuestions.length === 0}
                style={{
                  padding: '9px 20px', fontSize: 13, fontWeight: 500, borderRadius: 8,
                  border: 'none', cursor: 'pointer',
                  background: streamedQuestions.length > 0 ? '#18181b' : '#e0e0e0',
                  color: streamedQuestions.length > 0 ? '#fff' : '#999',
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.15s',
                }}
              >
                ✓ Use {streamedQuestions.length} question{streamedQuestions.length !== 1 ? 's' : ''}
              </button>
            </>
          )}
        </div>

        {/* CSS animations */}
        <style>{`
          @keyframes fadeScaleIn {
            from { opacity: 0; transform: scale(0.96); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}
