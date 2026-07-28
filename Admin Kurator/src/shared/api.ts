import type {
  AdminProfileInput,
  ApiError,
  CreateTolovSorovInput,
  Hujjat,
  Ishlabchiqaruvchi,
  IshlabchiqaruvchiCreateInput,
  KomissiyaStatus,
  KuratorDaromadSummary,
  KuratorKomissiyaItem,
  KuratorTolovSorovi,
  LoginResponse,
  Notification,
  Order,
  OrderStatus,
  PlatformSettingsLite,
  Product,
  ProductStatus,
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
    if (response.status === 401 && path !== LOGIN_PATH) {
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

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>(LOGIN_PATH, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  profile: () => request<import('./types').Admin>('/admin/profile'),

  updateProfile: (input: AdminProfileInput) =>
    request<import('./types').Admin>('/admin/profile', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

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
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) return error.message
  if (error instanceof TypeError) return 'Server bilan aloqa o‘rnatilmadi'
  return 'Kutilmagan xatolik yuz berdi'
}

export function getErrorField(error: unknown) {
  return error instanceof ApiRequestError ? error.field : undefined
}
