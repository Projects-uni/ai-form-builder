import Link from 'next/link'
import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Sparkles,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getServerTranslations } from '@/lib/i18n/server'
import LanguageToggle from '@/app/components/LanguageToggle'

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
  updated_at?: string | null
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

export default async function WorkspacePage({ params }: Props) {
  const { workspaceId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { t } = await getServerTranslations()

  if (!user) redirect('/auth/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member) redirect('/dashboard')

  const [{ data: workspace }, { data: forms }, { count: responseCount }] = await Promise.all([
    supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single(),
    supabase
      .from('forms')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),
    supabase
      .from('responses')
      .select('id, forms!inner(workspace_id)', { count: 'exact', head: true })
      .eq('forms.workspace_id', workspaceId),
  ])

  const formList = (forms ?? []) as FormRecord[]
  const publishedCount = formList.filter((form) => form.is_published).length
  const draftCount = formList.length - publishedCount
  const totalQuestions = formList.reduce((sum, form) => sum + questionCount(form), 0)
  const newestForm = formList[0]
  const completionRate = responseCount && publishedCount > 0 ? t.dashboard.collecting : t.dashboard.noData

  const navigationItems = [
    { label: t.dashboard.navigation.dashboard, icon: LayoutDashboard, href: '', active: true },
    { label: t.dashboard.navigation.forms, icon: ClipboardList, href: '#forms', active: false },
    { label: t.dashboard.navigation.settings, icon: Settings, href: '/settings', active: false },
  ]

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#18181b]">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white px-5 py-6 lg:flex lg:flex-col">
          <Link href="/" className="mb-8 flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#18181b] text-white">
              <Sparkles size={19} strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-sm font-semibold">{t.common.appName}</p>
              <p className="text-xs text-slate-500">{t.dashboard.researchDashboard}</p>
            </div>
          </Link>

          <nav className="space-y-2 mt-4">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const href = item.href ? `/dashboard/${workspaceId}${item.href}` : `/dashboard/${workspaceId}`
              return (
                <Link
                  key={item.label}
                  href={href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                    item.active
                      ? 'bg-slate-950 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.dashboard.workspace}
            </p>
            <p className="mt-2 truncate text-sm font-semibold">{workspace?.name}</p>
            <p className="mt-1 text-xs text-slate-500">{member.role} {t.dashboard.access}</p>
          </div>

          <div className="mt-auto space-y-2 border-t border-slate-200 pt-5">
            <p className="truncate text-xs text-slate-500">{user.email}</p>
            <Link
              href="/auth/logout"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              <LogOut size={16} />
              {t.common.signOut}
            </Link>
          </div>
        </aside>

        <main className="flex-1">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2 lg:hidden">
                  <Link href="/" className="rounded-lg bg-slate-950 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">
                    {t.common.appName}
                  </Link>
                  <span className="text-sm text-slate-500">{member.role}</span>
                  <LanguageToggle />
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium text-slate-500">{t.dashboard.title}</p>
                  <div className="hidden lg:block"><LanguageToggle /></div>
                </div>
                <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                  {workspace?.name}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/auth/logout"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 lg:hidden"
                >
                  <LogOut size={16} />
                  {t.common.signOut}
                </Link>
                <Link
                  href={`/dashboard/${workspaceId}/forms/new`}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white"
                >
                  <Plus size={17} />
                  {t.dashboard.newForm}
                </Link>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
            <section className="grid gap-6 md:grid-cols-3">
              <MetricCard label={t.dashboard.totalForms} value={formList.length.toString()} detail={`${publishedCount} ${t.dashboard.publishedCount}, ${draftCount} ${t.dashboard.draftCount}`} icon={ClipboardList} />
              <MetricCard label={t.dashboard.totalResponses} value={(responseCount ?? 0).toString()} detail={completionRate} icon={FileText} />
              <MetricCard label={t.dashboard.totalQuestions} value={totalQuestions.toString()} detail={t.dashboard.acrossAllForms} icon={LayoutDashboard} />
            </section>

            <section id="forms" className="mt-10">
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between bg-slate-50">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">{t.dashboard.workspaceForms}</h2>
                    <p className="text-base text-slate-500 mt-1">{t.dashboard.workspaceFormsDesc}</p>
                  </div>
                </div>

                {formList.length === 0 ? (
                  <div className="px-6 py-20 text-center">
                    <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 mb-6">
                      <ClipboardList size={28} />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-950">{t.dashboard.noFormsYet}</h3>
                    <p className="mx-auto mt-3 max-w-md text-base text-slate-500">
                      {t.dashboard.noFormsDesc}
                    </p>
                    <Link
                      href={`/dashboard/${workspaceId}/forms/new`}
                      className="mt-8 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-slate-800 transition-colors"
                    >
                      <Plus size={18} />
                      {t.dashboard.createForm}
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {formList.map((form) => (
                      <Link
                        key={form.id}
                        href={`/dashboard/${workspaceId}/forms/${form.id}`}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 transition hover:bg-slate-50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold text-slate-950">{form.title}</p>
                          <p className="mt-1.5 line-clamp-1 text-sm text-slate-500">
                            {form.description || t.home.noDescription}
                          </p>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t.dashboard.questions}</p>
                            <p className="mt-1 text-sm font-medium text-slate-700">{questionCount(form)}</p>
                          </div>
                          <div className="text-right hidden sm:block">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t.dashboard.created}</p>
                            <p className="mt-1 text-sm font-medium text-slate-700">{formatDate(form.created_at)}</p>
                          </div>
                          <div className="flex items-center justify-end w-24">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                form.is_published
                                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                                  : 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20'
                              }`}
                            >
                              {form.is_published ? t.common.published : t.common.draft}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: string
  detail: string
  icon: any
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <p className="text-base font-medium text-slate-500">{label}</p>
        <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Icon size={20} />
        </div>
      </div>
      <div>
        <p className="mt-6 text-4xl font-semibold tracking-tight text-slate-950">{value}</p>
        <p className="mt-2 text-sm text-slate-500">{detail}</p>
      </div>
    </div>
  )
}
