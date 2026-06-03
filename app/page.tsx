import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServerTranslations } from '@/lib/i18n/server'
import LanguageToggle from '@/app/components/LanguageToggle'
import { 
  Sparkles, 
  Plus, 
  FolderKanban, 
  ClipboardList, 
  ArrowRight,
  LogOut
} from 'lucide-react'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { t } = await getServerTranslations()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch recent forms across all workspaces the user has access to
  const { data: memberWorkspaces } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)

  const workspaceIds = memberWorkspaces?.map(m => m.workspace_id) || []

  let recentForms: any[] = []
  if (workspaceIds.length > 0) {
    const { data: forms } = await supabase
      .from('forms')
      .select('id, title, description, is_published, created_at, workspace_id, workspaces(name)')
      .in('workspace_id', workspaceIds)
      .order('updated_at', { ascending: false })
      .limit(5)
    
    if (forms) {
      recentForms = forms
    }
  }

  const createFormHref = workspaceIds.length > 0 
    ? `/dashboard/${workspaceIds[0]}/forms/new` 
    : '/dashboard'

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#18181b] flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="flex size-9 items-center justify-center rounded-lg bg-slate-950 text-white">
                <Sparkles size={18} strokeWidth={2.2} />
              </div>
              <span className="font-semibold text-lg tracking-tight">{t.common.appName}</span>
            </Link>
            <LanguageToggle />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-500 hidden sm:block">
              {user.email}
            </span>
            <Link
              href="/auth/logout"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <LogOut size={16} />
              {t.common.signOut}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-6 py-12">
        {/* Welcome Section */}
        <section className="mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            {t.home.welcome}
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl">
            {t.home.subtitle}
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href={createFormHref}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-base font-medium text-white shadow-sm hover:bg-slate-800 transition-all"
            >
              <Plus size={18} />
              {t.home.createNewForm}
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
            >
              <FolderKanban size={18} />
              {t.home.manageWorkspaces}
            </Link>
          </div>
        </section>

        {/* Recent Forms Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-950">{t.home.recentForms}</h2>
            <Link 
              href="/dashboard" 
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              {t.home.viewAllWorkspaces} <ArrowRight size={16} />
            </Link>
          </div>

          {recentForms.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 mb-4">
                <ClipboardList size={32} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">{t.home.noFormsTitle}</h3>
              <p className="mt-2 text-base text-slate-500 max-w-md mx-auto">
                {t.home.noFormsDesc}
              </p>
              <Link
                href="/dashboard"
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition-all"
              >
                {t.home.goToWorkspace}
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentForms.map((form) => (
                <Link
                  key={form.id}
                  href={`/dashboard/${form.workspace_id}/forms/${form.id}`}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-semibold text-lg text-slate-950 line-clamp-1">
                        {form.title}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          form.is_published
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {form.is_published ? t.common.published : t.common.draft}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500 line-clamp-2">
                      {form.description || t.home.noDescription}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-500">
                      {t.home.edited} {formatDate(form.created_at)}
                    </p>
                    <div className="flex items-center gap-1 text-xs font-medium text-indigo-600 opacity-0 transform translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                      {t.home.openEditor} <ArrowRight size={14} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}