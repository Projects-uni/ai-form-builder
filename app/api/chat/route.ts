import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import Groq from 'groq-sdk'
import { getVisibleQuestions, normalizeFormSchema, normalizeLogicGraph } from '@/lib/forms/logic'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(request: Request) {
  try {
    const { formId, messages, currentAnswers = {} } = await request.json()

    if (!formId || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Missing formId or messages' }, { status: 400 })
    }

    // 1. Fetch form
    const { data: form, error } = await supabaseAdmin
      .from('forms')
      .select('title, description, schema, logic_graph')
      .eq('id', formId)
      .single()

    if (error || !form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    // 2. Parse schema and logic
    const schema = normalizeFormSchema(form.schema)
    const logicGraph = normalizeLogicGraph(form.logic_graph, schema)
    const visibleQuestions = getVisibleQuestions(schema, logicGraph, currentAnswers)

    // 3. Find missing required questions
    const missingQuestions = visibleQuestions.filter(q => q.required && !currentAnswers[q.id]?.trim())
    const allAnswered = missingQuestions.length === 0

    // 4. Build tools for function calling
    const saveAnswersTool = {
      type: 'function' as const,
      function: {
        name: 'save_answers',
        description: 'Save the user\'s answers to the form questions. Call this immediately when the user provides an answer.',
        parameters: {
          type: 'object',
          properties: Object.fromEntries(
            visibleQuestions.map(q => [
              q.id,
              { 
                type: 'string', 
                description: `Question: ${q.label}. Type: ${q.type}. Current answer: ${currentAnswers[q.id] || 'none'}` 
              }
            ])
          ),
        },
      },
    }

    // 5. Construct System Prompt
    let systemPrompt = `You are a friendly, helpful AI assistant helping a user fill out a form titled "${form.title}".\n`
    if (form.description) systemPrompt += `Description: ${form.description}\n`
    
    if (allAnswered) {
      systemPrompt += `\nAll required questions have been answered! Tell the user they are done and they can click the Submit button to finalize.`
    } else {
      systemPrompt += `\nThe user still needs to answer the following questions:\n`
      missingQuestions.forEach(q => {
        systemPrompt += `- ${q.label} (ID: ${q.id})\n`
      })
      systemPrompt += `\nAsk the user for this information conversationally. Do NOT ask for everything at once. Pick 1 or 2 questions to ask next.`
    }
    
    systemPrompt += `\nCRITICAL RULE: If the user provides an answer in their message, you MUST call the "save_answers" tool to extract and save it.`

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content }))
    ]

    // 6. Call Groq
    const completion = await groq.chat.completions.create({
      messages: apiMessages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      tools: [saveAnswersTool],
      tool_choice: 'auto',
    })

    const responseMessage = completion.choices[0]?.message

    // 7. Handle Tool Call
    if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
      let updatedAnswers = { ...currentAnswers }
      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.function.name === 'save_answers') {
          try {
            const extracted = JSON.parse(toolCall.function.arguments)
            updatedAnswers = { ...updatedAnswers, ...extracted }
            apiMessages.push(responseMessage as any)
            apiMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: 'save_answers',
              content: JSON.stringify({ success: true, savedAnswers: extracted })
            } as any)
          } catch (e) {
            console.error('Failed to parse tool arguments', e)
          }
        }
      }

      // Re-evaluate missing questions
      const newMissingQuestions = visibleQuestions.filter(q => q.required && !updatedAnswers[q.id]?.trim())
      const newAllAnswered = newMissingQuestions.length === 0
      
      apiMessages.push({
        role: 'system',
        content: newAllAnswered 
          ? 'All required questions are answered. Tell the user they are done and can submit.' 
          : `We still need: ${newMissingQuestions.map(q => q.label).join(', ')}. Ask for them naturally.`
      })

      // Call Groq AGAIN to get the final text response
      const secondCompletion = await groq.chat.completions.create({
        messages: apiMessages,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
      })

      return NextResponse.json({
        type: 'tool_call',
        extractedAnswers: updatedAnswers,
        message: secondCompletion.choices[0]?.message?.content || 'Got it.',
        isComplete: newAllAnswered
      })
    }

    // 8. Normal response
    return NextResponse.json({
      type: 'message',
      message: responseMessage?.content || 'I encountered an error. Please try again.',
      isComplete: allAnswered
    })

  } catch (err) {
    console.error('Chat API Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
