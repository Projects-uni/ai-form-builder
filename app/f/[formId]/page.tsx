'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  filterAnswersForQuestions,
  getVisibleQuestions,
  normalizeFormSchema,
  normalizeLogicGraph,
} from '@/lib/forms/logic'
import type { Answers, FormSchema, LogicGraph } from '@/lib/forms/types'
import { useTranslation } from '@/lib/i18n/client'
import LanguageToggle from '@/app/components/LanguageToggle'

interface Form {
  id: string
  title: string
  description: string | null
  schema: FormSchema
  logic_graph: LogicGraph
  is_published: boolean
}

interface Props {
  params: Promise<{ formId: string }>
}

export default function PublicFormPage({ params }: Props) {
  const [formId, setFormId] = useState<string | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [answers, setAnswers] = useState<Answers>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [userEmail, setUserEmail] = useState('')
  const supabase = useMemo(() => createClient(), [])
  const { t } = useTranslation()

  useEffect(() => {
    params.then(p => setFormId(p.formId))
  }, [params])

  useEffect(() => {
    if (!formId) return
    supabase
      .from('forms')
      .select('id, title, description, schema, logic_graph, is_published')
      .eq('id', formId)
      .eq('is_published', true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); return }
        const schema = normalizeFormSchema(data.schema)
        setForm({
          ...(data as Omit<Form, 'schema' | 'logic_graph'>),
          schema,
          logic_graph: normalizeLogicGraph(data.logic_graph, schema),
        })
      })
  }, [formId, supabase])

  const visibleQuestions = useMemo(() => {
    if (!form) return []
    return getVisibleQuestions(form.schema, form.logic_graph, answers)
  }, [answers, form])

  function setAnswer(questionId: string, value: string) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    setErrors(prev => ({ ...prev, [questionId]: '' }))
  }

  async function handleFileUpload(qId: string, file: File) {
    if (!formId) return
    setUploading(prev => ({ ...prev, [qId]: true }))
    
    const fileExt = file.name.split('.').pop()
    const fileName = `${formId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('ai-formbuilder-bucket')
      .upload(fileName, file, { cacheControl: '3600', upsert: false })
      
    if (error) {
      alert('Upload failed: ' + error.message)
      setUploading(prev => ({ ...prev, [qId]: false }))
      return
    }
    
    const { data: { publicUrl } } = supabase.storage.from('ai-formbuilder-bucket').getPublicUrl(fileName)
    setAnswer(qId, publicUrl)
    setUploading(prev => ({ ...prev, [qId]: false }))
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    for (const q of visibleQuestions) {
      if (q.required && !answers[q.id]?.trim()) {
        newErrors[q.id] = t.publicForm.questionRequired
      }
    }
    if (form?.schema?.settings?.requireEmail) {
      if (!userEmail || !/^\S+@\S+\.\S+$/.test(userEmail)) {
        newErrors['email'] = 'A valid email address is required'
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit() {
    if (!form || !formId) return
    if (!validate()) return
    setSubmitting(true)

    const { data, error } = await supabase
      .from('responses')
      .insert({
        form_id: formId,
        answers: filterAnswersForQuestions(answers, visibleQuestions),
        respondent_meta: {
          ...(form?.schema?.settings?.requireEmail ? { email: userEmail.trim().toLowerCase() } : {}),
          user_agent: navigator.userAgent,
          submitted_at: new Date().toISOString(),
        },
      })
      .select('id')
      .single()

    setSubmitting(false)
    if (error) {
      if (error.code === '23505' || error.message.includes('unique constraint')) {
        alert('A user with this email has already submitted this form.')
      } else {
        alert(t.publicForm.failedSubmit + error.message)
      }
    } else {
      setSubmitted(true)
      
      // Trigger background analysis (embeddings & sentiment)
      if (data?.id) {
        fetch('/api/responses/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ responseId: data.id, formId }),
        }).catch(console.error) // Fire and forget
      }
    }
  }

  // ── States ──────────────────────────────────────────

  if (notFound) return (
    <div style={{ maxWidth: 560, margin: '100px auto', padding: '0 20px', textAlign: 'center' }}>
      <p style={{ fontSize: 32, marginBottom: 12 }}>🔒</p>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{t.publicForm.notFound}</h1>
      <p style={{ fontSize: 14, color: '#666' }}>
        {t.publicForm.notFoundDesc}
      </p>
    </div>
  )

  if (!form) return (
    <div style={{ maxWidth: 560, margin: '100px auto', padding: '0 20px', textAlign: 'center' }}>
      <p style={{ fontSize: 14, color: '#999' }}>{t.publicForm.loading}</p>
    </div>
  )

  if (submitted) return (
    <div style={{ maxWidth: 560, margin: '100px auto', padding: '0 20px', textAlign: 'center' }}>
      <p style={{ fontSize: 40, marginBottom: 16 }}>✅</p>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>{t.publicForm.thankYou}</h1>
      <p style={{ fontSize: 14, color: '#666' }}>{t.publicForm.recorded}</p>
    </div>
  )

  const questions = visibleQuestions

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 20px 80px' }}>
      
      <div className="flex justify-end mb-6">
        <LanguageToggle />
      </div>

      {/* Form header */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>{form.title}</h1>
        {form.description && (
          <p style={{ fontSize: 15, color: '#555', lineHeight: 1.6 }}>{form.description}</p>
        )}
      </div>

      {/* Questions */}
      {questions.map((q, i) => (
        <div key={q.id} style={{ marginBottom: 28 }}>
          <label style={{
            display: 'block', fontSize: 15, fontWeight: 500,
            marginBottom: 8, color: '#1a1a1a',
          }}>
            {i + 1}. {q.label}
            {q.required && <span style={{ color: '#dc2626', marginLeft: 4 }}>*</span>}
          </label>

          {/* short_text */}
          {q.type === 'short_text' && (
            <input
              type="text"
              value={answers[q.id] ?? ''}
              onChange={e => setAnswer(q.id, e.target.value)}
              placeholder={t.publicForm.yourAnswer}
              style={{
                width: '100%', padding: '10px 14px', fontSize: 14,
                border: `1px solid ${errors[q.id] ? '#fca5a5' : '#e0e0e0'}`,
                borderRadius: 8, boxSizing: 'border-box', outline: 'none',
              }}
            />
          )}

          {/* long_text */}
          {q.type === 'long_text' && (
            <textarea
              value={answers[q.id] ?? ''}
              onChange={e => setAnswer(q.id, e.target.value)}
              placeholder={t.publicForm.yourAnswer}
              rows={4}
              style={{
                width: '100%', padding: '10px 14px', fontSize: 14,
                border: `1px solid ${errors[q.id] ? '#fca5a5' : '#e0e0e0'}`,
                borderRadius: 8, boxSizing: 'border-box',
                outline: 'none', resize: 'vertical', fontFamily: 'inherit',
              }}
            />
          )}

          {/* multiple_choice */}
          {q.type === 'multiple_choice' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(q.options ?? []).map(opt => (
                <label key={opt.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  border: `1px solid ${answers[q.id] === opt.id ? '#18181b' : '#e0e0e0'}`,
                  borderRadius: 8, cursor: 'pointer',
                  background: answers[q.id] === opt.id ? '#f8f8f8' : '#fff',
                  fontSize: 14,
                }}>
                  <input
                    type="radio"
                    name={q.id}
                    value={opt.id}
                    checked={answers[q.id] === opt.id}
                    onChange={() => setAnswer(q.id, opt.id)}
                    style={{ accentColor: '#18181b' }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          )}

          {/* rating */}
          {q.type === 'rating' && (
            <div style={{ display: 'flex', gap: 8 }}>
              {Array.from({ length: q.max ?? 5 }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setAnswer(q.id, String(n))}
                  style={{
                    width: 42, height: 42, fontSize: 18,
                    border: `1px solid ${answers[q.id] === String(n) ? '#18181b' : '#e0e0e0'}`,
                    borderRadius: 8, cursor: 'pointer',
                    background: answers[q.id] === String(n) ? '#18181b' : '#fff',
                    color: answers[q.id] === String(n) ? '#fff' : '#555',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          )}

          {/* file */}
          {q.type === 'file' && (
            <div style={{
              border: '1px dashed #e0e0e0', borderRadius: 8,
              padding: '20px', textAlign: 'center',
            }}>
              {uploading[q.id] ? (
                <p style={{ fontSize: 13, color: '#666' }}>Uploading...</p>
              ) : answers[q.id] ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, color: '#10b981' }}>✓ File uploaded</span>
                  <button 
                    onClick={() => setAnswer(q.id, '')}
                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <input 
                  type="file" 
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(q.id, file)
                  }}
                  style={{ fontSize: 14, maxWidth: '100%' }}
                />
              )}
            </div>
          )}

          {/* Error message */}
          {errors[q.id] && (
            <p style={{ fontSize: 12, color: '#dc2626', marginTop: 5 }}>{errors[q.id]}</p>
          )}
        </div>
      ))}

      {questions.length > 0 && form?.schema?.settings?.requireEmail && (
        <div style={{ marginBottom: 28, paddingTop: 20, borderTop: '1px solid #eee' }}>
          <label style={{
            display: 'block', fontSize: 15, fontWeight: 500,
            marginBottom: 8, color: '#1a1a1a',
          }}>
            Your Email Address <span style={{ color: '#dc2626', marginLeft: 4 }}>*</span>
          </label>
          <input
            type="email"
            value={userEmail}
            onChange={e => setUserEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              width: '100%', padding: '10px 14px', fontSize: 14,
              border: `1px solid ${errors['email'] ? '#fca5a5' : '#e0e0e0'}`,
              borderRadius: 8, boxSizing: 'border-box', outline: 'none',
            }}
          />
          {errors['email'] && (
            <p style={{ fontSize: 12, color: '#dc2626', marginTop: 5 }}>{errors['email']}</p>
          )}
        </div>
      )}

      {/* Submit button */}
      {questions.length > 0 && (
        <button
          onClick={handleSubmit}
          disabled={submitting || Object.values(uploading).some(v => v)}
          style={{
            padding: '12px 32px', fontSize: 15, fontWeight: 500,
            background: '#18181b', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer',
            marginTop: 8,
          }}
        >
          {submitting ? t.publicForm.submitting : t.publicForm.submit}
        </button>
      )}

      {questions.length === 0 && (
        <p style={{ fontSize: 14, color: '#999' }}>{t.publicForm.noQuestions}</p>
      )}

    </div>
  )
}
