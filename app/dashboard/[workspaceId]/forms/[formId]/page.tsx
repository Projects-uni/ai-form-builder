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
import { type QuestionType, type Question, type FormSchema, type LogicGraph } from '@/lib/forms/types'
import AiGenerateModal from '@/app/components/AiGenerateModal'
import { useTranslation } from '@/lib/i18n/client'
import LanguageToggle from '@/app/components/LanguageToggle'
import Link from 'next/link'
import { ArrowLeft, Settings, Plus, Sparkles, Check, Share, GripVertical, Trash2, ChevronDown, ChevronUp, Copy, Eye, MessageSquare, Bot, ClipboardList, X, BarChart3, Inbox } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { Input } from '@/app/components/ui/Input'
import { Card, CardContent } from '@/app/components/ui/Card'
import { Modal } from '@/app/components/ui/Modal'
import { Badge } from '@/app/components/ui/Badge'

interface Form {
  id: string
  workspace_id: string
  title: string
  description: string | null
  schema: FormSchema
  logic_graph: LogicGraph
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
    <Card className={`mb-6 transition-all duration-200 shadow-xl ${expanded ? 'ring-4 ring-black border-black' : 'border-2 border-slate-200 hover:border-black'}`}>
      <div 
        className={`flex items-center gap-4 p-6 cursor-pointer select-none transition-colors ${expanded ? 'bg-slate-50 border-b-2 border-slate-200 rounded-t-2xl' : 'hover:bg-slate-50 rounded-2xl'}`}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-black text-lg font-black text-white">
          {index + 1}
        </span>
        <span className="flex size-10 shrink-0 items-center justify-center text-xl font-black text-slate-500 bg-slate-200 rounded-xl">
          {TYPE_ICONS[question.type]}
        </span>
        <span className={`flex-1 truncate text-xl font-bold ${question.label ? 'text-slate-900' : 'text-slate-400'}`}>
          {question.label || t.formEditor.untitledQuestion}
        </span>
        <Badge variant="secondary" className="hidden sm:inline-flex text-base py-1 px-3">{getTypeLabels(t)[question.type]}</Badge>
        {question.required && <Badge variant="danger" className="text-base py-1 px-3">Required</Badge>}
        <span className="text-black shrink-0 ml-4 bg-slate-200 p-2 rounded-xl">
          {expanded ? <ChevronUp size={24} strokeWidth={3} /> : <ChevronDown size={24} strokeWidth={3} />}
        </span>
      </div>

