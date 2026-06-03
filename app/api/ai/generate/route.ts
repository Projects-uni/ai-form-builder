import { createClient } from '@/lib/supabase/server'
import Groq from 'groq-sdk'

export const dynamic = 'force-dynamic'

interface GenerateRequest {
  purpose: string
  audience: string
  questionCount: number
  questionTypes: string[]
}

const ALLOWED_TYPES = ['short_text', 'long_text', 'multiple_choice', 'rating']

function buildPrompt(input: GenerateRequest): string {
  const typeDescriptions: Record<string, string> = {
    short_text: 'short_text — a brief free-text answer (one line)',
    long_text: 'long_text — a longer free-text answer (paragraph)',
    multiple_choice: 'multiple_choice — choose one from several options. You MUST include an "options" array with 2-5 objects, each having an "id" (e.g. "o_1", "o_2") and "label" field',
    rating: 'rating — a numeric rating. Include a "max" field (use 5 unless another value is more appropriate)',
  }

  const typeList = input.questionTypes
    .filter(t => ALLOWED_TYPES.includes(t))
    .map(t => typeDescriptions[t])
    .join('\n  - ')

  return `You are a professional survey designer. Generate exactly ${input.questionCount} survey questions for the following context:

PURPOSE: ${input.purpose}
TARGET AUDIENCE: ${input.audience}

ALLOWED QUESTION TYPES:
  - ${typeList}

RULES:
1. Return a valid JSON array of question objects.
2. Each question object MUST have these fields:
   - "id": a unique string starting with "q_" followed by 7 random alphanumeric characters (e.g. "q_a1b2c3d")
   - "type": one of the allowed types listed above
   - "label": the question text — clear, concise, and relevant to the purpose and audience
   - "required": boolean (set important questions to true)
3. For "multiple_choice" questions, include an "options" array with objects containing "id" (e.g. "o_1") and "label".
4. For "rating" questions, include a "max" field (integer, typically 5).
5. Use a diverse mix of the allowed question types.
6. Questions should be ordered logically — general questions first, specific ones later.
7. Write questions in clear, professional language appropriate for the target audience.
8. Do NOT include any text outside the JSON array. No markdown, no explanation — only the raw JSON array.

RESPOND WITH ONLY THE JSON ARRAY:`
}

function generateId() {
  return 'q_' + Math.random().toString(36).slice(2, 9)
}

