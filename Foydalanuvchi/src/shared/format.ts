import type { OrderStatus, PaymentPhase, PaymentTerm } from './types'

export function formatPrice(value: number) {
  return new Intl.NumberFormat('uz-UZ').format(value) + ' so‘m'
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('uz-UZ').format(value)
}

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
  qabul_qilindi: 'bg-indigo-50 text-indigo-700',
  logistikaga_uzatildi: 'bg-amber-50 text-amber-700',
  yolda: 'bg-orange-50 text-orange-700',
  yetkazildi_tolov_kutilmoqda: 'bg-purple-50 text-purple-700',
  yakunlandi: 'bg-emerald-50 text-emerald-700',
  fors_major: 'bg-red-50 text-red-600',
  kafolat_bilan_yopildi: 'bg-slate-100 text-slate-600',
}

export const paymentPhaseLabel: Record<PaymentPhase, string> = {
  none: 'To‘lov fazasi yo‘q',
  awaiting_advance: 'Avans kutilmoqda',
  awaiting_final: 'Yakuniy to‘lov kutilmoqda',
  completed: 'To‘lov yakunlandi',
}

export const paymentPhaseStyle: Record<PaymentPhase, string> = {
  none: 'bg-slate-100 text-slate-500',
  awaiting_advance: 'bg-orange-50 text-orange-700',
  awaiting_final: 'bg-purple-50 text-purple-700',
  completed: 'bg-emerald-50 text-emerald-700',
}

export const orderStatusDotStyle: Record<OrderStatus, string> = {
  yangi: 'bg-blue-500',
  qabul_qilindi: 'bg-indigo-500',
  logistikaga_uzatildi: 'bg-amber-500',
  yolda: 'bg-orange-500',
  yetkazildi_tolov_kutilmoqda: 'bg-purple-500',
  yakunlandi: 'bg-emerald-500',
  fors_major: 'bg-red-500',
  kafolat_bilan_yopildi: 'bg-slate-400',
}

export const paymentTermLabel: Record<PaymentTerm, string> = {
  prepay_100: '100% oldindan',
  deferred: 'Muddatli',
  pod_zakaz_50_50: 'Pod zakaz 50/50',
}

export function paymentTermFull(term: PaymentTerm, days: number) {
  if (term === 'deferred') return `Muddatli (${days} kun)`
  return paymentTermLabel[term]
}

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'yangi',
  'qabul_qilindi',
  'logistikaga_uzatildi',
  'yolda',
  'yetkazildi_tolov_kutilmoqda',
  'yakunlandi',
]
