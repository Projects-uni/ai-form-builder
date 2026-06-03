import type { Answers, FormSchema, Question } from './types'

export interface ResponseRecord {
  id: string
  answers: Answers | null
  respondent_meta: Record<string, unknown> | null
  submitted_at: string
}

export interface ResponseColumn {
  key: string
  label: string
}

export function getResponseColumns(schema: FormSchema): ResponseColumn[] {
  return [
    { key: 'submitted_at', label: 'Submitted at' },
    ...schema.questions.map((question, index) => ({
      key: question.id,
      label: question.label || `Question ${index + 1}`,
    })),
    { key: 'user_agent', label: 'User agent' },
  ]
}

export function formatAnswer(question: Question, answers: Answers | null): string {
  const value = answers?.[question.id]
  if (!value) return ''

  if (question.type === 'multiple_choice') {
    return question.options?.find((option) => option.id === value)?.label ?? value
  }

  return value
}

export function formatResponseDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function getUserAgent(response: ResponseRecord): string {
  const userAgent = response.respondent_meta?.user_agent
  return typeof userAgent === 'string' ? userAgent : ''
}

export function buildResponseRows(schema: FormSchema, responses: ResponseRecord[]): string[][] {
  return responses.map((response) => [
    formatResponseDate(response.submitted_at),
    ...schema.questions.map((question) => formatAnswer(question, response.answers)),
    getUserAgent(response),
  ])
}

export function buildResponsesCsv(schema: FormSchema, responses: ResponseRecord[]): string {
  const headers = getResponseColumns(schema).map((column) => column.label)
  const rows = buildResponseRows(schema, responses)
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\n')

  return `\uFEFF${csv}\n`
}

export function safeCsvFilename(title: string): string {
  const fallback = 'form-responses'
  const normalized = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${normalized || fallback}-responses.csv`
}

function escapeCsvCell(value: string): string {
  if (!/[",\n\r]/.test(value)) return value
  return `"${value.replaceAll('"', '""')}"`
}

