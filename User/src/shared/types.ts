/** Backend (Birga Xarid) API kontraktlariga mos tiplar. */

export interface ApiErrorBody {
  message?: string
  code?: string
  field?: string
}

export type RegionType = 'region' | 'district' | 'mfy'

export interface Region {
  id: number
  parent_id?: number | null
  name: string
  code?: string
  type: RegionType
  status?: string
}

export interface Category {
  id: number
  name: string
  description?: string
  icon?: string
}

export interface Subcategory {
  id: number
  category_id: number
  name: string
  description?: string
}

export type ProductUnit = 'dona' | 'kg' | 'litr'

export interface Product {
  id: number
  category_id: number
  subcategory_id?: number | null
  name: string
  description?: string
  unit?: ProductUnit | string
  price: number
  stock: number
  photo_url?: string
  is_active?: boolean
}

export type GroupBuyKind = 'product' | 'combo'
export type GroupBuyStatus = 'open' | 'closed' | 'in_fulfillment' | 'completed' | 'cancelled'

export interface GroupBuyItem {
  id?: number
  group_buy_id?: number
  product_id: number
  quantity: number
  product_name?: string
  photo_url?: string
}

export interface GroupBuy {
  id: number
  kind?: GroupBuyKind | string
  title: string
  description?: string
  product_id?: number | null
  price: number
  min_volume: number
  current_volume: number
  stock: number
  photo_urls?: string[] | null
  status: GroupBuyStatus | string
  items?: GroupBuyItem[] | null
  created_at?: string
  updated_at?: string
}

export interface Customer {
  id: number
  phone: string
  first_name?: string
  last_name?: string
  birth_date?: string | null
  region_name?: string
  city_name?: string
  mfy_name?: string
  address?: string
  lat?: number | null
  lng?: number | null
  profile_completed: boolean
  is_blocked?: boolean
  blocked_reason?: string
  created_at?: string
  updated_at?: string
}

export interface SmsChallenge {
  challenge_id: string
  phone_masked: string
  expires_in: number
  resend_after: number
}

export interface AuthStartResponse {
  token: string
  customer: Customer
  is_new: boolean
}

export interface ProfileInput {
  first_name: string
  last_name: string
  birth_date: string
  region_name: string
  city_name: string
  mfy_name: string
  address?: string
}

export interface CartItem {
  id?: number
  customer_id?: number
  group_buy_id: number
  quantity: number
  title?: string
  price?: number
  photo_url?: string
  status?: GroupBuyStatus | string
  max_quantity?: number
  created_at?: string
  updated_at?: string
}

export type OrderStatus =
  | 'collecting'
  | 'awaiting_courier'
  | 'with_courier'
  | 'issued'
  | 'cancelled'

export interface Order {
  id: number
  customer_id?: number
  group_buy_id: number
  quantity: number
  unit_price: number
  total_amount: number
  status: OrderStatus | string
  pickup_code?: string
  title_snapshot?: string
  photo_snapshot?: string
  created_at?: string
  updated_at?: string
}

export interface CheckoutInput {
  group_buy_id?: number
  quantity?: number
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  collecting: 'Yig‘ilmoqda',
  awaiting_courier: 'Kuryer kutmoqda',
  with_courier: 'Kuryerda',
  issued: 'Berildi',
  cancelled: 'Bekor qilindi',
}

/** Har bir statusning foydalanuvchiga tushuntirilishi. */
export const ORDER_STATUS_HELP: Record<string, string> = {
  collecting:
    'Yig‘im hali ochiq. Boshqa xaridorlar qo‘shilishi kutilmoqda. Bu bosqichda buyurtmani bekor qilishingiz mumkin.',
  awaiting_courier:
    'Yig‘im yopildi va buyurtmangiz tayyor. Tez orada hududingizdagi kuryer uni olib, yetkazishni boshlaydi.',
  with_courier:
    'Kuryer buyurtmani qo‘liga oldi va sizga yetkazmoqda. Topshirishda 6 xonali kodni aytasiz — kodsiz berilmaydi.',
  issued: 'Buyurtma muvaffaqiyatli topshirildi. Xaridingiz uchun rahmat!',
  cancelled: 'Bu buyurtma bekor qilingan. Pul yoki mahsulot bo‘yicha savollar bo‘lsa, qo‘llab-quvvatlashga murojaat qiling.',
}

export const ORDER_STEPS = ['collecting', 'awaiting_courier', 'with_courier', 'issued'] as const


export interface BirgaSettings {
  id: number
  min_order_amount: number
  updated_at: string
}
