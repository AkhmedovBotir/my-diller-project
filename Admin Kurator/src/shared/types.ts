export type AdminType = 'general' | 'admin' | 'kurator'

export interface Admin {
  id: number
  first_name: string
  last_name: string
  phone: string
  username: string
  type: AdminType
  created_at: string
  updated_at: string
}

export interface AdminProfileInput {
  first_name: string
  last_name: string
  phone: string
  username: string
  password?: string
}

export interface LoginResponse {
  token: string
  admin: Admin
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

// ---- Ishlab chiqaruvchi (fabrika) ----

export interface Ishlabchiqaruvchi {
  id: number
  company_name: string
  first_name: string
  last_name: string
  phone: string
  username: string
  stir: string
  bank_account: string
  bank_name: string
  mfo: string
  address: string
  lat?: number | null
  lng?: number | null
  kurator_id?: number | null
  created_at: string
  updated_at: string
}

export interface IshlabchiqaruvchiCreateInput {
  company_name: string
  first_name: string
  last_name: string
  phone: string
  username: string
  password: string
  stir?: string
  bank_account?: string
  bank_name?: string
  mfo?: string
  address?: string
}

// ---- Hujjatlar (kurator ko'rinishi) ----

export interface Hujjat {
  order_id: number
  order_number: string
  xaridor_id: number
  ishlabchiqaruvchi_id: number
  status: OrderStatus
  contract_html: string
  invoice_html: string
  invoice_number: string
  payment_receipt_url: string
  advance_receipt_url?: string | null
  created_at: string
}

// ---- Buyurtma (order) ----

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
  payment_deadline_at?: string | null
  accepted_at?: string | null
  ready_at?: string | null
  picked_up_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  buyer_received_at?: string | null
  paid_at?: string | null
  force_majeure_at?: string | null
  force_majeure_by?: number | null
  guarantee_paid_at?: string | null
  guarantee_by?: number | null
  created_at: string
  updated_at: string
  items?: OrderItem[]
}

// ---- Mahsulot (admin ko'rinishi) ----

export type ProductStatus = 'pending' | 'approved' | 'rejected'

export interface Product {
  id: number
  code: string
  ishlabchiqaruvchi_id: number
  name: string
  city: string
  description: unknown
  category_id: number
  subcategory_id: number
  price: number
  quantity: number
  moq: number
  payment_term: PaymentTerm
  payment_days: number
  specs: unknown
  images: string[]
  status: ProductStatus
  rejection_note: string
  reviewed_by: number | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface ProductQuickEditInput {
  city: string
  price: number
  quantity: number
  moq: number
  payment_term: PaymentTerm
  payment_days: number
}

// ---- Kurator daromadi va to'lov so'rovlari ----

export type KuratorTolovStatus = 'pending' | 'paid' | 'rejected'

export interface KuratorDaromad {
  id: number
  kurator_id: number
  buyurtma_id: number
  order_amount: number
  percent: number
  amount: number
  created_at: string
}

export interface KuratorDaromadSummary {
  balance: number
  total_earned: number
  total_withdrawn_pending: number
  items: KuratorDaromad[]
}

export interface KuratorTolovSorovi {
  id: number
  kurator_id: number
  amount: number
  card_number: string
  card_holder: string
  note: string
  status: KuratorTolovStatus
  admin_note: string
  processed_by?: number | null
  processed_at?: string | null
  created_at: string
  updated_at: string
}

export interface CreateTolovSorovInput {
  amount: number
  card_number: string
  card_holder: string
  note?: string
}

// ---- Kurator ko'rinishidagi zavod komissiyalari ----

export type KomissiyaStatus = 'pending' | 'submitted' | 'paid' | 'waived'

export interface KuratorKomissiyaItem {
  id: number
  buyurtma_id: number
  ishlabchiqaruvchi_id: number
  company_name: string
  order_amount: number
  percent: number
  amount: number
  status: KomissiyaStatus
  paid_at?: string | null
  created_at: string
}

export interface PlatformSettingsLite {
  id: number
  commission_percent: number
  curator_percent: number
  free_promo_active: boolean
  reserve_balance: number
  updated_at: string
}

// ---- Bildirishnoma ----

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
