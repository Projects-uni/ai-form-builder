'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  getIncomingEdges,
  normalizeFormSchema,
  normalizeLogicGraph,
  reconcileLogicGraph,
  setQuestionCondition,
} from '@/lib/forms/logic'
import type { LogicGraph, Question, QuestionType } from '@/lib/forms/types'
import AiGenerateModal from '@/app/components/AiGenerateModal'
import { useTranslation } from '@/lib/i18n/client'
import LanguageToggle from '@/app/components/LanguageToggle'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Form {
  id: string
  workspace_id: string
  title: string
  description: string | null
  schema: unknown
  logic_graph: unknown
  is_published: boolean
  created_at: string
}

interface Props {
  params: Promise<{ workspaceId: string; formId: string }>
}

function getTypeLabels(t: any): Record<QuestionType, string> {
  return {
    short_text: t.formEditor.questionTypes.short_text,
    long_text: t.formEditor.questionTypes.long_text,
    multiple_choice: t.formEditor.questionTypes.multiple_choice,
    rating: t.formEditor.questionTypes.rating,
    file: t.formEditor.questionTypes.file,
  }
}

const TYPE_ICONS: Record<QuestionType, string> = {
  short_text: '─',
  long_text: '≡',
  multiple_choice: '◉',
  rating: '★',
  file: '↑',
}

function generateId() {
  return 'q_' + Math.random().toString(36).slice(2, 9)
}

function generateOptionId() {
  return 'o_' + Math.random().toString(36).slice(2, 9)
}

