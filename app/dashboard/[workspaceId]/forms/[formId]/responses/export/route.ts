import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { normalizeFormSchema } from '@/lib/forms/logic'
import {
  buildResponsesCsv,
  safeCsvFilename,
  type ResponseRecord,
} from '@/lib/forms/responses'

interface RouteContext {
  params: Promise<{ workspaceId: string; formId: string }>
}

interface FormRecord {
  id: string
  workspace_id: string
  title: string
  schema: unknown
}

export async function GET(_request: Request, context: RouteContext) {
  const { workspaceId, formId } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
      .select('id, workspace_id, title, schema')
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
  if (responsesError) {
    return new Response(responsesError.message, { status: 500 })
  }

  const formRecord = form as FormRecord
  const schema = normalizeFormSchema(formRecord.schema)
  const csv = buildResponsesCsv(schema, (responses ?? []) as ResponseRecord[])

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeCsvFilename(formRecord.title)}"`,
      'Cache-Control': 'no-store',
    },
  })
}

