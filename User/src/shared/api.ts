import { API_URL, TOKEN_KEY } from './config'
import type {
  AuthStartResponse,
  BirgaSettings,
  CartItem,
  Category,
  CheckoutInput,
  Customer,
  GroupBuy,
  Order,
  Product,
  ProfileInput,
  Region,
  RegionType,
  SmsChallenge,
  Subcategory,
} from './types'

export class ApiRequestError extends Error {
  status: number
  field?: string

  constructor(message: string, status: number, field?: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.field = field
  }
}

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  remove: () => localStorage.removeItem(TOKEN_KEY),
}

async function request<T>(path: string, options: RequestInit = {}, auth = true): Promise<T> {
  const token = auth ? tokenStorage.get() : null
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (options.headers) {
    const extra = new Headers(options.headers)
    extra.forEach((value, key) => {
      headers[key] = value
    })
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (!response.ok) {
    let message = 'Kutilmagan xatolik yuz berdi'
    let field: string | undefined
    try {
      const body = (await response.json()) as { message?: string; field?: string }
      message = body.message || message
      field = body.field
    } catch {
      /* ignore */
    }
    throw new ApiRequestError(message, response.status, field)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function qs(params: Record<string, string | number | undefined | null>) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.set(key, String(value))
  })
  const raw = query.toString()
  return raw ? `?${raw}` : ''
}

export const api = {
  authLogin: (phone: string) =>
    request<SmsChallenge>(
      '/public/birga-xarid/auth/login',
      { method: 'POST', body: JSON.stringify({ phone }) },
      false,
    ),

  authVerify: (challengeId: string, code: string) =>
    request<AuthStartResponse>(
      '/public/birga-xarid/auth/verify',
      { method: 'POST', body: JSON.stringify({ challenge_id: challengeId, code }) },
      false,
    ),

  authResendSms: (challengeId: string) =>
    request<SmsChallenge>(
      '/public/birga-xarid/auth/sms/resend',
      { method: 'POST', body: JSON.stringify({ challenge_id: challengeId }) },
      false,
    ),

  me: () => request<Customer>('/birga-xarid/me'),
  updateMe: (input: ProfileInput) =>
    request<Customer>('/birga-xarid/me', { method: 'PATCH', body: JSON.stringify(input) }),

  categories: (params?: { limit?: number; offset?: number }) =>
    request<Category[]>(
      `/public/birga-xarid/categories${qs({ limit: params?.limit ?? 200, offset: params?.offset })}`,
      {},
      false,
    ),

  category: (id: number) =>
    request<Category>(`/public/birga-xarid/categories/${id}`, {}, false),

  subcategories: (params?: { category_id?: number; limit?: number }) =>
    request<Subcategory[]>(
      `/public/birga-xarid/subcategories${qs({
        category_id: params?.category_id,
        limit: params?.limit ?? 500,
      })}`,
      {},
      false,
    ),

  products: (params?: { category_id?: number; subcategory_id?: number; limit?: number }) =>
    request<Product[]>(
      `/public/birga-xarid/products${qs({
        category_id: params?.category_id,
        subcategory_id: params?.subcategory_id,
        limit: params?.limit ?? 200,
      })}`,
      {},
      false,
    ),

  product: (id: number) =>
    request<Product>(`/public/birga-xarid/products/${id}`, {}, false),

  groupBuys: (params?: { status?: string; limit?: number; offset?: number }) =>
    request<GroupBuy[]>(
      `/public/birga-xarid/group-buys${qs({
        status: params?.status ?? 'open',
        limit: params?.limit ?? 100,
        offset: params?.offset,
      })}`,
      {},
      false,
    ),

  groupBuy: (id: number) =>
    request<GroupBuy>(`/public/birga-xarid/group-buys/${id}`, {}, false),

  settings: () =>
    request<BirgaSettings>('/public/birga-xarid/settings', {}, false),

  cart: () => request<CartItem[]>('/birga-xarid/cart'),

  upsertCart: (input: { group_buy_id: number; quantity: number; add?: boolean }) =>
    request<CartItem[]>('/birga-xarid/cart', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  removeCartItem: (groupBuyId: number) =>
    request<CartItem[]>(`/birga-xarid/cart/${groupBuyId}`, { method: 'DELETE' }),

  checkout: (input?: CheckoutInput) =>
    request<Order[]>('/birga-xarid/cart/checkout', {
      method: 'POST',
      body: JSON.stringify(input ?? {}),
    }),

  orders: (params?: { limit?: number; offset?: number }) =>
    request<Order[]>(
      `/birga-xarid/me/orders${qs({ limit: params?.limit ?? 50, offset: params?.offset })}`,
    ),

  order: (id: number) => request<Order>(`/birga-xarid/me/orders/${id}`),

  cancelOrder: (id: number) =>
    request<Order>(`/birga-xarid/me/orders/${id}/cancel`, { method: 'POST' }),

  regions: (params?: { type?: RegionType; parent_id?: number; limit?: number }) =>
    request<Region[]>(
      `/public/regions${qs({
        type: params?.type,
        parent_id: params?.parent_id,
        limit: params?.limit ?? 500,
        status: 'active',
      })}`,
      {},
      false,
    ),
}
