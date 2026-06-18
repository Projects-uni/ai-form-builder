import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { normalizeFormSchema } from '@/lib/forms/logic'
import {
  formatAnswer,
  formatResponseDate,
  getUserAgent,
  type ResponseRecord,
} from '@/lib/forms/responses'
import { getServerTranslations } from '@/lib/i18n/server'
import LanguageToggle from '@/app/components/LanguageToggle'
import { ArrowLeft, ExternalLink, Download, FileSpreadsheet, BarChart3, Inbox } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { Card, CardContent } from '@/app/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table'

interface Props {
  params: Promise<{ workspaceId: string; formId: string }>
}

interface FormRecord {
  id: string
  workspace_id: string
  title: string
  description: string | null
  schema: unknown
  is_published: boolean
}

export default async function ResponsesPage({ params }: Props) {
  const { workspaceId, formId } = await params
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

  const [{ data: form }, { data: responses, error: responsesError }] = await Promise.all([
    supabase
      .from('forms')
      .select('id, workspace_id, title, description, schema, is_published')
      .eq('id', formId)
      .eq('workspace_id', workspaceId)
      .single(),
    supabase
      .from('responses')
      .select('id, answers, respondent_meta, submitted_at')
      .eq('form_id', formId)
      .order('submitted_at', { ascending: false }),
  ])

  if (!form) redirect(`/dashboard/${workspaceId}`)
  if (responsesError) throw new Error(responsesError.message)

  const formRecord = form as FormRecord
  const schema = normalizeFormSchema(formRecord.schema)
  const responseList = (responses ?? []) as ResponseRecord[]

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 font-sans">
      <header className="sticky top-0 z-20 flex h-24 items-center justify-between border-b-2 border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <Link
            href={`/dashboard/${workspaceId}/forms/${formId}`}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-black transition-colors shadow-sm"
          >
            <ArrowLeft size={24} strokeWidth={3} />
          </Link>
          <div className="h-8 w-1 bg-slate-200 rounded-full"></div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 truncate max-w-sm">
              {formRecord.title}
            </h1>
            <p className="text-lg font-bold text-slate-500">{responseList.length} {t.analytics.responseCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <LanguageToggle />
          <Link href={`/f/${formId}`} target="_blank">
            <Button variant="outline" size="lg" leftIcon={<ExternalLink size={20} strokeWidth={3} />}>
              {t.responses.publicForm}
            </Button>
          </Link>
          <Link href={`/dashboard/${workspaceId}/forms/${formId}/analytics`}>
            <Button variant="secondary" size="lg" leftIcon={<BarChart3 size={20} strokeWidth={3} />}>
              {t.common.analytics}
            </Button>
          </Link>
          <a href={`/dashboard/${workspaceId}/forms/${formId}/responses/export?format=csv`}>
            <Button size="lg" leftIcon={<Download size={20} strokeWidth={3} />}>
              CSV
            </Button>
          </a>
          <a href={`/dashboard/${workspaceId}/forms/${formId}/responses/export?format=xlsx`}>
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700" leftIcon={<FileSpreadsheet size={20} strokeWidth={3} />}>
              Excel
            </Button>
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-black text-slate-900">{t.responses.title}</h2>
          <p className="text-xl text-slate-500 mt-2 font-medium">View and export all submissions for this form.</p>
        </div>

        {responseList.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-20 text-center border-4 border-dashed border-slate-300 bg-white shadow-sm">
            <div className="size-20 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mb-6">
              <Inbox size={40} strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">{t.responses.noResponsesYet}</h3>
            <p className="text-lg text-slate-500 max-w-md font-medium">{t.responses.noResponsesDesc}</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-48 whitespace-nowrap bg-slate-50 border-r-2 border-slate-200">
                    {t.responses.submitted}
                  </TableHead>
                  {schema.questions.map((question, index) => (
                    <TableHead
                      key={question.id}
                      className="min-w-64 bg-slate-50 border-r-2 border-slate-200"
                    >
                      {question.label || `${t.dashboard.questions} ${index + 1}`}
                    </TableHead>
                  ))}
                  <TableHead className="min-w-72 bg-slate-50">
                    {t.responses.userAgent}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responseList.map((response) => (
                  <TableRow key={response.id} className="align-top">
                    <TableCell className="whitespace-nowrap font-bold text-slate-900 border-r-2 border-slate-100 bg-slate-50/30">
                      {formatResponseDate(response.submitted_at)}
                    </TableCell>
                    {schema.questions.map((question) => (
                      <TableCell key={question.id} className="text-lg text-slate-800 border-r-2 border-slate-100">
                        {formatAnswer(question, response.answers) || (
                          <span className="text-slate-400 font-medium italic">{t.responses.empty}</span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="max-w-md text-sm text-slate-500 font-medium">
                      <span className="line-clamp-2">{getUserAgent(response) || t.responses.unknown}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </main>
    </div>
  )
}
