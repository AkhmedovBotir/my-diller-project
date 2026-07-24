import type { CommissionStatus, OrderStatus, PaymentPhase } from './types'

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
  paid: 'To‘langan',
  waived: 'Bekor qilingan (promo)',
}

export const commissionStatusStyle: Record<CommissionStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  paid: 'bg-emerald-50 text-emerald-700',
  waived: 'bg-slate-100 text-slate-500',
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

export function formatMoney(value: number) {
  return new Intl.NumberFormat('uz-UZ').format(value) + ' so‘m'
}
