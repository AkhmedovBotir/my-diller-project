import type { QuillDelta } from './types'

function normalizeDelta(value: QuillDelta | string | null | undefined): QuillDelta {
  if (!value) return { ops: [] }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as QuillDelta
      if (parsed && Array.isArray(parsed.ops)) return parsed
    } catch {
      return { ops: [{ insert: value }] }
    }
    return { ops: [] }
  }

  if (!Array.isArray(value.ops)) return { ops: [] }
  return value
}

export function isDeltaEmpty(value: QuillDelta | string | null | undefined) {
  const delta = normalizeDelta(value)
  const text = (delta.ops ?? [])
    .map((op) => (typeof op.insert === 'string' ? op.insert : ''))
    .join('')
    .replace(/\n/g, '')
    .trim()
  return text.length === 0
}

export function deltaToPlainText(value: QuillDelta | string | null | undefined) {
  const delta = normalizeDelta(value)
  return (delta.ops ?? [])
    .map((op) => (typeof op.insert === 'string' ? op.insert : ''))
    .join('')
    .replace(/\n+$/, '')
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function deltaToHtml(value: QuillDelta | string | null | undefined) {
  const delta = normalizeDelta(value)
  const ops = delta.ops ?? []
  let html = ''
  let buffer = ''

  const flushParagraph = () => {
    html += `<p>${buffer || '<br/>'}</p>`
    buffer = ''
  }

  for (const op of ops) {
    if (typeof op.insert !== 'string') continue
    const attrs = op.attributes ?? {}
    const parts = op.insert.split('\n')
    parts.forEach((part, index) => {
      if (part) {
        let text = escapeHtml(part)
        if (attrs.bold) text = `<strong>${text}</strong>`
        if (attrs.italic) text = `<em>${text}</em>`
        if (attrs.underline) text = `<u>${text}</u>`
        buffer += text
      }
      if (index < parts.length - 1) flushParagraph()
    })
  }
  if (buffer) flushParagraph()

  return html
}
