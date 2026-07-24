export type AdminRole = 'general' | 'admin' | 'kurator'

export interface Admin {
  id: number
  first_name: string
  last_name: string
  phone: string
  username: string
  type: AdminRole
  created_at: string
  updated_at: string
}

export interface AdminInput {
  first_name: string
  last_name: string
  phone: string
  username: string
  password?: string
  type: AdminRole
}

export interface LoginResponse {
  token: string
  admin: Admin
}

export interface Ishlabchiqaruvchi {
  id: number
  company_name: string
  first_name: string
  last_name: string
  phone: string
  username: string
  stir?: string
  bank_account?: string
  bank_name?: string
  address?: string
  lat?: number | null
  lng?: number | null
  kurator_id?: number | null
  created_at: string
  updated_at: string
}

export interface IshlabchiqaruvchiInput {
  company_name: string
  first_name: string
  last_name: string
  phone: string
  username: string
  password?: string
  kurator_id?: number | null
}

export interface Category {
  id: number
  name: string
  description: string
  created_at: string
  updated_at: string
}

export interface CategoryInput {
  name: string
  description?: string
}

export interface Subcategory {
  id: number
  category_id: number
  name: string
  description: string
  created_at: string
  updated_at: string
}

export interface SubcategoryInput {
  category_id: number
  name: string
  description?: string
}

export type ProductStatus = 'pending' | 'approved' | 'rejected'

export interface QuillDelta {
  ops: Array<{ insert?: string | Record<string, unknown>; attributes?: Record<string, unknown> }>
}

export interface Product {
  id: number
  code: string
  ishlabchiqaruvchi_id: number
  name: string
  description: QuillDelta | string
  category_id: number
  subcategory_id: number
  price: number
  quantity: number
  images: string[]
  status: ProductStatus
  rejection_note: string
  reviewed_by: number | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface ProductUpdateInput {
  name: string
  description: QuillDelta | string
  category_id: number
  subcategory_id: number
  price: number
  quantity: number
  images?: File[]
}

export type PaymentTerm = 'prepay_100' | 'deferred' | 'pod_zakaz_50_50'

export type PaymentPhase = 'none' | 'awaiting_advance' | 'awaiting_final' | 'completed'

export type OrderStatus =
  | 'yangi'
  | 'qabul_qilindi'
  | 'logistikaga_uzatildi'
  | 'yolda'
  | 'yetkazildi_tolov_kutilmoqda'
  | 'yakunlandi'
  | 'fors_major'
  | 'kafolat_bilan_yopildi'

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

export type CommissionStatus = 'pending' | 'paid' | 'waived'

export interface Commission {
  id: number
  buyurtma_id: number
  ishlabchiqaruvchi_id: number
  order_amount: number
  percent: number
  amount: number
  status: CommissionStatus
  invoice_html: string
  payment_receipt_url: string
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface PlatformSettings {
  id: number
  commission_percent: number
  free_promo_active: boolean
  reserve_balance: number
  updated_at: string
}

export interface UpdatePlatformSettingsInput {
  commission_percent: number
  free_promo_active: boolean
  reserve_balance: number
}

export interface Xaridor {
  id: number
  shop_name: string
  first_name: string
  last_name: string
  phone: string
  username: string
  stir: string
  bank_account: string
  bank_name: string
  address: string
  lat?: number | null
  lng?: number | null
  is_blocked: boolean
  blocked_reason: string
  created_at: string
  updated_at: string
}

export interface XaridorInput {
  shop_name: string
  first_name: string
  last_name: string
  phone: string
  username: string
  password?: string
  stir?: string
  bank_account?: string
  bank_name?: string
  address?: string
  lat?: number | null
  lng?: number | null
}

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

export type DebtStatus = 'open' | 'collected' | 'written_off'

export interface Debt {
  id: number
  buyurtma_id: number
  order_number?: string
  debtor_type: string
  debtor_id: number
  amount: number
  status: DebtStatus
  due_at?: string | null
  created_at: string
  updated_at?: string
}

export interface ForsMajorAlert {
  count: number
  order_ids?: number[]
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
