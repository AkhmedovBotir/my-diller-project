const MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
]

function parse(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** "2026-09-22T10:00:00Z" → "22 sentabr 2026". */
export function formatDate(value: string | null | undefined) {
  const date = parse(value)
  if (!date) return '—'
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

/** Sana + vaqt: "22 sentabr 2026, 10:00". */
export function formatDateTime(value: string | null | undefined) {
  const date = parse(value)
  if (!date) return '—'
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  return `${formatDate(value)}, ${time}`
}

/** <input type="date"> uchun: "2000-05-14". */
export function toDateInputValue(value: string | null | undefined) {
  const date = parse(value)
  if (!date) return ''
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
