'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Globe } from 'lucide-react'

export default function LanguageToggle() {
  const router = useRouter()
  const [locale, setLocale] = useState('en')

  useEffect(() => {
    const match = document.cookie.match(new RegExp('(^| )NEXT_LOCALE=([^;]+)'))
    if (match) {
      setLocale(match[2])
    }
  }, [])

  const setLang = (newLocale: string) => {
    if (newLocale === locale) return
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`
    setLocale(newLocale)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 shadow-inner border border-slate-200">
      <div className="flex items-center justify-center pl-2 pr-1 text-slate-400">
        <Globe size={18} strokeWidth={2.5} />
      </div>
      <button
        onClick={() => setLang('en')}
        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
          locale === 'en' 
            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' 
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLang('tr')}
        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
          locale === 'tr' 
            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' 
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
        }`}
      >
        TR
      </button>
    </div>
  )
}
