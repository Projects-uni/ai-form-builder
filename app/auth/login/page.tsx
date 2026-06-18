'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n/client'
import LanguageToggle from '@/app/components/LanguageToggle'
import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { Input } from '@/app/components/ui/Input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { t } = useTranslation()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="flex min-h-screen bg-white font-sans">
      {/* Left side: branding/image area (desktop only) */}
      <div className="hidden w-1/2 flex-col justify-between bg-slate-50 p-16 lg:flex border-r-2 border-slate-200">
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-4 w-fit">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-black text-white">
              <Sparkles size={28} strokeWidth={3} />
            </div>
            <span className="text-3xl font-black tracking-tight text-slate-900">FormBuilder</span>
          </Link>
        </div>

        <div className="relative z-10 mt-auto mb-32">
          <blockquote className="space-y-6 max-w-xl">
            <p className="text-5xl font-bold leading-tight text-slate-900">
              The fastest way to build forms that convert.
            </p>
            <p className="text-2xl text-slate-500 font-medium leading-relaxed">
              Stop fighting with clunky interfaces. AI FormBuilder is designed for speed, beauty, and massive scale.
            </p>
          </blockquote>
        </div>
      </div>

      {/* Right side: login form */}
      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 xl:px-32">
        <div className="absolute right-8 top-8">
          <LanguageToggle />
        </div>
        
        <div className="mx-auto w-full max-w-md">
          <div className="mb-12 lg:hidden">
            <Link href="/" className="flex items-center gap-4 w-fit">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-black text-white">
                <Sparkles size={24} strokeWidth={3} />
              </div>
              <span className="text-2xl font-black tracking-tight text-slate-900">FormBuilder</span>
            </Link>
          </div>

          <div className="mb-12">
            <h1 className="text-4xl font-black tracking-tight text-slate-900">{t.auth.signInTitle}</h1>
            <p className="mt-4 text-lg font-medium text-slate-500">
              Welcome back. Enter your details to access your workspace.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <Input
              label={t.auth.email}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            
            <Input
              label={t.auth.password}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />

            {error && (
              <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-base font-bold text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full mt-4"
              size="xl"
              isLoading={loading}
              rightIcon={<ArrowRight size={24} strokeWidth={3} />}
            >
              {loading ? t.auth.signingInBtn : t.auth.signInBtn}
            </Button>
          </form>

          <p className="mt-12 text-center text-lg font-medium text-slate-500">
            {t.auth.noAccount}{' '}
            <Link href="/auth/register" className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
              {t.auth.registerLink}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}