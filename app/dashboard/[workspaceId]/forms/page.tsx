import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServerTranslations } from '@/lib/i18n/server'
import LanguageToggle from '@/app/components/LanguageToggle'
import { Button } from '@/app/components/ui/Button'
import { Badge } from '@/app/components/ui/Badge'
import { Plus, LayoutDashboard, ClipboardList, BarChart3, FileText } from 'lucide-react'

interface Props {
  params: Promise<{ workspaceId: string }>
}

type FormRecord = {
  id: string
  title: string
  description: string | null
  schema: { questions?: unknown[] } | null
  is_published: boolean
  created_at: string
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function questionCount(form: FormRecord) {
  return Array.isArray(form.schema?.questions) ? form.schema.questions.length : 0
}

// Generates a consistent subtle gradient background class based on the string
function getGradientClass(id: string) {
  const gradients = [
    'from-indigo-100 to-purple-100 text-indigo-700',
    'from-emerald-100 to-teal-100 text-emerald-700',
    'from-rose-100 to-pink-100 text-rose-700',
    'from-blue-100 to-cyan-100 text-blue-700',
    'from-amber-100 to-orange-100 text-amber-700',
  ]
  let sum = 0
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i)
  return gradients[sum % gradients.length]
}

export default async function WorkspaceFormsPage({ params }: Props) {
  const { workspaceId } = await params
  const supabase = await createClient()
  const { t } = await getServerTranslations()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch all forms in the workspace
  const { data: formsData, error } = await supabase
    .from('forms')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error || !formsData) {
    redirect('/dashboard')
  }

  const formList = formsData as FormRecord[]

  // Fetch response counts for all forms
  const { data: responseCounts } = await supabase
    .from('responses')
    .select('form_id')
    .in('form_id', formList.map(f => f.id))

  // Map response counts
  const responseCountMap = new Map<string, number>()
  if (responseCounts) {
    for (const r of responseCounts) {
      responseCountMap.set(r.form_id, (responseCountMap.get(r.form_id) || 0) + 1)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 font-sans">
      <header className="sticky top-0 z-20 flex h-24 items-center justify-between border-b-2 border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <Link
            href={`/dashboard/${workspaceId}`}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-black transition-colors shadow-sm"
          >
            <LayoutDashboard size={24} strokeWidth={3} />
          </Link>
          <div className="h-8 w-1 bg-slate-200 rounded-full"></div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">{t.dashboard.allForms}</h1>
            <p className="text-lg font-bold text-slate-500">{t.dashboard.manageWorkspaceForms}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LanguageToggle />
          <Link href={`/dashboard/${workspaceId}/forms/new`}>
            <Button size="lg" leftIcon={<Plus size={20} strokeWidth={3} />}>
              {t.home.createNewForm}
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-8">
        
        {formList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center rounded-3xl border-4 border-dashed border-slate-200 bg-white">
            <div className="flex size-24 items-center justify-center rounded-3xl bg-slate-100 mb-8 shadow-sm">
              <ClipboardList className="h-12 w-12 text-slate-400" strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4">{t.dashboard.noFormsCreated}</h2>
            <p className="text-xl text-slate-500 max-w-lg mb-10 font-medium">
              {t.dashboard.startCollecting}
            </p>
            <Link href={`/dashboard/${workspaceId}/forms/new`}>
              <Button size="xl" className="shadow-xl shadow-indigo-200" leftIcon={<Plus size={24} strokeWidth={3} />}>
                {t.dashboard.createFirstForm}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {formList.map((form) => {
              const rCount = responseCountMap.get(form.id) || 0
              const qCount = questionCount(form)
              const gradient = getGradientClass(form.id)
              
              return (
                <div 
                  key={form.id} 
                  className="group relative flex flex-col overflow-hidden rounded-3xl bg-white border-2 border-slate-100 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:border-slate-300"
                >
                  {/* Decorative Banner */}
                  <div className={`h-24 w-full bg-gradient-to-br ${gradient} flex items-center px-6`}>
                    <div className="size-12 rounded-2xl bg-white/40 backdrop-blur-sm flex items-center justify-center shadow-sm">
                      <FileText size={24} strokeWidth={2.5} />
                    </div>
                  </div>

                  <div className="flex flex-col flex-1 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <Badge variant={form.is_published ? 'success' : 'secondary'} className="font-bold py-1 px-3">
                        {form.is_published ? t.common.published : t.common.draft}
                      </Badge>
                      <span className="text-sm font-bold text-slate-400">{formatDate(form.created_at)}</span>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 line-clamp-1 mb-2 group-hover:text-indigo-600 transition-colors">
                      {form.title}
                    </h3>
                    
                    <p className="text-sm font-medium text-slate-500 line-clamp-2 mb-6 min-h-[40px]">
                      {form.description || t.home.noDescription}
                    </p>

                    <div className="mt-auto grid grid-cols-2 gap-4 border-y-2 border-slate-100 py-4 mb-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{t.dashboard.questions}</p>
                        <p className="text-lg font-black text-slate-900">{qCount}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{t.common.responses}</p>
                        <p className="text-lg font-black text-slate-900">{rCount}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/${workspaceId}/forms/${form.id}`} className="flex-1">
                        <Button variant="secondary" className="w-full justify-center">
                          {t.dashboard.edit}
                        </Button>
                      </Link>
                      {rCount > 0 && (
                        <Link href={`/dashboard/${workspaceId}/forms/${form.id}/analytics`} className="flex-1">
                          <Button variant="outline" className="w-full justify-center gap-2">
                            <BarChart3 size={18} strokeWidth={2.5} />
                            {t.dashboard.data}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
