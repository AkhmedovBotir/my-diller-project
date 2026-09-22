import type { QuillDelta } from './types'

function parseDelta(description: QuillDelta | string | null | undefined): QuillDelta | null {
  if (!description) return null
  if (typeof description === 'string') {
    try {
      const parsed = JSON.parse(description) as QuillDelta
      return parsed?.ops ? parsed : { ops: [{ insert: `${description}\n` }] }
    } catch {
      return { ops: [{ insert: `${description}\n` }] }
    }
  }
  return description.ops ? description : null
}

export function deltaToPlainText(description: QuillDelta | string | null | undefined) {
  const delta = parseDelta(description)
  if (!delta) return ''
  return (delta.ops ?? [])
    .map((op) => (typeof op.insert === 'string' ? op.insert : ''))
    .join('')
    .replace(/\n+$/, '')
}

export function plainTextToDelta(text: string): QuillDelta {
  const normalized = text.endsWith('\n') ? text : `${text}\n`
  return { ops: [{ insert: normalized }] }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function applyInline(text: string, attributes?: Record<string, unknown>) {
  let html = escapeHtml(text)
  if (!attributes) return html
  if (attributes.bold) html = `<strong>${html}</strong>`
  if (attributes.italic) html = `<em>${html}</em>`
  if (attributes.underline) html = `<u>${html}</u>`
  if (attributes.strike) html = `<s>${html}</s>`
  if (typeof attributes.link === 'string') {
    html = `<a href="${escapeHtml(attributes.link)}" target="_blank" rel="noreferrer" class="text-[#397461] underline">${html}</a>`
  }
  if (typeof attributes.color === 'string') {
    html = `<span style="color:${escapeHtml(attributes.color)}">${html}</span>`
  }
  return html
}

/** Quill Delta → xavfsiz HTML (paragraph, list, formatting). */
export function deltaToHtml(description: QuillDelta | string | null | undefined) {
  const delta = parseDelta(description)
  if (!delta?.ops?.length) return ''

  let html = ''
  let listType: 'ol' | 'ul' | null = null
  let paragraph = ''

  const closeList = () => {
    if (listType) {
      html += listType === 'ol' ? '</ol>' : '</ul>'
      listType = null
    }
  }

  const flushParagraph = (asList?: 'ordered' | 'bullet') => {
    const content = paragraph.trimEnd()
    paragraph = ''
    if (!content && !asList) {
      html += '<p><br/></p>'
      return
    }

    if (asList) {
      const nextType = asList === 'ordered' ? 'ol' : 'ul'
      if (listType !== nextType) {
        closeList()
        html += nextType === 'ol' ? '<ol>' : '<ul>'
        listType = nextType
      }
      html += `<li>${content || '<br/>'}</li>`
      return
    }

    closeList()
    html += `<p>${content || '<br/>'}</p>`
  }

  for (const op of delta.ops) {
    if (typeof op.insert !== 'string') {
      if (op.insert && typeof op.insert === 'object') {
        paragraph += ' '
      }
      continue
    }

    const chunks = op.insert.split('\n')
    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index]
      if (chunk) paragraph += applyInline(chunk, op.attributes)

      const isLineBreak = index < chunks.length - 1
      if (!isLineBreak) continue

      const list = op.attributes?.list
      if (list === 'ordered' || list === 'bullet') {
        flushParagraph(list)
      } else {
        flushParagraph()
      }
    }
  }

  if (paragraph) flushParagraph()
  closeList()
  return html
}

export function formatPrice(value: number) {
  const n = Math.round(Number(value) || 0)
  const neg = n < 0
  const digits = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return (neg ? '-' : '') + digits + ' so‘m'
}
