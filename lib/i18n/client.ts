'use client'

import { useState, useEffect } from 'react';
import { getDictionary, defaultLocale, type Locale } from './translations';

export function useTranslation() {
  const [locale, setLocale] = useState(defaultLocale);
  
  useEffect(() => {
    const match = document.cookie.match(new RegExp('(^| )NEXT_LOCALE=([^;]+)'));
    if (match) {
      setLocale(match[2] as Locale);
    }
  }, []);

  return { t: getDictionary(locale), locale };
}
