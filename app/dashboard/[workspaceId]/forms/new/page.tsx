'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AiGenerateModal from '@/app/components/AiGenerateModal'
import type { Question } from '@/lib/forms/types'
import { useTranslation } from '@/lib/i18n/client'
import LanguageToggle from '@/app/components/LanguageToggle'

interface Props {
  params: Promise<{ workspaceId: string }>
}

export default function NewFormPage({ params }: Props) {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const router = useRouter()
  const { t } = useTranslation()

  // Resolve params
  useEffect(() => {
    params.then(p => setWorkspaceId(p.workspaceId))
  }, [params])

  if (!workspaceId) return null

  async function handleCreate() {
    if (!title.trim()) {
      setError(t.formEditor.titleReqError)
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data: form, error: err } = await supabase
      .from('forms')
      .insert({
        workspace_id: workspaceId,
        title: title.trim(),
        description: description.trim() || null,
        schema: { questions: [] },
        logic_graph: { nodes: [], edges: [] },
        is_published: false,
      })
      .select()
      .single()

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    router.push(`/dashboard/${workspaceId}/forms/${form.id}`)
  }

  async function handleAIGenerated(questions: Question[]) {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const formTitle = title.trim() || 'AI Generated Form'

    const { data: form, error: err } = await supabase
      .from('forms')
      .insert({
        workspace_id: workspaceId,
        title: formTitle,
        description: description.trim() || null,
        schema: { questions },
        logic_graph: { nodes: questions.map(q => q.id), edges: [] },
        is_published: false,
      })
      .select()
      .single()

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    router.push(`/dashboard/${workspaceId}/forms/${form.id}`)
  }

  return (
    <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 20px' }}>
      <div className="flex justify-between items-center mb-8">
        {/* Back link */}
        <Link
          href={`/dashboard/${workspaceId}`}
          className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          {t.common.backToWorkspace}
        </Link>
        <LanguageToggle />
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 6 }}>{t.formEditor.newFormTitle}</h1>
      <p style={{ fontSize: 14, color: '#666', marginBottom: 32 }}>
        {t.formEditor.newFormDesc}
      </p>

      {/* Title input */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
          {t.formEditor.formTitleLabel} <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          type="text"
          placeholder={t.formEditor.formTitlePlaceholder}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          autoFocus
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 15,
            border: '1px solid #e0e0e0',
            borderRadius: 8,
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
      </div>

      {/* Description input */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
          {t.formEditor.descriptionLabel} <span style={{ color: '#999', fontWeight: 400 }}>{t.formEditor.optional}</span>
        </label>
        <textarea
          placeholder={t.formEditor.descriptionPlaceholder}
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 14,
            border: '1px solid #e0e0e0',
            borderRadius: 8,
            boxSizing: 'border-box',
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {error && (
        <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{error}</p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>

        {/* Create button */}
        <button
          onClick={handleCreate}
          disabled={loading || !title.trim()}
          style={{
            flex: 1,
            padding: '11px 20px',
            background: title.trim() ? '#18181b' : '#e0e0e0',
            color: title.trim() ? '#fff' : '#999',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: title.trim() ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s',
          }}
        >
          {loading ? t.formEditor.creatingBtn : t.formEditor.createFormBtn}
        </button>

        {/* AI Generate button (placeholder) */}
        <button
          onClick={() => setIsAiModalOpen(true)}
          style={{
            padding: '11px 16px',
            background: '#fff',
            color: '#18181b',
            border: '1px solid #e0e0e0',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          ✨ {t.formEditor.generateWithAI}
        </button>

      </div>

      {/* AI hint */}
      <div style={{
        marginTop: 20,
        padding: '12px 16px',
        background: '#fafafa',
        border: '1px solid #f0f0f0',
        borderRadius: 8,
        fontSize: 13,
        color: '#888',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 16 }}>✨</span>
        <span>
          <strong style={{ fontWeight: 500, color: '#555' }}>{t.formEditor.comingSoon}</strong> {t.formEditor.comingSoonDesc}
        </span>
      </div>

      <AiGenerateModal
        open={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onQuestionsGenerated={handleAIGenerated}
      />
    </div>
  )
}
