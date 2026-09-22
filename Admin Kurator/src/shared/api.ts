import type {
  AdminProfileInput,
  ApiError,
  BirgaCategory,
  BirgaCategoryInput,
  BirgaCustomer,
  BirgaCustomerInput,
  BirgaOrder,
  BirgaOrderStatus,
  BirgaGroupBuy,
  BirgaGroupBuyInput,
  BirgaGroupBuyStatus,
  BirgaProduct,
  BirgaProductInput,
  BirgaSubcategory,
  BirgaSubcategoryInput,
  CreateTolovSorovInput,
  Hujjat,
  Ishlabchiqaruvchi,
  IshlabchiqaruvchiCreateInput,
  KomissiyaStatus,
  KuratorDaromadSummary,
  KuratorKomissiyaItem,
  KuratorTolovSorovi,
  LoginResponse,
  SmsChallenge,
  Notification,
  Order,
  OrderStatus,
  PlatformSettingsLite,
  Product,
  ProductStatus,
  Region,
} from './types'

import { API_URL } from './config'
const TOKEN_KEY = 'mydiller_kurator_token'
const LOGIN_PATH = '/admin/auth/login'

export class ApiRequestError extends Error {
  status: number
  code?: ApiError['code']
  field?: string

  constructor(message: string, status: number, code?: ApiError['code'], field?: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
    this.field = field
  }
}

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  remove: () => localStorage.removeItem(TOKEN_KEY),
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStorage.get()
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  if (options.body && !isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })

  if (!response.ok) {
    let message = 'Kutilmagan xatolik yuz berdi'
    let code: ApiError['code'] | undefined
    let field: string | undefined
    try {
      const body = (await response.json()) as ApiError
      message = body.message || message
      code = body.code
      field = body.field
    } catch {
      // The API may return an empty error body.
    }
    if (response.status === 401 && !path.includes('/auth/')) {
      tokenStorage.remove()
      window.dispatchEvent(new Event('auth:unauthorized'))
    }
    throw new ApiRequestError(message, response.status, code, field)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

async function downloadFile(path: string, filename: string) {
  const token = tokenStorage.get()
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    let message = 'Faylni yuklab bo‘lmadi'
    try {
      const body = (await response.json()) as ApiError
      message = body.message || message
    } catch {
      // Ignore empty error bodies.
    }
    throw new ApiRequestError(message, response.status)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}

function toQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export interface ProductUpdatePayload {
  name: string
  city: string
  description: unknown
  category_id: number
  subcategory_id: number
  price: number
  quantity: number
  moq: number
  payment_term: string
  payment_days: number
  specs?: unknown
}

function buildBirgaGroupBuyForm(input: BirgaGroupBuyInput) {
  const form = new FormData()
  form.set('kind', input.kind)
  form.set('title', input.title)
  form.set('description', input.description ?? '')
  if (input.product_id) form.set('product_id', String(input.product_id))
  form.set('price', String(input.price))
  form.set('min_volume', String(input.min_volume))
  form.set('stock', String(input.stock))
  form.set('items', JSON.stringify(input.items ?? []))
  const existing = Array.from({ length: 5 }, (_, i) => {
    if (input.photos?.[i]) return ''
    return input.photo_urls?.[i] ?? ''
  })
  form.set('existing_urls', JSON.stringify(existing))
  ;(input.photos ?? []).forEach((file, index) => {
    if (file && index < 5) form.set(`photo_${index}`, file)
  })
  return form
}

export const api = {
  login: (username: string, password: string) =>
    request<SmsChallenge>(LOGIN_PATH, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  verifyLogin: (challengeId: string, code: string) =>
    request<LoginResponse>(`${LOGIN_PATH}/verify`, {
      method: 'POST',
      body: JSON.stringify({ challenge_id: challengeId, code }),
    }),

  resendSms: (challengeId: string, purpose: 'login' | 'register' | 'reset' = 'login') =>
    request<SmsChallenge>(`/admin/auth/sms/resend?purpose=${purpose}`, {
      method: 'POST',
      body: JSON.stringify({ challenge_id: challengeId }),
    }),

  forgotPassword: (username: string) =>
    request<SmsChallenge>('/admin/auth/forgot', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  resetPassword: (challengeId: string, code: string, password: string) =>
    request<{ message: string }>('/admin/auth/reset', {
      method: 'POST',
      body: JSON.stringify({ challenge_id: challengeId, code, password }),
    }),

  profile: () => request<import('./types').Admin>('/admin/profile'),

  updateProfile: (input: AdminProfileInput) =>
    request<import('./types').Admin>('/admin/profile', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  kuratorMfys: () => request<Region[]>('/kurator/mfys'),

  // ---- Kurator: buyurtmalar ----
  kuratorOrders: (params?: { status?: OrderStatus | ''; limit?: number; offset?: number }) =>
    request<Order[]>(
      `/kurator/buyurtmalar${toQuery({
        status: params?.status || undefined,
        limit: params?.limit ?? 100,
        offset: params?.offset ?? 0,
      })}`,
    ),

  kuratorOrder: (id: number) => request<Order>(`/kurator/buyurtmalar/${id}`),

  forceMajeure: (id: number) =>
    request<Order>(`/kurator/buyurtmalar/${id}/force-majeure`, { method: 'POST' }),

  downloadContractPdf: (id: number, number?: string) =>
    downloadFile(`/kurator/buyurtmalar/${id}/contract.pdf`, `shartnoma-${number || id}.pdf`),

  downloadInvoicePdf: (id: number, number?: string) =>
    downloadFile(`/kurator/buyurtmalar/${id}/invoice.pdf`, `hisob-faktura-${number || id}.pdf`),

  // ---- Hujjatlar (shartnoma, hisob-faktura, kvitansiyalar ro'yxati) ----
  documents: () => request<Hujjat[]>('/kurator/hujjatlar'),

  // ---- Fabrikalar (ishlab chiqaruvchilar) ----
  factories: (limit = 100, offset = 0) =>
    request<Ishlabchiqaruvchi[]>(`/ishlabchiqaruvchilar${toQuery({ limit, offset })}`),

  createFactory: (input: IshlabchiqaruvchiCreateInput) =>
    request<Ishlabchiqaruvchi>('/ishlabchiqaruvchilar', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // ---- Mahsulotlar (admin ko'rinishi) ----
  products: (params?: { status?: ProductStatus | ''; limit?: number; offset?: number }) =>
    request<Product[]>(
      `/admin/products${toQuery({
        status: params?.status || undefined,
        limit: params?.limit ?? 20,
        offset: params?.offset ?? 0,
      })}`,
    ),

  product: (id: number) => request<Product>(`/admin/products/${id}`),

  updateProduct: (id: number, input: ProductUpdatePayload) =>
    request<Product>(`/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  // ---- Kurator: daromad va kartaga pul yechish so'rovlari ----
  kuratorDaromad: () => request<KuratorDaromadSummary>('/kurator/daromad'),

  kuratorTolovSorovlari: () => request<KuratorTolovSorovi[]>('/kurator/tolov-sorovlari'),

  createTolovSorov: (input: CreateTolovSorovInput) =>
    request<KuratorTolovSorovi>('/kurator/tolov-sorovlari', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // ---- Kurator: o'ziga biriktirilgan zavodlarning komissiyalari ----
  kuratorKomissiyalar: (params?: { status?: KomissiyaStatus | ''; limit?: number; offset?: number }) =>
    request<KuratorKomissiyaItem[]>(
      `/kurator/komissiyalar${toQuery({
        limit: params?.limit ?? 50,
        offset: params?.offset ?? 0,
      })}`,
    ),

  // ---- Platforma sozlamalari (faqat o'qish, komissiya foizini ko'rsatish uchun) ----
  platformSettings: () => request<PlatformSettingsLite>('/admin/platform-settings'),

  // ---- Bildirishnomalar ----
  notifications: (limit = 50, offset = 0) =>
    request<Notification[]>(`/notifications${toQuery({ limit, offset })}`),

  markNotificationRead: (id: number) =>
    request<Notification>(`/notifications/${id}/read`, { method: 'POST' }),

  markAllNotificationsRead: () =>
    request<{ ok: boolean }>('/notifications/read-all', { method: 'POST' }),

  // --- Birga Xarid ---
  birgaCategories: (limit = 100, offset = 0) =>
    request<BirgaCategory[]>(`/birga-xarid/categories?limit=${limit}&offset=${offset}`),

  createBirgaCategory: (input: BirgaCategoryInput) =>
    request<BirgaCategory>('/birga-xarid/categories', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateBirgaCategory: (id: number, input: BirgaCategoryInput) =>
    request<BirgaCategory>(`/birga-xarid/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  deleteBirgaCategory: (id: number) =>
    request<void>(`/birga-xarid/categories/${id}`, { method: 'DELETE' }),

  birgaSubcategories: (params?: { category_id?: number; limit?: number; offset?: number }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 100))
    query.set('offset', String(params?.offset ?? 0))
    if (params?.category_id) query.set('category_id', String(params.category_id))
    return request<BirgaSubcategory[]>(`/birga-xarid/subcategories?${query}`)
  },

  createBirgaSubcategory: (input: BirgaSubcategoryInput) =>
    request<BirgaSubcategory>('/birga-xarid/subcategories', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateBirgaSubcategory: (id: number, input: BirgaSubcategoryInput) =>
    request<BirgaSubcategory>(`/birga-xarid/subcategories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  deleteBirgaSubcategory: (id: number) =>
    request<void>(`/birga-xarid/subcategories/${id}`, { method: 'DELETE' }),

  birgaProducts: (params?: { category_id?: number; limit?: number; offset?: number }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 100))
    query.set('offset', String(params?.offset ?? 0))
    if (params?.category_id) query.set('category_id', String(params.category_id))
    return request<BirgaProduct[]>(`/birga-xarid/products?${query}`)
  },

  createBirgaProduct: (input: BirgaProductInput) => {
    const form = new FormData()
    form.set('category_id', String(input.category_id))
    if (input.subcategory_id) form.set('subcategory_id', String(input.subcategory_id))
    form.set('name', input.name)
    form.set('description', input.description ?? '')
    form.set('unit', input.unit ?? 'dona')
    form.set('price', String(input.price))
    form.set('stock', String(input.stock))
    form.set('is_active', String(input.is_active ?? true))
    if (input.photo) form.set('photo', input.photo)
    return request<BirgaProduct>('/birga-xarid/products', { method: 'POST', body: form })
  },

  updateBirgaProduct: (id: number, input: BirgaProductInput) => {
    const form = new FormData()
    form.set('category_id', String(input.category_id))
    if (input.subcategory_id) form.set('subcategory_id', String(input.subcategory_id))
    form.set('name', input.name)
    form.set('description', input.description ?? '')
    form.set('unit', input.unit ?? 'dona')
    form.set('price', String(input.price))
    form.set('stock', String(input.stock))
    form.set('is_active', String(input.is_active ?? true))
    if (input.photo) form.set('photo', input.photo)
    return request<BirgaProduct>(`/birga-xarid/products/${id}`, { method: 'PUT', body: form })
  },

  deleteBirgaProduct: (id: number) =>
    request<void>(`/birga-xarid/products/${id}`, { method: 'DELETE' }),

  birgaGroupBuys: (params?: { status?: BirgaGroupBuyStatus | ''; limit?: number; offset?: number }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 100))
    query.set('offset', String(params?.offset ?? 0))
    if (params?.status) query.set('status', params.status)
    return request<BirgaGroupBuy[]>(`/birga-xarid/group-buys?${query}`)
  },

  birgaGroupBuy: (id: number) => request<BirgaGroupBuy>(`/birga-xarid/group-buys/${id}`),

  createBirgaGroupBuy: (input: BirgaGroupBuyInput) => {
    const form = buildBirgaGroupBuyForm(input)
    return request<BirgaGroupBuy>('/birga-xarid/group-buys', { method: 'POST', body: form })
  },

  updateBirgaGroupBuy: (id: number, input: BirgaGroupBuyInput) => {
    const form = buildBirgaGroupBuyForm(input)
    return request<BirgaGroupBuy>(`/birga-xarid/group-buys/${id}`, { method: 'PUT', body: form })
  },

  setBirgaGroupBuyStatus: (id: number, status: BirgaGroupBuyStatus) =>
    request<BirgaGroupBuy>(`/birga-xarid/group-buys/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  deleteBirgaGroupBuy: (id: number) =>
    request<void>(`/birga-xarid/group-buys/${id}`, { method: 'DELETE' }),

  birgaOrders: (params?: { status?: BirgaOrderStatus | ''; limit?: number; offset?: number }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 100))
    query.set('offset', String(params?.offset ?? 0))
    if (params?.status) query.set('status', params.status)
    return request<BirgaOrder[]>(`/birga-xarid/orders?${query}`)
  },

  birgaOrder: (id: number) => request<BirgaOrder>(`/birga-xarid/orders/${id}`),

  birgaCustomers: (params?: { search?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 50))
    query.set('offset', String(params?.offset ?? 0))
    if (params?.search) query.set('search', params.search)
    return request<BirgaCustomer[]>(`/birga-xarid/customers?${query}`)
  },

  createBirgaCustomer: (input: BirgaCustomerInput) =>
    request<BirgaCustomer>('/birga-xarid/customers', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateBirgaCustomer: (id: number, input: BirgaCustomerInput) =>
    request<BirgaCustomer>(`/birga-xarid/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  deleteBirgaCustomer: (id: number) =>
    request<void>(`/birga-xarid/customers/${id}`, { method: 'DELETE' }),

  blockBirgaCustomer: (id: number, reason = '') =>
    request<BirgaCustomer>(`/birga-xarid/customers/${id}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  unblockBirgaCustomer: (id: number) =>
    request<BirgaCustomer>(`/birga-xarid/customers/${id}/unblock`, { method: 'POST' }),
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) return error.message
  if (error instanceof TypeError) return 'Server bilan aloqa o‘rnatilmadi'
  return 'Kutilmagan xatolik yuz berdi'
}

export function getErrorField(error: unknown) {
  return error instanceof ApiRequestError ? error.field : undefined
}
