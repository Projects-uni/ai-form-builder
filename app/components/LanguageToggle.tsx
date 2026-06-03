'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function LanguageToggle() {
  const router = useRouter()
  const [locale, setLocale] = useState('en')

  useEffect(() => {
    const match = document.cookie.match(new RegExp('(^| )NEXT_LOCALE=([^;]+)'))
    if (match) {
      setLocale(match[2])
    }
  }, [])

  const toggleLanguage = () => {
    const newLocale = locale === 'en' ? 'tr' : 'en'
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`
    setLocale(newLocale)
    router.refresh()
  }

  return (
    <button
      onClick={toggleLanguage}
      className="ml-4 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      title={locale === 'en' ? 'Türkçe\'ye Geç' : 'Switch to English'}
    >
      {locale === 'en' ? 'TR' : 'EN'}
    </button>
  )
}
