import { cookies } from 'next/headers'
import { getDictionary, defaultLocale } from './translations'

export async function getServerTranslations() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value || defaultLocale
  return { t: getDictionary(locale), locale }
}
