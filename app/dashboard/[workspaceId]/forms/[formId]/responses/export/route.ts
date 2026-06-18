import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { normalizeFormSchema } from '@/lib/forms/logic'
import {
  buildResponsesCsv,
  safeCsvFilename,
  getResponseColumns,
  buildResponseRows,
  type ResponseRecord,
} from '@/lib/forms/responses'
import * as xlsx from 'xlsx'

interface RouteContext {
  params: Promise<{ workspaceId: string; formId: string }>
}

interface FormRecord {
  id: string
  workspace_id: string
  title: string
  schema: unknown
}

export async function GET(request: Request, context: RouteContext) {
  const url = new URL(request.url)
  const format = url.searchParams.get('format') || 'csv'
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
  const responseData = (responses ?? []) as ResponseRecord[]

  if (format === 'xlsx') {
    const headers = getResponseColumns(schema).map((column) => column.label)
    const rows = buildResponseRows(schema, responseData)
    
    const worksheet = xlsx.utils.aoa_to_sheet([headers, ...rows])
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Responses')
    
    const buf = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    
    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${safeCsvFilename(formRecord.title).replace('.csv', '.xlsx')}"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  const csv = buildResponsesCsv(schema, responseData)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeCsvFilename(formRecord.title)}"`,
      'Cache-Control': 'no-store',
    },
  })
}

