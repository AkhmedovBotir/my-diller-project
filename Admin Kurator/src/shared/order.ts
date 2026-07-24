import type { Order, OrderStatus, PaymentTerm } from './types'

export function formatPrice(value: number) {
  return new Intl.NumberFormat('uz-UZ').format(value) + ' so‘m'
}

export const ORDER_STATUSES: OrderStatus[] = [
  'yangi',
  'qabul_qilindi',
  'logistikaga_uzatildi',
  'yolda',
  'yetkazildi_tolov_kutilmoqda',
  'yakunlandi',
  'fors_major',
  'kafolat_bilan_yopildi',
]

export const orderStatusLabel: Record<OrderStatus, string> = {
  yangi: 'Yangi',
  qabul_qilindi: 'Qabul qilindi',
  logistikaga_uzatildi: 'Logistikaga uzatildi',
  yolda: 'Yo‘lda',
  yetkazildi_tolov_kutilmoqda: 'Yetkazildi (to‘lov kutilmoqda)',
  yakunlandi: 'Yakunlandi',
  fors_major: 'Fors-major',
  kafolat_bilan_yopildi: 'Kafolat bilan yopildi',
}

export const orderStatusStyle: Record<OrderStatus, string> = {
  yangi: 'bg-slate-100 text-slate-600',
  qabul_qilindi: 'bg-blue-50 text-blue-700',
  logistikaga_uzatildi: 'bg-indigo-50 text-indigo-700',
  yolda: 'bg-amber-50 text-amber-700',
  yetkazildi_tolov_kutilmoqda: 'bg-orange-50 text-orange-700',
  yakunlandi: 'bg-emerald-50 text-emerald-700',
  fors_major: 'bg-red-50 text-red-600',
  kafolat_bilan_yopildi: 'bg-purple-50 text-purple-700',
}

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'yangi',
  'qabul_qilindi',
  'logistikaga_uzatildi',
  'yolda',
  'yetkazildi_tolov_kutilmoqda',
]

export const paymentTermLabel: Record<PaymentTerm, string> = {
  prepay_100: '100% oldindan to‘lov',
  deferred: 'Muddatli to‘lov',
  pod_zakaz_50_50: 'Buyurtma asosida 50/50',
}

export function isForceMajeureEligible(order: Order) {
  if (order.status !== 'yetkazildi_tolov_kutilmoqda') return false
  if (order.paid_at) return false
  if (!order.payment_deadline_at) return false
  return new Date(order.payment_deadline_at).getTime() < Date.now()
}

export interface TimelineStep {
  key: string
  label: string
  at: string | null | undefined
  done: boolean
}

export function buildTimeline(order: Order): TimelineStep[] {
  const steps: TimelineStep[] = [
    { key: 'created', label: 'Buyurtma yaratildi', at: order.created_at, done: true },
    { key: 'accepted', label: 'Ishlab chiqaruvchi qabul qildi', at: order.accepted_at, done: Boolean(order.accepted_at) },
    { key: 'ready', label: 'Jo‘natishga tayyor', at: order.ready_at, done: Boolean(order.ready_at) },
    { key: 'picked_up', label: 'Dostavka yukni oldi', at: order.picked_up_at, done: Boolean(order.picked_up_at) },
    { key: 'shipped', label: 'Yo‘lga chiqdi', at: order.shipped_at, done: Boolean(order.shipped_at) },
    { key: 'delivered', label: 'Yetkazib berildi', at: order.delivered_at, done: Boolean(order.delivered_at) },
    { key: 'buyer_received', label: 'Xaridor qabul qildi', at: order.buyer_received_at, done: Boolean(order.buyer_received_at) },
    { key: 'paid', label: 'To‘lov amalga oshirildi', at: order.paid_at, done: Boolean(order.paid_at) },
  ]

  if (order.force_majeure_at) {
    steps.push({ key: 'force_majeure', label: 'Fors-major belgilandi', at: order.force_majeure_at, done: true })
  }
  if (order.guarantee_paid_at) {
    steps.push({ key: 'guarantee', label: 'Kafolat to‘lovi amalga oshirildi', at: order.guarantee_paid_at, done: true })
  }

  return steps
}
