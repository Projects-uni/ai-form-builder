'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, CheckCircle2, Sparkles } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/client'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  params: Promise<{ formId: string }>
}

export default function ChatFormPage({ params }: Props) {
  const [formId, setFormId] = useState<string | null>(null)
  const [formTitle, setFormTitle] = useState('AI Interview')
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [userEmail, setUserEmail] = useState('')
  const [requireEmail, setRequireEmail] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  
  const supabase = useMemo(() => createClient(), [])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  useEffect(() => {
    params.then(p => setFormId(p.formId))
  }, [params])

  useEffect(() => {
    if (!formId) return
    supabase
      .from('forms')
      .select('title, schema')
      .eq('id', formId)
      .eq('is_published', true)
      .single()
      .then(({ data }) => {
        if (data) {
          setFormTitle(data.title)
          if (data.schema?.settings?.requireEmail) {
            setRequireEmail(true)
          }
        }
        // Start the conversation
        sendMessage([{ role: 'user', content: 'Hi, I am ready to start the form.' }], {})
      })
  }, [formId, supabase])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function sendMessage(currentMessages: Message[], currentAnswers: Record<string, string>) {
    setIsLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId,
          messages: currentMessages,
          currentAnswers
        })
      })
      const data = await res.json()

      if (data.type === 'tool_call') {
        const updatedAnswers = { ...currentAnswers, ...data.extractedAnswers }
        setAnswers(updatedAnswers)
        
        if (data.message) {
          setMessages([...currentMessages, { role: 'assistant', content: data.message }])
        }
        if (data.isComplete) {
          setIsComplete(true)
        }
        setIsLoading(false)
      } else if (data.type === 'message') {
        setMessages([...currentMessages, { role: 'assistant', content: data.message }])
        if (data.isComplete) {
          setIsComplete(true)
        }
        setIsLoading(false)
      }
    } catch (err) {
      console.error(err)
      setIsLoading(false)
    }
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return
    
    const userMsg: Message = { role: 'user', content: inputValue.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInputValue('')
    
    sendMessage(newMessages, answers)
  }

  async function handleSubmitForm() {
    if (!formId || isSubmitting) return
    if (requireEmail) {
      if (!userEmail || !/^\S+@\S+\.\S+$/.test(userEmail)) {
        alert('Please enter a valid email address.')
        return
      }
    }
    setIsSubmitting(true)

    const { data: response, error } = await supabase
      .from('responses')
      .insert({
        form_id: formId,
        answers,
        respondent_meta: {
          ...(requireEmail ? { email: userEmail.trim().toLowerCase() } : {}),
          user_agent: navigator.userAgent,
          submitted_at: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505' || error.message.includes('unique constraint')) {
        alert('A user with this email has already submitted this form.')
      } else {
        alert('Error submitting form: ' + error.message)
      }
      setIsSubmitting(false)
      return
    }

    // Trigger AI background processing
    fetch('/api/responses/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responseId: response.id, formId })
    }).catch(console.error)

    setIsSubmitting(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f6f7f9] px-4 py-12">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-6">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t.publicForm.thankYou || 'Thank You!'}</h2>
        <p className="text-slate-500 max-w-md text-center">{t.publicForm.recorded || 'Your responses have been successfully recorded.'}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f7f9]">
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <Sparkles size={16} />
        </div>
        <h1 className="text-lg font-semibold text-slate-900 truncate">{formTitle}</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32">
        <div className="mx-auto max-w-2xl flex flex-col gap-4">
          {messages.filter(m => !m.content.startsWith('(System:')).map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] ${
                m.role === 'user' 
                  ? 'bg-slate-950 text-white rounded-br-none' 
                  : 'bg-white border border-slate-200 text-slate-800 shadow-sm rounded-bl-none'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 text-slate-500 shadow-sm rounded-2xl rounded-bl-none px-4 py-3 text-sm flex gap-1">
                <span className="animate-bounce">.</span><span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span><span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
        <div className="mx-auto max-w-2xl">
          {isComplete ? (
            <div className="flex flex-col gap-3">
              {requireEmail && (
                <input
                  type="email"
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                  placeholder="Enter your email to submit..."
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 px-4 text-[15px] shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              )}
              <button
                onClick={handleSubmitForm}
                disabled={isSubmitting || (requireEmail && !userEmail)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-base font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Answers'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Type your answer..."
                disabled={isLoading}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-4 pr-12 text-[15px] shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-2 flex size-8 items-center justify-center rounded-lg bg-slate-950 text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                <Send size={14} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
