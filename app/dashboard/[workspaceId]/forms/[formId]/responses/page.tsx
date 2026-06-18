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
import { ArrowLeft } from 'lucide-react'

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
    <div className="min-h-screen bg-[#f6f7f9] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Link
                href={`/dashboard/${workspaceId}/forms/${formId}`}
                className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 text-sm font-medium transition-colors"
              >
                <ArrowLeft size={16} />
                {t.common.backToEditor}
              </Link>
              <div className="lg:hidden"><LanguageToggle /></div>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
                {t.responses.title}
              </h1>
              <div className="hidden lg:block"><LanguageToggle /></div>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {formRecord.title} · {responseList.length} {t.analytics.responseCount}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/f/${formId}`}
              target="_blank"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
            >
              {t.responses.publicForm}
            </Link>
            <Link
              href={`/dashboard/${workspaceId}/forms/${formId}/analytics`}
              className="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
            >
              {t.common.analytics}
            </Link>
            <a
              href={`/dashboard/${workspaceId}/forms/${formId}/responses/export?format=csv`}
              className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              {t.responses.exportCsv}
            </a>
            <a
              href={`/dashboard/${workspaceId}/forms/${formId}/responses/export?format=xlsx`}
              className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
            >
              {t.responses.exportXlsx}
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        {responseList.length === 0 ? (
          <section className="rounded-lg border border-slate-200 bg-white px-5 py-16 text-center">
            <h2 className="text-base font-semibold">{t.responses.noResponsesYet}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {t.responses.noResponsesDesc}
            </p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-semibold">
                      {t.responses.submitted}
                    </th>
                    {schema.questions.map((question, index) => (
                      <th
                        key={question.id}
                        className="min-w-56 border-b border-slate-200 px-4 py-3 font-semibold"
                      >
                        {question.label || `${t.dashboard.questions} ${index + 1}`}
                      </th>
                    ))}
                    <th className="min-w-72 border-b border-slate-200 px-4 py-3 font-semibold">
                      {t.responses.userAgent}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {responseList.map((response) => (
                    <tr key={response.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatResponseDate(response.submitted_at)}
                      </td>
                      {schema.questions.map((question) => (
                        <td key={question.id} className="px-4 py-3 text-slate-800">
                          {formatAnswer(question, response.answers) || (
                            <span className="text-slate-400">{t.responses.empty}</span>
                          )}
                        </td>
                      ))}
                      <td className="max-w-md px-4 py-3 text-xs text-slate-500">
                        <span className="line-clamp-2">{getUserAgent(response) || t.responses.unknown}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
