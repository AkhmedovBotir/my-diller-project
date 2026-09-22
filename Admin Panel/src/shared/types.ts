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

export type RegionType = 'region' | 'district' | 'mfy'

export interface Region {
  id: number
  mongo_oid?: string
  parent_id?: number | null
  name: string
  code: string
  type: RegionType
  status: string
  created_at: string
  updated_at: string
}

export interface RegionInput {
  parent_id?: number | null
  name: string
  code?: string
  type?: RegionType
  status?: string
}

export interface RegionImportResult {
  inserted: number
  updated: number
  total: number
}

export interface LoginResponse {
  token: string
  admin: Admin
}

export interface SmsChallenge {
  sms_required: true
  challenge_id: string
  phone_masked: string
  expires_in: number
  resend_after: number
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
  mfo?: string
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
  stir?: string
  bank_account?: string
  bank_name?: string
  mfo?: string
  address?: string
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
  city: string
  description: QuillDelta | string
  category_id: number
  subcategory_id: number
  price: number
  quantity: number
  moq: number
  payment_term: PaymentTerm
  payment_days: number
  images: string[]
  status: ProductStatus
  rejection_note: string
  reviewed_by: number | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface ProductUpdateInput {
  code: string
  name: string
  city: string
  description: QuillDelta | string
  category_id: number
  subcategory_id: number
  price: number
  quantity: number
  moq: number
  payment_term: PaymentTerm
  payment_days: number
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

export type CommissionStatus = 'pending' | 'submitted' | 'paid' | 'waived'

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
  curator_percent: number
  support_telegram: string
  updated_at: string
}

export interface UpdatePlatformSettingsInput {
  commission_percent: number
  free_promo_active: boolean
  reserve_balance: number
  curator_percent: number
  support_telegram: string
}

// ---- Kurator kartaga pul yechish so'rovlari (bosh admin ko'rinishi) ----

export type KuratorTolovStatus = 'pending' | 'paid' | 'rejected'

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
  mfo: string
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
  mfo?: string
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
    | 'JUDA_KOP_SOROV'
    | 'TASHQI_XIZMAT_XATOSI'
    | 'ICHKI_SERVER_XATOSI'
  message: string
  field?: string
}

// --- Birga Xarid (alohida DB moduli) ---

export interface BirgaCategory {
  id: number
  name: string
  description: string
  icon: string
  created_at: string
  updated_at: string
}

export interface BirgaCategoryInput {
  name: string
  description?: string
  icon: string
}

export interface BirgaSubcategory {
  id: number
  category_id: number
  name: string
  description: string
  created_at: string
  updated_at: string
}

export interface BirgaSubcategoryInput {
  category_id: number
  name: string
  description?: string
}

export interface BirgaProduct {
  id: number
  category_id: number
  subcategory_id?: number | null
  name: string
  description: string
  unit: string
  price: number
  stock: number
  photo_url: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BirgaProductInput {
  category_id: number
  subcategory_id?: number | null
  name: string
  description?: string
  unit?: string
  price: number
  stock: number
  photo?: File | null
  is_active?: boolean
}

export type BirgaGroupBuyKind = 'product' | 'combo'
export type BirgaGroupBuyStatus = 'open' | 'closed' | 'in_fulfillment' | 'completed' | 'cancelled'

export interface BirgaGroupBuyItem {
  id: number
  group_buy_id: number
  product_id: number
  quantity: number
  product_name?: string
  photo_url?: string
}

export interface BirgaGroupBuy {
  id: number
  kind: BirgaGroupBuyKind
  title: string
  description: string
  product_id?: number | null
  price: number
  min_volume: number
  current_volume: number
  stock: number
  photo_urls: string[]
  status: BirgaGroupBuyStatus
  items?: BirgaGroupBuyItem[]
  created_at: string
  updated_at: string
}

export interface BirgaGroupBuyInput {
  kind: BirgaGroupBuyKind
  title: string
  description?: string
  product_id?: number | null
  price: number
  min_volume: number
  stock: number
  photo_urls?: string[]
  photos?: (File | null)[]
  items?: { product_id: number; quantity: number }[]
}

export interface BirgaCustomer {
  id: number
  phone: string
  first_name: string
  last_name: string
  region_name: string
  city_name: string
  mfy_name: string
  address: string
  lat?: number | null
  lng?: number | null
  profile_completed: boolean
  is_blocked: boolean
  blocked_reason: string
  created_at: string
  updated_at: string
}

export type BirgaOrderStatus =
  | 'collecting'
  | 'awaiting_courier'
  | 'with_courier'
  | 'issued'
  | 'cancelled'

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
  created_at: string
  updated_at: string
}

export interface BirgaSettings {
  id: number
  min_order_amount: number
  courier_fee_mode: 'percent' | 'fixed' | string
  courier_fee_percent: number
  courier_fee_fixed: number
  kurator_fee_mode: 'percent' | 'fixed' | string
  kurator_fee_percent: number
  kurator_fee_fixed: number
  updated_at: string
}

export interface BirgaSettingsInput {
  min_order_amount: number
  courier_fee_mode: 'percent' | 'fixed'
  courier_fee_percent: number
  courier_fee_fixed: number
  kurator_fee_mode: 'percent' | 'fixed'
  kurator_fee_percent: number
  kurator_fee_fixed: number
}

export interface BirgaFinanceAccrual {
  id: number
  order_id: number
  order_amount: number
  courier_id?: number | null
  courier_amount: number
  courier_paid: boolean
  courier_paid_at?: string | null
  kurator_amount: number
  kurator_paid: boolean
  kurator_paid_at?: string | null
  region_name: string
  city_name: string
  mfy_name: string
  created_at: string
}

export interface BirgaFinanceStats {
  issued_orders: number
  gross_volume: number
  courier_accrued: number
  courier_paid: number
  courier_pending: number
  kurator_accrued: number
  kurator_paid: number
  kurator_pending: number
  platform_estimate: number
}

export interface BirgaCustomerInput {
  phone: string
  first_name?: string
  last_name?: string
  region_name?: string
  city_name?: string
  mfy_name?: string
  address?: string
  lat?: number | null
  lng?: number | null
}
