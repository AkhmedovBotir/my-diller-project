import type { PaymentTerm, ProductStatus, QuillDelta } from './types'

export function normalizeDelta(description: QuillDelta | string | null | undefined): QuillDelta {
  if (!description) return { ops: [{ insert: '\n' }] }

  if (typeof description === 'string') {
    try {
      const parsed = JSON.parse(description) as QuillDelta
      if (parsed && Array.isArray(parsed.ops)) {
        return parsed.ops.length ? parsed : { ops: [{ insert: '\n' }] }
      }
    } catch {
      return plainTextToDelta(description)
    }
    return plainTextToDelta(description)
  }

  if (!Array.isArray(description.ops) || description.ops.length === 0) {
    return { ops: [{ insert: '\n' }] }
  }
  return description
}

export function isDeltaEmpty(description: QuillDelta | string | null | undefined) {
  const delta = normalizeDelta(description)
  const text = (delta.ops ?? [])
    .map((op) => (typeof op.insert === 'string' ? op.insert : ''))
    .join('')
    .replace(/\n/g, '')
    .trim()
  return text.length === 0
}

export function deltaToPlainText(description: QuillDelta | string | null | undefined) {
  if (!description) return ''
  const delta = normalizeDelta(description)
  return extractOps(delta)
}

export function plainTextToDelta(text: string): QuillDelta {
  const normalized = text.endsWith('\n') ? text : `${text}\n`
  return { ops: [{ insert: normalized }] }
}

function extractOps(delta: QuillDelta) {
  return (delta.ops ?? [])
    .map((op) => (typeof op.insert === 'string' ? op.insert : ''))
    .join('')
    .replace(/\n+$/, '')
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat('uz-UZ').format(value) + ' so‘m'
}

export const productStatusLabel: Record<ProductStatus, string> = {
  pending: 'Kutilmoqda',
  approved: 'Tasdiqlangan',
  rejected: 'Bekor qilingan',
}

export const productStatusStyle: Record<ProductStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-600',
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_IMAGES = 5

export const paymentTermLabel: Record<PaymentTerm, string> = {
  prepay_100: '100% oldindan to‘lov',
  deferred: 'Muddatli to‘lov (nasiya)',
  pod_zakaz_50_50: 'Buyurtma asosida 50/50',
}

export const SPEC_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'size', label: 'O‘lcham' },
]
