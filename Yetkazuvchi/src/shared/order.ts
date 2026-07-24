import type { Order, OrderStatus } from './types'

export const orderStatusLabels: Record<OrderStatus, string> = {
  yangi: 'Yangi',
  qabul_qilindi: 'Qabul qilindi',
  logistikaga_uzatildi: 'Olib ketishga tayyor',
  yolda: "Yo'lda",
  yetkazildi_tolov_kutilmoqda: "Yetkazildi, to'lov kutilmoqda",
  yakunlandi: 'Yakunlandi',
  fors_major: 'Fors-major',
  kafolat_bilan_yopildi: 'Kafolat bilan yopildi',
}

export const orderStatusTones: Record<OrderStatus, string> = {
  yangi: 'bg-slate-100 text-slate-600',
  qabul_qilindi: 'bg-blue-50 text-blue-600',
  logistikaga_uzatildi: 'bg-orange-50 text-orange-600',
  yolda: 'bg-[#eff8f3] text-[#397461]',
  yetkazildi_tolov_kutilmoqda: 'bg-amber-50 text-amber-600',
  yakunlandi: 'bg-[#efffcf] text-[#4d7c0f]',
  fors_major: 'bg-red-50 text-red-600',
  kafolat_bilan_yopildi: 'bg-purple-50 text-purple-600',
}

export function needsPickup(order: Order) {
  return order.status === 'logistikaga_uzatildi' && !order.picked_up_at
}

export function needsDelivery(order: Order) {
  return Boolean(order.picked_up_at) && !order.delivered_at
}

export function deliveryStage(order: Order): 'pickup' | 'transit' | 'done' {
  if (needsPickup(order)) return 'pickup'
  if (needsDelivery(order)) return 'transit'
  return 'done'
}

export function formatMoney(value: number) {
  return `${new Intl.NumberFormat('uz-UZ').format(Math.round(value))} so'm`
}
