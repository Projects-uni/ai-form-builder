'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/client'
import LanguageToggle from '@/app/components/LanguageToggle'

interface Webhook {
  id: string
  target_url: string
  event_type: string
  secret_key: string
  is_active: boolean
  created_at: string
}

interface Props {
  params: Promise<{ workspaceId: string }>
}

export default function SettingsPage({ params }: Props) {
  const { t } = useTranslation()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  
  // Add Webhook Form
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTargetUrl, setNewTargetUrl] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    params.then(p => {
      setWorkspaceId(p.workspaceId)
    })
  }, [params])

  useEffect(() => {
    if (!workspaceId) return
    loadWebhooks()
  }, [workspaceId])

  async function loadWebhooks() {
    setLoading(true)
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
    } else {
      setWebhooks(data || [])
    }
    setLoading(false)
  }

  async function handleAddWebhook(e: React.FormEvent) {
    e.preventDefault()
    if (!workspaceId || !newTargetUrl.trim()) return

    setAdding(true)
    
    // Generate secret using Web Crypto API for the client side
    const array = new Uint8Array(32)
    window.crypto.getRandomValues(array)
    const secret = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    
    const { data, error } = await supabase
      .from('webhooks')
      .insert({
        workspace_id: workspaceId,
        target_url: newTargetUrl.trim(),
        event_type: 'new_response',
        secret_key: secret,
        is_active: true
      })
      .select()
      .single()

    setAdding(false)
    if (error) {
      alert(t.common.error + ': ' + error.message)
    } else if (data) {
      setWebhooks([data, ...webhooks])
      setNewTargetUrl('')
      setShowAddForm(false)
    }
  }

  async function toggleWebhook(id: string, currentStatus: boolean) {
    const { error } = await supabase
      .from('webhooks')
      .update({ is_active: !currentStatus })
      .eq('id', id)

    if (!error) {
      setWebhooks(webhooks.map(wh => wh.id === id ? { ...wh, is_active: !currentStatus } : wh))
    }
  }

  async function deleteWebhook(id: string) {
    if (!confirm(t.settings.confirmDelete)) return

    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', id)

    if (!error) {
      setWebhooks(webhooks.filter(wh => wh.id !== id))
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9f9f9]">
        <p className="text-sm text-slate-500">{t.common.loading}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Link
                href={`/dashboard/${workspaceId}`}
                className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 text-sm font-medium transition-colors"
              >
                <ArrowLeft size={16} />
                {t.common.backToWorkspace}
              </Link>
              <div className="lg:hidden"><LanguageToggle /></div>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
                {t.settings.title}
              </h1>
              <div className="hidden lg:block"><LanguageToggle /></div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        
        <section className="mb-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t.settings.webhooks}</h2>
              <p className="text-sm text-slate-500 mt-1">{t.settings.webhooksDesc}</p>
            </div>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
              >
                <Plus size={16} />
                {t.settings.addWebhook}
              </button>
            )}
          </div>

          {showAddForm && (
            <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold mb-4">{t.settings.addWebhook}</h3>
              <form onSubmit={handleAddWebhook} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {t.settings.targetUrl}
                  </label>
                  <input
                    type="url"
                    required
                    value={newTargetUrl}
                    onChange={(e) => setNewTargetUrl(e.target.value)}
                    placeholder={t.settings.targetUrlPlaceholder}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-3 justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adding}
                    className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {adding ? t.common.saving : t.settings.addWebhook}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {webhooks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-sm text-slate-500">{t.settings.noWebhooksYet}</p>
              </div>
            ) : (
              webhooks.map((webhook) => (
                <div key={webhook.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-sm text-slate-900 truncate bg-slate-100 px-2 py-1 rounded">
                        {webhook.target_url}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${webhook.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {webhook.is_active ? t.settings.active : t.settings.inactive}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      <span className="font-semibold">{t.settings.secretKey}:</span> <span className="font-mono">{webhook.secret_key}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t.settings.secretKeyDesc}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => toggleWebhook(webhook.id, webhook.is_active)}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      {webhook.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => deleteWebhook(webhook.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete webhook"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </main>
    </div>
  )
}
