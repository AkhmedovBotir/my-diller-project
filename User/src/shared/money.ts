import { API_URL } from './config'

/** Raqamni mingliklar bo'yicha probel bilan ajratadi: 1000 → "1 000". */
export function formatNumber(value: number | string | null | undefined) {
  const n = Math.round(Number(value) || 0)
  const negative = n < 0
  const digits = Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${negative ? '-' : ''}${digits}`
}

/** Narx formati: 1000 → "1 000 so‘m". */
export function formatMoney(value: number | string | null | undefined) {
  return `${formatNumber(value)} so‘m`
}

/** Rasm manzili nisbiy bo'lsa backend manzili bilan to'ldiriladi. */
export function resolveImage(url: string | null | undefined) {
  const raw = (url ?? '').trim()
  if (!raw) return ''
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:')) return raw
  const origin = API_URL.replace(/\/api\/v1\/?$/, '')
  return `${origin}${raw.startsWith('/') ? '' : '/'}${raw}`
}

/** Yig'im to'planish foizi (0–100). */
export function progressPercent(current: number, min: number) {
  if (!min || min <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((current / min) * 100)))
}
