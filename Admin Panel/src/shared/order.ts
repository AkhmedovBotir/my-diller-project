import type { CommissionStatus, OrderStatus, PaymentTerm } from './types'

export const orderStatusLabel: Record<OrderStatus, string> = {
  yangi: 'Yangi',
  qabul_qilindi: 'Qabul qilindi',
  logistikaga_uzatildi: 'Logistikaga uzatildi',
  yolda: 'Yo‘lda',
  yetkazildi_tolov_kutilmoqda: 'Yetkazildi, to‘lov kutilmoqda',
  yakunlandi: 'Yakunlandi',
  fors_major: 'Fors-major',
  kafolat_bilan_yopildi: 'Kafolat bilan yopildi',
}

export const orderStatusStyle: Record<OrderStatus, string> = {
  yangi: 'bg-blue-50 text-blue-700',
  qabul_qilindi: 'bg-amber-50 text-amber-700',
  logistikaga_uzatildi: 'bg-indigo-50 text-indigo-700',
  yolda: 'bg-purple-50 text-purple-700',
  yetkazildi_tolov_kutilmoqda: 'bg-orange-50 text-orange-700',
  yakunlandi: 'bg-emerald-50 text-emerald-700',
  fors_major: 'bg-red-50 text-red-600',
  kafolat_bilan_yopildi: 'bg-slate-100 text-slate-600',
}

export const commissionStatusLabel: Record<CommissionStatus, string> = {
  pending: 'Kutilmoqda',
  submitted: 'Tekshirilmoqda',
  paid: 'To‘langan',
  waived: 'Bekor qilingan (promo)',
}

export const commissionStatusStyle: Record<CommissionStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  submitted: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
  waived: 'bg-slate-100 text-slate-500',
}

export const paymentTermLabel: Record<PaymentTerm, string> = {
  prepay_100: '100% oldindan to‘lov',
  deferred: 'Muddatli to‘lov (nasiya)',
  pod_zakaz_50_50: 'Buyurtma asosida 50/50',
}

/** 1000000 → "1 000 000" */
export function formatGroupedNumber(value: number) {
  const n = Math.round(Number(value) || 0)
  const neg = n < 0
  const digits = Math.abs(n).toString()
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return (neg ? '-' : '') + grouped
}

export function formatMoney(value: number) {
  return formatGroupedNumber(value) + ' so‘m'
}

/** Input uchun: "1 000 000" */
export function formatMoneyInput(raw: string) {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function parseMoneyInput(raw: string) {
  return Number(raw.replace(/\s/g, '').replace(/[^\d]/g, '')) || 0
}
