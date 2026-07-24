const pad = (value: number) => String(value).padStart(2, '0')

function parseDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: string | Date) {
  const date = parseDate(value)
  if (!date) return '—'
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`
}

export function formatDateTime(value: string | Date) {
  const date = parseDate(value)
  if (!date) return '—'
  return `${formatDate(date)}, ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatLongDate(value: string | Date) {
  const date = parseDate(value)
  if (!date) return '—'

  const weekdays = [
    'Yakshanba',
    'Dushanba',
    'Seshanba',
    'Chorshanba',
    'Payshanba',
    'Juma',
    'Shanba',
  ]
  const months = [
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

  return `${weekdays[date.getDay()]}, ${date.getDate()}-${months[date.getMonth()]}`
}