// ── Question Card ──────────────────────────────────────
function QuestionCard({
  question,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  allQuestions,
  logicGraph,
  onConditionChange,
  t,
}: {
  question: Question
  index: number
  total: number
  onChange: (q: Question) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  allQuestions: Question[]
  logicGraph: LogicGraph
  onConditionChange: (targetQuestionId: string, sourceQuestionId: string, value: string) => void
  t: any
}) {
  const [expanded, setExpanded] = useState(true)
  const incomingEdge = getIncomingEdges(question.id, logicGraph)[0]
  const sourceQuestion = allQuestions.find(q => q.id === incomingEdge?.source)
  const sourceCandidates = allQuestions.slice(0, index)

  function updateLabel(label: string) { onChange({ ...question, label }) }
  function updateRequired(required: boolean) { onChange({ ...question, required }) }
  function updateType(type: QuestionType) {
    const updated: Question = { ...question, type }
    if (type === 'multiple_choice' && !updated.options) {
      updated.options = [
        { id: generateOptionId(), label: `${t.formEditor.option} 1` },
        { id: generateOptionId(), label: `${t.formEditor.option} 2` },
      ]
    }
    if (type === 'rating') updated.max = updated.max ?? 5
    onChange(updated)
  }
  function addOption() {
    const options = [...(question.options ?? []), { id: generateOptionId(), label: `${t.formEditor.option} ${(question.options?.length ?? 0) + 1}` }]
    onChange({ ...question, options })
  }
  function updateOption(id: string, label: string) {
    onChange({ ...question, options: question.options?.map(o => o.id === id ? { ...o, label } : o) })
  }
  function removeOption(id: string) {
    onChange({ ...question, options: question.options?.filter(o => o.id !== id) })
  }

  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: 10,
      marginBottom: 12,
      background: '#fff',
      overflow: 'hidden',
    }}>
      {/* Card header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        background: '#fafafa',
        borderBottom: expanded ? '1px solid #f0f0f0' : 'none',
        cursor: 'pointer',
      }}
        onClick={() => setExpanded(e => !e)}
      >
        <span style={{ fontSize: 12, color: '#bbb', width: 20, textAlign: 'center', flexShrink: 0 }}>
          {index + 1}
        </span>
        <span style={{ fontSize: 13, color: '#888', width: 20, textAlign: 'center', flexShrink: 0 }}>
          {TYPE_ICONS[question.type]}
        </span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: question.label ? '#1a1a1a' : '#bbb' }}>
          {question.label || t.formEditor.untitledQuestion}
        </span>
        <span style={{ fontSize: 11, color: '#bbb', background: '#f0f0f0', padding: '2px 8px', borderRadius: 99 }}>
          {getTypeLabels(t)[question.type]}
        </span>
        {question.required && (
          <span style={{ fontSize: 11, color: '#dc2626' }}>required</span>
        )}
        <span style={{ fontSize: 14, color: '#bbb', marginLeft: 4 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Card body */}
      {expanded && (
        <div style={{ padding: '24px' }}>

          {/* Question label */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#666', marginBottom: 8 }}>
              {t.formEditor.questionText}
            </label>
            <input
              type="text"
              value={question.label}
              onChange={e => updateLabel(e.target.value)}
              placeholder={t.formEditor.untitledQuestion}
              style={{
                width: '100%', padding: '12px 16px', fontSize: 15,
                border: '1px solid #e0e0e0', borderRadius: 8,
                boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          {/* Question type */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#666', marginBottom: 8 }}>
              Question type
            </label>
            <select
              value={question.type}
              onChange={e => updateType(e.target.value as QuestionType)}
              style={{
                padding: '12px 16px', fontSize: 15,
                border: '1px solid #e0e0e0', borderRadius: 8,
                background: '#fff', outline: 'none', cursor: 'pointer',
              }}
            >
              {(Object.keys(getTypeLabels(t)) as QuestionType[]).map(qType => (
                <option key={qType} value={qType}>{TYPE_ICONS[qType]} {getTypeLabels(t)[qType]}</option>
              ))}
            </select>
          </div>

          {/* Multiple choice options */}
          {question.type === 'multiple_choice' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#666', marginBottom: 8 }}>
                Options
              </label>
              {(question.options ?? []).map(opt => (
                <div key={opt.id} style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#bbb' }}>◉</span>
                  <input
                    type="text"
                    value={opt.label}
                    onChange={e => updateOption(opt.id, e.target.value)}
                    style={{
                      flex: 1, padding: '7px 10px', fontSize: 13,
                      border: '1px solid #e8e8e8', borderRadius: 6,
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => removeOption(opt.id)}
                    style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
                  >×</button>
                </div>
              ))}
              <button
                onClick={addOption}
                style={{
                  fontSize: 13, color: '#666', background: 'none',
                  border: '1px dashed #ccc', borderRadius: 6,
                  padding: '6px 12px', cursor: 'pointer', marginTop: 4,
                }}
              >
                + {t.formEditor.addOption}
              </button>
            </div>
          )}

          {/* Rating max */}
          {question.type === 'rating' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#666', marginBottom: 5 }}>
                {t.formEditor.maxRating}
              </label>
              <select
                value={question.max ?? 5}
                onChange={e => onChange({ ...question, max: parseInt(e.target.value) })}
                style={{ padding: '9px 12px', fontSize: 14, border: '1px solid #e0e0e0', borderRadius: 7, background: '#fff', outline: 'none' }}
              >
                {[3, 4, 5, 7, 10].map(n => (
                  <option key={n} value={n}>{n} {t.formEditor.stars}</option>
                ))}
              </select>
            </div>
          )}

          {/* Required toggle + actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, color: '#555' }}>
              <input
                type="checkbox"
                checked={question.required}
                onChange={e => updateRequired(e.target.checked)}
              />
              Required
            </label>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={onMoveUp}
                disabled={index === 0}
                title={t.formEditor.moveUp}
                style={{
                  padding: '5px 10px', fontSize: 13, borderRadius: 6,
                  border: '1px solid #e0e0e0', background: '#fff',
                  cursor: index === 0 ? 'not-allowed' : 'pointer',
                  color: index === 0 ? '#ccc' : '#555',
                }}
              >{t.formEditor.moveUp === 'Yukarı taşı' ? '↑' : '↑'}</button>
              <button
                onClick={onMoveDown}
                disabled={index === total - 1}
                title={t.formEditor.moveDown}
                style={{
                  padding: '5px 10px', fontSize: 13, borderRadius: 6,
                  border: '1px solid #e0e0e0', background: '#fff',
                  cursor: index === total - 1 ? 'not-allowed' : 'pointer',
                  color: index === total - 1 ? '#ccc' : '#555',
                }}
              >↓</button>
              <button
                onClick={onDelete}
                title="Delete question"
                style={{
                  padding: '5px 10px', fontSize: 13, borderRadius: 6,
                  border: '1px solid #fecaca', background: '#fff',
                  cursor: 'pointer', color: '#dc2626',
                }}
              >{t.formEditor.delete}</button>
            </div>
          </div>

          {/* Conditional logic */}
          <div style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: '1px solid #f0f0f0',
          }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#666', marginBottom: 6 }}>
              {t.formEditor.conditionalDisplay}
            </label>
            {index === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: '#999' }}>
                {t.formEditor.firstQuestionAlwaysShown}
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                <select
                  value={incomingEdge?.source ?? ''}
                  onChange={e => onConditionChange(question.id, e.target.value, '')}
                  style={{ padding: '9px 12px', fontSize: 13, border: '1px solid #e0e0e0', borderRadius: 7, background: '#fff' }}
                >
                  <option value="">{t.formEditor.alwaysShow}</option>
                  {sourceCandidates.map(source => (
                    <option key={source.id} value={source.id}>
                      {t.formEditor.showOnlyIf}: {source.label || t.formEditor.untitledQuestion}
                    </option>
                  ))}
                </select>

                {incomingEdge && sourceQuestion && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#777' }}>{t.formEditor.equals}</span>
                    {sourceQuestion.type === 'multiple_choice' ? (
                      <select
                        value={incomingEdge.value}
                        onChange={e => onConditionChange(question.id, incomingEdge.source, e.target.value)}
                        style={{ flex: 1, padding: '9px 12px', fontSize: 13, border: '1px solid #e0e0e0', borderRadius: 7, background: '#fff' }}
                      >
                        <option value="">{t.formEditor.chooseAnswer}</option>
                        {(sourceQuestion.options ?? []).map(option => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                    ) : sourceQuestion.type === 'rating' ? (
                      <select
                        value={incomingEdge.value}
                        onChange={e => onConditionChange(question.id, incomingEdge.source, e.target.value)}
                        style={{ flex: 1, padding: '9px 12px', fontSize: 13, border: '1px solid #e0e0e0', borderRadius: 7, background: '#fff' }}
                      >
                        <option value="">{t.formEditor.chooseRating}</option>
                        {Array.from({ length: sourceQuestion.max ?? 5 }, (_, i) => i + 1).map(value => (
                          <option key={value} value={String(value)}>{value}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={incomingEdge.value}
                        onChange={e => onConditionChange(question.id, incomingEdge.source, e.target.value)}
                        placeholder={t.formEditor.expectedAnswer}
                        style={{ flex: 1, padding: '9px 12px', fontSize: 13, border: '1px solid #e0e0e0', borderRadius: 7, outline: 'none' }}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────
export default function FormEditorPage({ params }: Props) {
  const { t } = useTranslation()
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [formId, setFormId] = useState<string | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [logicGraph, setLogicGraph] = useState<LogicGraph>({ nodes: [], edges: [] })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [shareStatus, setShareStatus] = useState('')
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Resolve params
  useEffect(() => {
    params.then(p => {
      setWorkspaceId(p.workspaceId)
      setFormId(p.formId)
    })
  }, [params])

  // Load form
  useEffect(() => {
    if (!formId || !workspaceId) return
    supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .eq('workspace_id', workspaceId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { router.push(`/dashboard/${workspaceId}`); return }
        const loadedForm = data as Form
        const schema = normalizeFormSchema(loadedForm.schema)
        const graph = normalizeLogicGraph(loadedForm.logic_graph, schema)
        setForm(loadedForm)
        setQuestions(schema.questions)
        setLogicGraph(graph)
      })
  }, [formId, workspaceId, router, supabase])

  // Save schema to Supabase
  const saveFormEngine = useCallback(async (qs: Question[], graph: LogicGraph) => {
    if (!formId) return
    const reconciledGraph = reconcileLogicGraph({ questions: qs }, graph)
    setSaving(true)
    setSaved(false)
    const { error } = await supabase
      .from('forms')
      .update({
        schema: { questions: qs },
        logic_graph: reconciledGraph,
      })
      .eq('id', formId)
    setSaving(false)
    if (error) { setError(error.message) } else { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }, [formId, supabase])

  function addQuestion() {
    const newQ: Question = {
      id: generateId(),
      type: 'short_text',
      label: '',
      required: false,
    }
    const updated = [...questions, newQ]
    const updatedGraph = reconcileLogicGraph({ questions: updated }, logicGraph)
    setQuestions(updated)
    setLogicGraph(updatedGraph)
    saveFormEngine(updated, updatedGraph)
  }

  function updateQuestion(index: number, q: Question) {
    const updated = questions.map((old, i) => i === index ? q : old)
    const updatedGraph = reconcileLogicGraph({ questions: updated }, logicGraph)
    setQuestions(updated)
    setLogicGraph(updatedGraph)
    saveFormEngine(updated, updatedGraph)
  }

  function deleteQuestion(index: number) {
    const updated = questions.filter((_, i) => i !== index)
    const deletedId = questions[index].id
    const updatedGraph = reconcileLogicGraph({ questions: updated }, {
      nodes: updated.map(q => q.id),
      edges: logicGraph.edges.filter(edge => edge.source !== deletedId && edge.target !== deletedId),
    })
    setQuestions(updated)
    setLogicGraph(updatedGraph)
    saveFormEngine(updated, updatedGraph)
  }

  function moveQuestion(index: number, direction: 'up' | 'down') {
    const updated = [...questions]
    const target = direction === 'up' ? index - 1 : index + 1
    ;[updated[index], updated[target]] = [updated[target], updated[index]]
    const updatedGraph = reconcileLogicGraph({ questions: updated }, logicGraph)
    setQuestions(updated)
    setLogicGraph(updatedGraph)
    saveFormEngine(updated, updatedGraph)
  }

  function updateCondition(targetQuestionId: string, sourceQuestionId: string, value: string) {
    const updatedGraph = setQuestionCondition(
      logicGraph,
      targetQuestionId,
      sourceQuestionId ? { source: sourceQuestionId, operator: 'equals', value } : null,
    )
    setLogicGraph(updatedGraph)
    saveFormEngine(questions, updatedGraph)
  }

  function handleAIGenerated(newQuestions: Question[]) {
    const updated = [...questions, ...newQuestions]
    const updatedGraph = reconcileLogicGraph({ questions: updated }, logicGraph)
    setQuestions(updated)
    setLogicGraph(updatedGraph)
    saveFormEngine(updated, updatedGraph)
    setIsAiModalOpen(false)
  }

  async function togglePublish() {
    if (!formId || !form) return
    setPublishing(true)
    const { error } = await supabase
      .from('forms')
      .update({ is_published: !form.is_published })
      .eq('id', formId)
    if (!error) setForm({ ...form, is_published: !form.is_published })
    setPublishing(false)
  }

  async function shareForm() {
    if (!formId) return
    const shareUrl = `${window.location.origin}/f/${formId}`

    if (navigator.share) {
      try {
        await navigator.share({ title: form?.title ?? 'Form', url: shareUrl })
        return
      } catch {
      }
    }

    await navigator.clipboard.writeText(shareUrl)
    setShareStatus('Copied')
    setTimeout(() => setShareStatus(''), 1800)
  }

  if (!form) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 14 }}>
      {t.common.loading}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f9f9f9' }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 24px', borderBottom: '1px solid #e0e0e0',
        position: 'sticky', top: 0, background: '#fff', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href={`/dashboard/${workspaceId}`} className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 text-sm font-medium transition-colors">
            <ArrowLeft size={16} />
            {t.common.back}
          </Link>
          <LanguageToggle />
          <span style={{ color: '#e0e0e0' }}>|</span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{form.title}</span>
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 99,
            background: form.is_published ? '#e1f5ee' : '#f4f4f5',
            color: form.is_published ? '#085041' : '#666',
          }}>
            {form.is_published ? t.common.published : t.common.draft}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {saving && <span style={{ fontSize: 12, color: '#999' }}>{t.common.saving}</span>}
          {saved && <span style={{ fontSize: 12, color: '#22c55e' }}>✓ {t.common.saved}</span>}
          {error && <span style={{ fontSize: 12, color: '#dc2626' }}>{error}</span>}

          <a
            href={`/f/${formId}`}
            target="_blank"
            style={{
              padding: '7px 14px', fontSize: 13,
              border: '1px solid #e0e0e0', borderRadius: 6,
              textDecoration: 'none', color: '#333',
            }}
          >
            {t.common.preview} ↗
          </a>

          <a
            href={`/dashboard/${workspaceId}/forms/${formId}/responses`}
            style={{
              padding: '7px 14px', fontSize: 13,
              border: '1px solid #e0e0e0', borderRadius: 6,
              textDecoration: 'none', color: '#333',
            }}
          >
            Responses
          </a>

          <a
            href={`/dashboard/${workspaceId}/forms/${formId}/analytics`}
            style={{
              padding: '7px 14px', fontSize: 13,
              border: '1px solid #e0e0e0', borderRadius: 6,
              textDecoration: 'none', color: '#333',
              background: '#f8f8ff', borderColor: '#c7d2fe',
            }}
          >
            Analytics
          </a>

          {form.is_published && (
            <>
              <button
                onClick={() => setIsEmbedModalOpen(true)}
                style={{
                  padding: '7px 14px', fontSize: 13,
                  border: '1px solid #e0e0e0', borderRadius: 6,
                  background: '#fff', color: '#333', cursor: 'pointer',
                }}
              >
                Embed
              </button>
              <button
                onClick={shareForm}
                style={{
                  padding: '7px 14px', fontSize: 13,
                  border: '1px solid #e0e0e0', borderRadius: 6,
                  background: '#fff', color: '#333', cursor: 'pointer',
                }}
              >
                {shareStatus || t.common.share}
              </button>
            </>
          )}

          <button
            onClick={togglePublish}
            disabled={publishing || questions.length === 0}
            style={{
              padding: '7px 16px', fontSize: 13, borderRadius: 6, border: 'none',
              background: form.is_published ? '#fee2e2' : '#18181b',
              color: form.is_published ? '#dc2626' : '#fff',
              cursor: questions.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {publishing ? '...' : form.is_published ? t.common.unpublish : t.common.publish}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>

        <h2 style={{ fontSize: 26, fontWeight: 600, marginBottom: 8 }}>{form.title}</h2>
        {form.description && (
          <p style={{ fontSize: 16, color: '#666', marginBottom: 32 }}>{form.description}</p>
        )}

        {/* Questions */}
        {questions.length === 0 ? (
          <div style={{
            border: '2px dashed #e0e0e0', borderRadius: 12,
            padding: '48px 24px', textAlign: 'center', marginBottom: 20,
          }}>
            <p style={{ fontSize: 15, color: '#999', marginBottom: 6 }}>{t.formEditor.noQuestionsYet}</p>
            <p style={{ fontSize: 13, color: '#bbb' }}>{t.formEditor.clickToAdd}</p>
          </div>
        ) : (
          questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              total={questions.length}
              onChange={updated => updateQuestion(i, updated)}
              onDelete={() => deleteQuestion(i)}
              onMoveUp={() => moveQuestion(i, 'up')}
              onMoveDown={() => moveQuestion(i, 'down')}
              allQuestions={questions}
              logicGraph={logicGraph}
              onConditionChange={updateCondition}
              t={t}
            />
          ))
        )}

        {/* Add question button */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={addQuestion}
            style={{
              flex: 1, padding: '12px', fontSize: 14, fontWeight: 500,
              border: '1px dashed #ccc', borderRadius: 10,
              background: '#fff', cursor: 'pointer', color: '#555',
            }}
          >
            + {t.formEditor.addQuestion}
          </button>
          <button
            onClick={() => setIsAiModalOpen(true)}
            style={{
              padding: '12px 16px', fontSize: 13,
              border: '1px dashed #c7d2fe', borderRadius: 10,
              background: '#f8f8ff', cursor: 'pointer', color: '#4f46e5',
              whiteSpace: 'nowrap',
            }}
          >
            ✨ {t.formEditor.generateWithAI}
          </button>
        </div>

        {/* Questions count */}
        {questions.length > 0 && (
          <p style={{ fontSize: 12, color: '#bbb', textAlign: 'center', marginTop: 20 }}>
            {questions.length} question{questions.length !== 1 ? 's' : ''} · {t.formEditor.autoSaved}
          </p>
        )}

      </div>

      <AiGenerateModal
        open={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onQuestionsGenerated={handleAIGenerated}
      />

      {isEmbedModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 12, width: 500, maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Embed Form</h3>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>Copy the code below to embed this form on your website.</p>
            <textarea
              readOnly
              value={`<iframe src="${window.location.origin}/f/${formId}" width="100%" height="600px" frameborder="0" style="border:none;"></iframe>`}
              style={{ width: '100%', height: 100, padding: 12, fontSize: 13, fontFamily: 'monospace', border: '1px solid #ccc', borderRadius: 6, marginBottom: 16 }}
              onClick={e => (e.target as HTMLTextAreaElement).select()}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setIsEmbedModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Close</button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`<iframe src="${window.location.origin}/f/${formId}" width="100%" height="600px" frameborder="0" style="border:none;"></iframe>`);
                  setShareStatus('Copied embed code')
                  setTimeout(() => setShareStatus(''), 2000)
                  setIsEmbedModalOpen(false)
                }}
                style={{ padding: '8px 16px', border: 'none', borderRadius: 6, background: '#18181b', color: '#fff', cursor: 'pointer' }}
              >Copy Code</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
