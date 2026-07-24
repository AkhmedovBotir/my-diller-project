export interface Dostavka {
  id: number
  company_name: string
  first_name: string
  last_name: string
  phone: string
  username: string
  created_at: string
  updated_at: string
}

export interface DostavkaInput {
  company_name: string
  first_name: string
  last_name: string
  phone: string
  username: string
  password?: string
}

export interface LoginResponse {
  token: string
  dostavka: Dostavka
}

export type OrderStatus =
  | 'yangi'
  | 'qabul_qilindi'
  | 'logistikaga_uzatildi'
  | 'yolda'
  | 'yetkazildi_tolov_kutilmoqda'
  | 'yakunlandi'
  | 'fors_major'
  | 'kafolat_bilan_yopildi'

export type PaymentTerm = 'prepay_100' | 'deferred' | 'pod_zakaz_50_50'

export type PaymentPhase = 'none' | 'awaiting_advance' | 'awaiting_final' | 'completed'

export interface OrderItem {
  id: number
  buyurtma_id: number
  product_id: number
  product_code: string
  product_name: string
  unit_price: number
  quantity: number
  moq: number
  line_total: number
}

export interface Order {
  id: number
  number: string
  xaridor_id: number
  ishlabchiqaruvchi_id: number
  dostavka_id: number | null
  kurator_id: number | null
  status: OrderStatus
  payment_term: PaymentTerm
  payment_days: number
  total_amount: number
  point_a_address: string
  point_a_lat: number | null
  point_a_lng: number | null
  point_b_address: string
  point_b_lat: number | null
  point_b_lng: number | null
  contract_html: string
  invoice_html: string
  invoice_number: string
  payment_receipt_url: string
  payment_phase?: PaymentPhase | null
  advance_amount?: number | null
  advance_receipt_url?: string | null
  advance_confirmed_at?: string | null
  payment_deadline_at: string | null
  accepted_at: string | null
  ready_at: string | null
  picked_up_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  buyer_received_at: string | null
  paid_at: string | null
  force_majeure_at: string | null
  force_majeure_by: number | null
  guarantee_paid_at: string | null
  guarantee_by: number | null
  created_at: string
  updated_at: string
  items?: OrderItem[]
}

export interface Notification {
  id: number
  recipient_type: string
  recipient_id: number
  title: string
  body: string
  link: string
  is_read: boolean
  created_at: string
}

export interface ApiError {
  code:
    | 'NOTOGRI_SOROV'
    | 'AUTENTIFIKATSIYA_XATOSI'
    | 'RUXSAT_YOQ'
    | 'TOPILMADI'
    | 'TAKRORIY_MALUMOT'
    | 'ICHKI_SERVER_XATOSI'
  message: string
  field?: string
}
