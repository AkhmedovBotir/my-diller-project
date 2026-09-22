export interface KuratorSummary {
  id: number
  first_name: string
  last_name: string
  phone: string
  username?: string
}

export interface Region {
  id: number
  parent_id?: number | null
  name: string
  code: string
  type: 'region' | 'district' | 'mfy'
  status: string
}

export interface Dostavka {
  id: number
  company_name: string
  first_name: string
  last_name: string
  phone: string
  username: string
  city?: string
  mfy?: string
  mfy_id?: number | null
  kurator_id?: number | null
  created_at: string
  updated_at: string
}

export interface ProfileResponse extends Dostavka {
  kurator?: KuratorSummary | null
}

export interface DostavkaInput {
  company_name: string
  first_name: string
  last_name: string
  phone: string
  username: string
  city?: string
  mfy?: string
  mfy_id?: number | null
  password?: string
}

export interface LoginResponse {
  token: string
  dostavka: Dostavka
}

export interface SmsChallenge {
  sms_required: true
  challenge_id: string
  phone_masked: string
  expires_in: number
  resend_after: number
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
    | 'JUDA_KOP_SOROV'
    | 'TASHQI_XIZMAT_XATOSI'
    | 'ICHKI_SERVER_XATOSI'
  message: string
  field?: string
}

export type BirgaOrderStatus =
  | 'collecting'
  | 'awaiting_courier'
  | 'with_courier'
  | 'issued'
  | 'cancelled'

export interface BirgaOrderItem {
  id?: number
  group_buy_id?: number
  product_id: number
  quantity: number
  product_name?: string
  photo_url?: string
}

export interface BirgaOrder {
  id: number
  customer_id: number
  group_buy_id: number
  quantity: number
  unit_price: number
  total_amount: number
  status: BirgaOrderStatus | string
  pickup_code?: string
  courier_id?: number | null
  title_snapshot: string
  photo_snapshot: string
  customer_phone?: string
  customer_name?: string
  region_name?: string
  city_name?: string
  mfy_name?: string
  address?: string
  items?: BirgaOrderItem[]
  created_at: string
  updated_at: string
}