function generateOptionId() {
  return 'o_' + Math.random().toString(36).slice(2, 9)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeQuestion(raw: any): any | null {
  if (!raw || typeof raw !== 'object') return null
  if (typeof raw.label !== 'string' || !raw.label.trim()) return null

  const type = ALLOWED_TYPES.includes(raw.type) ? raw.type : 'short_text'

  const question: Record<string, unknown> = {
    id: typeof raw.id === 'string' && raw.id.startsWith('q_') ? raw.id : generateId(),
    type,
    label: raw.label.trim(),
    required: typeof raw.required === 'boolean' ? raw.required : false,
  }

  if (type === 'multiple_choice') {
    if (Array.isArray(raw.options) && raw.options.length >= 2) {
      question.options = raw.options
        .filter((o: unknown) => o && typeof o === 'object' && typeof (o as Record<string, unknown>).label === 'string')
        .map((o: Record<string, unknown>) => ({
          id: typeof o.id === 'string' ? o.id : generateOptionId(),
          label: String(o.label),
        }))
    } else {
      question.options = [
        { id: generateOptionId(), label: 'Option 1' },
        { id: generateOptionId(), label: 'Option 2' },
      ]
    }
  }

  if (type === 'rating') {
    question.max = typeof raw.max === 'number' && raw.max >= 2 && raw.max <= 10
      ? raw.max
      : 5
  }

  return question
}

export async function POST(request: Request) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse body
  let body: GenerateRequest
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { purpose, audience, questionCount, questionTypes } = body

  if (!purpose || typeof purpose !== 'string' || purpose.trim().length < 3) {
    return Response.json({ error: 'Purpose is required (min 3 characters)' }, { status: 400 })
  }

  if (!audience || typeof audience !== 'string' || audience.trim().length < 2) {
    return Response.json({ error: 'Audience is required' }, { status: 400 })
  }

  const count = Math.min(Math.max(Number(questionCount) || 5, 1), 20)

  const types = Array.isArray(questionTypes)
    ? questionTypes.filter(t => ALLOWED_TYPES.includes(t))
    : ['short_text', 'long_text', 'multiple_choice', 'rating']

  if (types.length === 0) {
    return Response.json({ error: 'At least one valid question type is required' }, { status: 400 })
  }

  const prompt = buildPrompt({
    purpose: purpose.trim(),
    audience: audience.trim(),
    questionCount: count,
    questionTypes: types,
  })

  // Call Groq with streaming
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const chatStream = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 4096,
          stream: true,
        })

        let buffer = ''

        for await (const chunk of chatStream) {
          const delta = chunk.choices[0]?.delta?.content ?? ''
          buffer += delta

          // Try to parse complete questions from the buffer
          // Look for complete JSON objects within the accumulating buffer
          const questions = tryExtractQuestions(buffer)

          if (questions.extracted.length > 0) {
            for (const q of questions.extracted) {
              const sanitized = sanitizeQuestion(q)
              if (sanitized) {
                const sseData = `data: ${JSON.stringify(sanitized)}\n\n`
                controller.enqueue(encoder.encode(sseData))
              }
            }
            buffer = questions.remaining
          }
        }

        // Final attempt — parse any remaining buffered content
        try {
          // Clean up the buffer - remove any trailing characters
          let cleanBuffer = buffer.trim()
          if (!cleanBuffer.startsWith('[')) cleanBuffer = '[' + cleanBuffer
          if (!cleanBuffer.endsWith(']')) cleanBuffer = cleanBuffer + ']'
          // Remove trailing commas before ]
          cleanBuffer = cleanBuffer.replace(/,\s*]/, ']')

          const remaining = JSON.parse(cleanBuffer)
          if (Array.isArray(remaining)) {
            for (const q of remaining) {
              const sanitized = sanitizeQuestion(q)
              if (sanitized) {
                const sseData = `data: ${JSON.stringify(sanitized)}\n\n`
                controller.enqueue(encoder.encode(sseData))
              }
            }
          }
        } catch {
          // Buffer was already fully consumed or can't be parsed
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

/**
 * Incrementally extract complete JSON objects from a streaming buffer.
 * Tracks brace depth to find where each top-level object ends.
 */
function tryExtractQuestions(buffer: string): {
  extracted: unknown[]
  remaining: string
} {
  const extracted: unknown[] = []
  let remaining = buffer

  // Find the start of the JSON array
  const arrayStart = remaining.indexOf('[')
  if (arrayStart === -1) return { extracted: [], remaining }

  // Skip past the opening bracket
  let searchFrom = arrayStart + 1

  while (searchFrom < remaining.length) {
    // Find the next opening brace of a question object
    const objStart = remaining.indexOf('{', searchFrom)
    if (objStart === -1) break

    // Track brace depth to find matching close
    let depth = 0
    let inString = false
    let escape = false
    let objEnd = -1

    for (let i = objStart; i < remaining.length; i++) {
      const ch = remaining[i]

      if (escape) {
        escape = false
        continue
      }

      if (ch === '\\') {
        escape = true
        continue
      }

      if (ch === '"') {
        inString = !inString
        continue
      }

      if (inString) continue

      if (ch === '{') depth++
      if (ch === '}') {
        depth--
        if (depth === 0) {
          objEnd = i
          break
        }
      }
    }

    if (objEnd === -1) break // Incomplete object, wait for more data

    const objStr = remaining.slice(objStart, objEnd + 1)
    try {
      const parsed = JSON.parse(objStr)
      extracted.push(parsed)
      searchFrom = objEnd + 1
      // Update remaining to everything after this object
      remaining = remaining.slice(0, arrayStart + 1) + remaining.slice(objEnd + 1)
      searchFrom = arrayStart + 1
    } catch {
      // Malformed — skip past this brace and try next
      searchFrom = objStart + 1
    }
  }

  return { extracted, remaining }
}
