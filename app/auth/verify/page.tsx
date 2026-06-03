'use client'

import { useTranslation } from '@/lib/i18n/client'
import LanguageToggle from '@/app/components/LanguageToggle'

export default function VerifyPage() {
  const { t } = useTranslation()

  return (
    <div style={{ maxWidth: 460, margin: '100px auto', padding: '0 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <LanguageToggle />
      </div>
      
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>✉️</p>
        <h1 style={{ marginBottom: 16, fontSize: 28, fontWeight: 700, color: '#111827' }}>
          {t.auth.verifyTitle}
        </h1>
        <p style={{ fontSize: 16, color: '#4b5563', lineHeight: 1.6 }}>
          {t.auth.verifyDesc}
        </p>
      </div>
    </div>
  )
}