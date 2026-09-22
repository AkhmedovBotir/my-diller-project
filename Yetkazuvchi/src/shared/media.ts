import { API_URL } from './config'

/** Rasm manzili nisbiy bo'lsa backend manzili bilan to'ldiriladi. */
export function resolveImage(url: string | null | undefined) {
  const raw = (url ?? '').trim()
  if (!raw) return ''
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:')) return raw
  const origin = API_URL.replace(/\/api\/v1\/?$/, '')
  return `${origin}${raw.startsWith('/') ? '' : '/'}${raw}`
}