      {expanded && (
        <CardContent className="p-8 bg-white rounded-b-2xl">
          <div className="space-y-8">
            
            <div className="grid gap-8 md:grid-cols-[1fr_250px]">
              <div>
                <Input
                  label="Question Text"
                  value={question.label}
                  onChange={e => updateLabel(e.target.value)}
                  placeholder={t.formEditor.untitledQuestion}
                />
              </div>
              <div>
                <label className="mb-2 block text-base font-bold text-slate-900">Question Type</label>
                <select
                  value={question.type}
                  onChange={e => updateType(e.target.value as QuestionType)}
                  className="w-full h-14 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-lg font-medium focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 cursor-pointer"
                >
                  {(Object.keys(getTypeLabels(t)) as QuestionType[]).map(qType => (
                    <option key={qType} value={qType}>{TYPE_ICONS[qType]} {getTypeLabels(t)[qType]}</option>
                  ))}
                </select>
              </div>
            </div>

            {question.type === 'multiple_choice' && (
              <div className="bg-slate-50 rounded-2xl p-6 border-2 border-slate-200">
                <label className="mb-4 block text-lg font-bold text-slate-900">Options</label>
                <div className="space-y-4">
                  {(question.options ?? []).map(opt => (
                    <div key={opt.id} className="flex items-center gap-4">
                      <div className="size-6 shrink-0 rounded-full border-4 border-slate-300 bg-white" />
                      <Input
                        value={opt.label}
                        onChange={e => updateOption(opt.id, e.target.value)}
                        className="bg-white"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(opt.id)}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <X size={24} strokeWidth={3} />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="md" onClick={addOption} className="mt-6" leftIcon={<Plus size={20} strokeWidth={3} />}>
                  {t.formEditor.addOption}
                </Button>
              </div>
            )}

            {question.type === 'rating' && (
              <div className="bg-slate-50 rounded-2xl p-6 border-2 border-slate-200 w-fit">
                <label className="mb-3 block text-lg font-bold text-slate-900">{t.formEditor.maxRating}</label>
                <select
                  value={question.max ?? 5}
                  onChange={e => onChange({ ...question, max: parseInt(e.target.value) })}
                  className="w-40 h-14 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-lg font-bold focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
                >
                  {[3, 4, 5, 7, 10].map(n => (
                    <option key={n} value={n}>{n} {t.formEditor.stars}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-6 border-t-2 border-slate-100">
              <label className="flex items-center gap-4 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={question.required}
                    onChange={e => updateRequired(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-8 w-14 rounded-full bg-slate-200 transition-colors peer-checked:bg-black"></div>
                  <div className="absolute left-[4px] top-[4px] h-6 w-6 rounded-full bg-white transition-transform peer-checked:translate-x-6"></div>
                </div>
                <span className="text-lg font-bold text-slate-600 group-hover:text-black transition-colors">Required Field</span>
              </label>

              <div className="flex items-center gap-4">
                <div className="flex items-center rounded-xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
                  <button
                    onClick={onMoveUp}
                    disabled={index === 0}
                    className="p-3 text-slate-500 hover:bg-slate-100 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed border-r-2 border-slate-200 transition-colors"
                  >
                    <ChevronUp size={24} strokeWidth={3} />
                  </button>
                  <button
                    onClick={onMoveDown}
                    disabled={index === total - 1}
                    className="p-3 text-slate-500 hover:bg-slate-100 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronDown size={24} strokeWidth={3} />
                  </button>
                </div>
                <Button
                  variant="danger"
                  size="icon"
                  onClick={onDelete}
                >
                  <Trash2 size={24} strokeWidth={3} />
                </Button>
              </div>
            </div>

            <div className="pt-8 border-t-2 border-slate-100">
              <label className="mb-4 block text-lg font-bold text-slate-900">
                {t.formEditor.conditionalDisplay}
              </label>
              {index === 0 ? (
                <p className="text-base font-medium text-slate-500 italic bg-slate-50 p-4 rounded-xl border-2 border-slate-100">
                  {t.formEditor.firstQuestionAlwaysShown}
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <select
                    value={incomingEdge?.source ?? ''}
                    onChange={e => onConditionChange(question.id, e.target.value, '')}
                    className="w-full h-14 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
                  >
                    <option value="">{t.formEditor.alwaysShow}</option>
                    {sourceCandidates.map(source => (
                      <option key={source.id} value={source.id}>
                        {t.formEditor.showOnlyIf}: {source.label || t.formEditor.untitledQuestion}
                      </option>
                    ))}
                  </select>

                  {incomingEdge && sourceQuestion && (
                    <div className="flex items-center gap-4">
                      <span className="text-base font-black text-slate-400 shrink-0">{t.formEditor.equals}</span>
                      {sourceQuestion.type === 'multiple_choice' ? (
                        <select
                          value={incomingEdge.value}
                          onChange={e => onConditionChange(question.id, incomingEdge.source, e.target.value)}
                          className="w-full h-14 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
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
                          className="w-full h-14 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
                        >
                          <option value="">{t.formEditor.chooseRating}</option>
                          {Array.from({ length: sourceQuestion.max ?? 5 }, (_, i) => i + 1).map(value => (
                            <option key={value} value={String(value)}>{value}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          value={incomingEdge.value}
                          onChange={e => onConditionChange(question.id, incomingEdge.source, e.target.value)}
                          placeholder={t.formEditor.expectedAnswer}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </CardContent>
      )}
    </Card>
  )
}

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
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    params.then(p => {
      setWorkspaceId(p.workspaceId)
      setFormId(p.formId)
    })
  }, [params])

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
    if (!error) {
      setForm({ ...form, is_published: !form.is_published })
      if (!form.is_published) {
        setIsPublishModalOpen(true)
      } else {
        setIsSettingsModalOpen(false)
      }
    }
    setPublishing(false)
  }

  async function toggleRequireEmail() {
    if (!formId || !form) return
    const currentSetting = form.schema.settings?.requireEmail || false
    const newSchema = {
      ...form.schema,
      settings: { ...form.schema.settings, requireEmail: !currentSetting }
    }
    
    setForm({ ...form, schema: newSchema })
    
    const { error } = await supabase
      .from('forms')
      .update({ schema: newSchema })
      .eq('id', formId)
      
    if (error) {
      alert('Failed to save settings: ' + error.message)
      setForm({ ...form })
    }
  }

  async function shareForm() {
    if (!formId) return
    const shareUrl = `${window.location.origin}/f/${formId}`

    if (navigator.share) {
      try {
        await navigator.share({ title: form?.title ?? 'Form', url: shareUrl })
        return
      } catch {}
    }

    await navigator.clipboard.writeText(shareUrl)
    setShareStatus('Copied link')
    setTimeout(() => setShareStatus(''), 2000)
  }

  async function updateFormTitle(title: string) {
    if (!form || !formId) return
    setForm({ ...form, title })
    setSaving(true)
    const { error } = await supabase.from('forms').update({ title }).eq('id', formId)
    setSaving(false)
    if (error) setError(error.message)
    else { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  async function updateFormDescription(description: string) {
    if (!form || !formId) return
    setForm({ ...form, description })
    setSaving(true)
    const { error } = await supabase.from('forms').update({ description }).eq('id', formId)
    setSaving(false)
    if (error) setError(error.message)
    else { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  async function shareChatForm() {
    if (!formId) return
    const shareUrl = `${window.location.origin}/chat/${formId}`

    await navigator.clipboard.writeText(shareUrl)
    setShareStatus('Copied chat link')
    setTimeout(() => setShareStatus(''), 2000)
  }

  if (!form) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-4">
        <svg className="h-10 w-10 animate-spin text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-lg font-bold text-slate-500">Loading editor...</span>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col flex-1 bg-slate-100">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 flex h-24 items-center justify-between border-b-2 border-slate-200 bg-white/90 px-6 md:px-10 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <LanguageToggle />
          <div className="h-8 w-1 bg-slate-200 hidden sm:block rounded-full"></div>
          <div className="flex items-center gap-3">
            {saved ? (
              <span className="flex items-center gap-2 text-lg font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl">
                <Check size={20} strokeWidth={3} /> Saved
              </span>
            ) : saving ? (
              <span className="flex items-center gap-2 text-lg font-bold text-slate-500 bg-slate-50 px-4 py-2 rounded-xl">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-400"></span>
                </span>
                Saving...
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link href={`/dashboard/${workspaceId}/forms/${formId}/responses`}>
            <Button variant="ghost" size="lg" leftIcon={<Inbox size={20} strokeWidth={3} />}>
              <span className="hidden xl:inline">Responses</span>
            </Button>
          </Link>

          <Link href={`/dashboard/${workspaceId}/forms/${formId}/analytics`}>
            <Button variant="ghost" size="lg" leftIcon={<BarChart3 size={20} strokeWidth={3} />}>
              <span className="hidden xl:inline">Analytics</span>
            </Button>
          </Link>

          <div className="w-1 h-8 bg-slate-200 rounded-full mx-2 hidden lg:block"></div>
          <Button variant="secondary" size="lg" onClick={() => setIsSettingsModalOpen(true)} leftIcon={<Settings size={20} strokeWidth={3} />}>
            <span className="hidden xl:inline">Settings</span>
          </Button>

          {form.is_published ? (
            <div className="flex items-center gap-4">
              <Button size="lg" onClick={() => setIsPublishModalOpen(true)} leftIcon={<Share size={20} strokeWidth={3} />}>
                Share Form
              </Button>
            </div>
          ) : (
            <Button size="lg" onClick={togglePublish} isLoading={publishing} leftIcon={<Sparkles size={20} strokeWidth={3} />}>
              Publish Form
            </Button>
          )}
        </div>
      </header>

      {/* Editor Canvas */}
      <main className="flex-1 overflow-y-auto p-6 md:p-12">
        <div className="mx-auto max-w-4xl">
          
          <div className="mb-16 text-center space-y-6">
            <input
              type="text"
              value={form.title}
              onChange={e => updateFormTitle(e.target.value)}
              placeholder="Form title"
              className="w-full text-center text-6xl font-black tracking-tight text-slate-900 bg-transparent border-none outline-none placeholder:text-slate-300 transition-colors focus:placeholder:opacity-0"
            />
            <input
              type="text"
              value={form.description ?? ''}
              onChange={e => updateFormDescription(e.target.value)}
              placeholder="Add a description (optional)..."
              className="w-full text-center text-2xl font-medium text-slate-500 bg-transparent border-none outline-none placeholder:text-slate-300 transition-colors focus:placeholder:opacity-0"
            />
          </div>

          <div className="space-y-6">
            {questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 px-10 border-4 border-dashed border-slate-300 rounded-3xl bg-white text-center shadow-sm">
                <div className="size-24 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-8">
                  <ClipboardList size={48} strokeWidth={2.5} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-4">Build your form</h3>
                <p className="text-xl text-slate-500 max-w-lg mb-12 font-medium">
                  Start from scratch by adding your first question, or let our AI generate a complete form based on your prompt.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-lg">
                  <Button size="xl" className="w-full" onClick={addQuestion} leftIcon={<Plus size={24} strokeWidth={3} />}>
                    Add First Question
                  </Button>
                  <Button variant="outline" size="xl" className="w-full" onClick={() => setIsAiModalOpen(true)} leftIcon={<Sparkles size={24} strokeWidth={3} />}>
                    Generate with AI
                  </Button>
                </div>
              </div>
            ) : (
              questions.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={i}
                  total={questions.length}
                  onChange={uq => updateQuestion(i, uq)}
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
          </div>

          {questions.length > 0 && (
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 border-t-2 border-slate-200 pt-12 pb-24">
              <Button variant="secondary" size="xl" onClick={addQuestion} className="w-full sm:w-auto" leftIcon={<Plus size={24} strokeWidth={3} />}>
                Add Question
              </Button>
              <Button size="xl" className="w-full sm:w-auto" onClick={() => setIsAiModalOpen(true)} leftIcon={<Sparkles size={24} strokeWidth={3} />}>
                Generate More with AI
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {isAiModalOpen && (
        <AiGenerateModal
          open={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          onQuestionsGenerated={handleAIGenerated}
        />
      )}

      <Modal 
        isOpen={isPublishModalOpen} 
        onClose={() => setIsPublishModalOpen(false)}
        title="🎉 Form Published!"
        maxWidth="lg"
        footer={
          <Button size="lg" className="w-full" onClick={() => setIsPublishModalOpen(false)}>Done</Button>
        }
      >
        <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
          <div className="flex size-24 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600">
            <Check size={48} strokeWidth={3} />
          </div>
          <p className="text-xl font-bold text-slate-600">Your form is now live and ready to collect responses. Share the links below to get started.</p>
          
          <div className="w-full space-y-6 text-left mt-10">
            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200">
              <label className="text-lg font-bold text-slate-900 flex items-center gap-3 mb-4">
                <Eye size={20} strokeWidth={3} /> Standard Form Link
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Input 
                  readOnly 
                  value={`${window.location.origin}/f/${formId}`} 
                  className="bg-white"
                />
                <Button size="lg" onClick={shareForm} leftIcon={<Copy size={20} strokeWidth={3} />}>
                  {shareStatus === 'Copied link' ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            <div className="bg-indigo-50 p-6 rounded-2xl border-2 border-indigo-200">
              <label className="text-lg font-bold text-indigo-900 flex items-center gap-3 mb-4">
                <MessageSquare size={20} strokeWidth={3} /> AI Chatbot Link
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Input 
                  readOnly 
                  value={`${window.location.origin}/chat/${formId}`} 
                  className="bg-white border-2 border-indigo-200 focus:ring-indigo-500"
                />
                <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={shareChatForm} leftIcon={<Bot size={20} strokeWidth={3} />}>
                  {shareStatus === 'Copied chat link' ? 'Copied' : 'Copy Chat'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="⚙️ Form Settings"
      >
        <div className="space-y-10 py-6">
          {/* Access Control */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Access Control</h3>
              <p className="text-base font-medium text-slate-500 mt-2">Manage who can submit responses to this form.</p>
            </div>
            
            <label className="flex items-start gap-4 p-6 border-2 border-slate-200 rounded-2xl bg-slate-50 cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-colors">
              <div className="relative flex items-center mt-1">
                <input
                  type="checkbox"
                  checked={form.schema.settings?.requireEmail || false}
                  onChange={toggleRequireEmail}
                  className="peer sr-only"
                />
                <div className="h-8 w-14 rounded-full bg-slate-200 transition-colors peer-checked:bg-black"></div>
                <div className="absolute left-[4px] top-[4px] h-6 w-6 rounded-full bg-white transition-transform peer-checked:translate-x-6"></div>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">Limit to 1 response per person</p>
                <p className="text-base font-medium text-slate-500 mt-1">Requires users to verify their email address before submitting.</p>
              </div>
            </label>
          </div>

          {/* Embed */}
          {form.is_published && (
            <div className="space-y-6 pt-10 border-t-2 border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Embed Form</h3>
                <p className="text-base font-medium text-slate-500 mt-2">Copy the code below to embed this form on your website.</p>
              </div>
              <textarea 
                readOnly 
                value={`<iframe src="${window.location.origin}/f/${formId}" width="100%" height="600" frameborder="0" marginheight="0" marginwidth="0">Loading…</iframe>`}
                className="w-full h-32 rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 text-sm font-mono font-bold text-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 resize-none"
                onClick={e => (e.target as HTMLTextAreaElement).select()}
              />
            </div>
          )}

          {/* Danger Zone */}
          {form.is_published && (
            <div className="space-y-6 pt-10 border-t-2 border-red-100">
              <div>
                <h3 className="text-xl font-bold text-red-600">Danger Zone</h3>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 border-2 border-red-200 rounded-2xl bg-red-50">
                <div className="w-full sm:w-auto">
                  <p className="text-lg font-bold text-slate-900">Unpublish Form</p>
                  <p className="text-base font-medium text-slate-600 mt-1">Form will no longer accept responses.</p>
                </div>
                <Button size="lg" variant="danger" className="w-full sm:w-auto" onClick={togglePublish} isLoading={publishing}>
                  Unpublish
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

    </div>
  )
}
