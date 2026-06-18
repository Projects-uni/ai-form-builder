import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import Groq from 'groq-sdk'
import OpenAI from 'openai'
import { triggerWebhooks } from '@/lib/webhooks/trigger'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(request: Request) {
  try {
    const { responseId, formId } = await request.json()

    if (!responseId || !formId) {
      return NextResponse.json({ error: 'Missing responseId or formId' }, { status: 400 })
    }

    // 1. Fetch the response and form schema
    const { data: response, error: responseErr } = await supabaseAdmin
      .from('responses')
      .select('answers, respondent_meta, submitted_at, form_id')
      .eq('id', responseId)
      .single()

    if (responseErr || !response) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 })
    }

    const { data: form, error: formErr } = await supabaseAdmin
      .from('forms')
      .select('schema, workspace_id')
      .eq('id', formId)
      .single()

    if (formErr || !form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    // Fire webhooks asynchronously
    triggerWebhooks(form.workspace_id, {
      event_type: 'new_response',
      form_id: formId,
      workspace_id: form.workspace_id,
      submitted_at: response.submitted_at,
      respondent_meta: response.respondent_meta,
      answers: response.answers,
    }).catch(err => console.error('Webhook trigger error:', err))

    // 2. Identify text questions (short_text, long_text)
    const textQuestionIds = new Set<string>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questions = (form.schema as any).questions || []
    for (const q of questions) {
      if (q.type === 'short_text' || q.type === 'long_text') {
        textQuestionIds.add(q.id)
      }
    }

    // 3. Process each text answer
    const answers = response.answers as Record<string, string>
    const embeddingsToInsert = []

    for (const [questionId, answerText] of Object.entries(answers)) {
      if (!textQuestionIds.has(questionId) || !answerText.trim()) continue

      // a. Get sentiment from Groq
      let sentimentLabel = 'neutral'
      let sentimentScore = 3
      try {
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are an expert sentiment analyzer. Analyze the given text and output a JSON object with two fields: "sentiment_label" (must be "positive", "negative", or "neutral") and "sentiment_score" (an integer from 1 to 5, where 1 is very negative, 3 is neutral, and 5 is very positive). Output ONLY valid JSON.',
            },
            {
              role: 'user',
              content: answerText,
            },
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          max_tokens: 100,
          response_format: { type: 'json_object' },
        })

        const content = chatCompletion.choices[0]?.message?.content
        if (content) {
          const parsed = JSON.parse(content)
          sentimentLabel = parsed.sentiment_label || 'neutral'
          sentimentScore = parsed.sentiment_score || 3
        }
      } catch (err) {
        console.error('Groq sentiment error:', err)
      }

      // b. Get embedding from OpenAI
      let embedding = null
      try {
        const embeddingRes = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: answerText,
          dimensions: 1536,
        })
        embedding = embeddingRes.data[0]?.embedding
      } catch (err) {
        console.error('OpenAI embedding error:', err)
      }

      if (embedding) {
        embeddingsToInsert.push({
          response_id: responseId,
          form_id: formId,
          question_key: questionId,
          embedding, // pgvector format handles normal arrays
          sentiment_score: sentimentScore,
          sentiment_label: sentimentLabel,
        })
      }
    }

    // 4. Insert into the embeddings table
    if (embeddingsToInsert.length > 0) {
      const { error: insertErr } = await supabaseAdmin
        .from('embeddings')
        .insert(embeddingsToInsert)

      if (insertErr) {
        console.error('Error inserting embeddings:', insertErr)
        return NextResponse.json({ error: 'Failed to insert embeddings' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, processed: embeddingsToInsert.length })
  } catch (err) {
    console.error('API Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
