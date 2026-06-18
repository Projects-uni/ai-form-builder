import Link from 'next/link'
import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  Plus,
  ArrowUpRight,
  Sparkles
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getServerTranslations } from '@/lib/i18n/server'
import LanguageToggle from '@/app/components/LanguageToggle'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card'
import { Button } from '@/app/components/ui/Button'
import { Badge } from '@/app/components/ui/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table'

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
  const { t } = await getServerTranslations()

  const [{ data: forms }, { count: responseCount }] = await Promise.all([
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
  const totalQuestions = formList.reduce((sum, form) => sum + questionCount(form), 0)

  const conversionRate = responseCount ? Math.min(Math.round((responseCount / (responseCount + 120)) * 100), 100) : 0

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50">
      <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b-2 border-slate-200 bg-white px-8">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-slate-900">{t.dashboard.title}</h1>
        </div>
        <div className="flex items-center gap-6">
          <LanguageToggle />
          <Link href={`/dashboard/${workspaceId}/forms/new`}>
            <Button size="md" leftIcon={<Plus size={20} strokeWidth={3} />}>
              {t.dashboard.createForm}
            </Button>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-8 space-y-12">

        {/* KPI Section */}
        <section className="grid gap-8 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-bold text-slate-500">{t.dashboard.totalResponses}</CardTitle>
              <FileText className="h-6 w-6 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black text-slate-900">{responseCount ?? 0}</div>
              <p className="text-sm font-bold text-slate-500 mt-4 flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-emerald-500" strokeWidth={3} />
                <span className="text-emerald-500">+12%</span> {t.dashboard.fromLastMonth}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-bold text-slate-500">{t.dashboard.activeForms}</CardTitle>
              <ClipboardList className="h-6 w-6 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black text-slate-900">{publishedCount}</div>
              <p className="text-sm font-bold text-slate-500 mt-4">
                {t.dashboard.outOfTotal.replace('{count}', formList.length.toString())}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-bold text-slate-500">{t.dashboard.conversionRate}</CardTitle>
              <LayoutDashboard className="h-6 w-6 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black text-slate-900">{conversionRate}%</div>
              <p className="text-sm font-bold text-slate-500 mt-4 flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-emerald-500" strokeWidth={3} />
                <span className="text-emerald-500">+2.4%</span> {t.dashboard.fromLastMonth}
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Quick Action / AI section */}
        <section>
          <Card className="relative overflow-hidden border-2 border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
            <div className="absolute -right-20 -top-20 size-64 rounded-full bg-indigo-50 opacity-50 blur-3xl"></div>
            
            <CardContent className="relative z-10 flex flex-col items-center justify-between gap-6 p-8 md:flex-row md:gap-8 md:p-10">
              <div className="flex-1">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100">
                    <Sparkles className="h-5 w-5 text-indigo-500" strokeWidth={2.5} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">{t.dashboard.generateAI}</h2>
                </div>
                <p className="max-w-2xl text-base font-medium text-slate-500 leading-relaxed">
                  {t.dashboard.generateAIDesc}
                </p>
              </div>
              <Link href={`/dashboard/${workspaceId}/forms/new`} className="shrink-0 w-full md:w-auto">
                <Button className="w-full bg-black text-white hover:bg-slate-800 hover:shadow-lg transition-all" size="lg">
                  {t.dashboard.tryAIBuilder}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>

        {/* Recent Forms Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{t.home.recentForms}</h2>
              <p className="text-base text-slate-500 mt-1">{t.dashboard.recentFormsDesc}</p>
            </div>
            <Link href={`/dashboard/${workspaceId}/forms`}>
              <Button variant="outline" size="md">{t.dashboard.viewAll}</Button>
            </Link>
          </div>

          <Card className="overflow-hidden">
            {formList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="flex size-20 items-center justify-center rounded-2xl bg-slate-100 mb-6">
                  <ClipboardList className="h-10 w-10 text-slate-400" strokeWidth={2.5} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">{t.dashboard.noFormsCreated}</h3>
                <p className="text-lg text-slate-500 mt-2 max-w-md mb-8">
                  {t.dashboard.startCollecting}
                </p>
                <Link href={`/dashboard/${workspaceId}/forms/new`}>
                  <Button size="lg" leftIcon={<Plus size={20} strokeWidth={3} />}>{t.dashboard.createForm}</Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.dashboard.name}</TableHead>
                    <TableHead>{t.dashboard.status}</TableHead>
                    <TableHead>{t.dashboard.questions}</TableHead>
                    <TableHead>{t.dashboard.createdAt}</TableHead>
                    <TableHead className="text-right">{t.dashboard.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formList.slice(0, 5).map((form) => (
                    <TableRow key={form.id}>
                      <TableCell className="font-bold text-slate-900 text-lg">
                        <Link href={`/dashboard/${workspaceId}/forms/${form.id}`} className="hover:text-indigo-600 hover:underline transition-colors block">
                          {form.title}
                        </Link>
                        {form.description && (
                          <p className="text-sm text-slate-500 font-medium truncate max-w-xs mt-1">
                            {form.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={form.is_published ? 'success' : 'secondary'}>
                          {form.is_published ? t.common.published : t.common.draft}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 font-bold text-lg">
                        {questionCount(form)}
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium">
                        {formatDate(form.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link href={`/dashboard/${workspaceId}/forms/${form.id}/responses`}>
                            <Button variant="ghost" size="md">{t.common.responses}</Button>
                          </Link>
                          <Link href={`/dashboard/${workspaceId}/forms/${form.id}/analytics`}>
                            <Button variant="ghost" size="md">{t.common.analytics}</Button>
                          </Link>
                          <Link href={`/dashboard/${workspaceId}/forms/${form.id}`}>
                            <Button variant="secondary" size="md">{t.dashboard.editForm}</Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </section>
      </div>
    </main>
  )
}
