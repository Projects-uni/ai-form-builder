'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n/client'
import LanguageToggle from '@/app/components/LanguageToggle'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { t } = useTranslation()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/auth/verify')
    }
  }

  return (
    <div style={{ maxWidth: 460, margin: '100px auto', padding: '0 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <LanguageToggle />
      </div>
      
      <h1 style={{ marginBottom: 32, fontSize: 28, fontWeight: 700, color: '#111827' }}>
        {t.auth.registerTitle}
      </h1>
      
      <form onSubmit={handleRegister}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#374151' }}>
            {t.auth.email}
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ 
              width: '100%', padding: '12px 16px', fontSize: 16, 
              boxSizing: 'border-box', border: '1px solid #d1d5db', 
              borderRadius: 8, outline: 'none'
            }}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#374151' }}>
            {t.auth.passwordRegister}
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ 
              width: '100%', padding: '12px 16px', fontSize: 16, 
              boxSizing: 'border-box', border: '1px solid #d1d5db', 
              borderRadius: 8, outline: 'none'
            }}
          />
        </div>
        
        {error && <p style={{ color: '#ef4444', fontSize: 14, marginBottom: 16 }}>{error}</p>}
        
        <button
          type="submit"
          disabled={loading}
          style={{ 
            width: '100%', padding: '12px 16px', background: '#0f172a', 
            color: '#fff', border: 'none', borderRadius: 8, 
            fontSize: 16, fontWeight: 500, cursor: 'pointer',
            transition: 'background 0.2s'
          }}
        >
          {loading ? t.auth.registeringBtn : t.auth.registerBtn}
        </button>
      </form>
      
      <p style={{ marginTop: 24, fontSize: 15, textAlign: 'center', color: '#4b5563' }}>
        {t.auth.haveAccount} <a href="/auth/login" style={{ color: '#4f46e5', fontWeight: 500, textDecoration: 'none' }}>{t.auth.signInLink}</a>
      </p>
    </div>
  )
}