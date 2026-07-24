import type {
  ApiError,
  Category,
  CreateOrderInput,
  LoginResponse,
  Notification,
  Order,
  Product,
  RegisterInput,
  Subcategory,
  Xaridor,
  XaridorProfileInput,
} from './types'

import { API_URL } from './config'
const TOKEN_KEY = 'mydiller_xaridor_token'
const LOGIN_PATH = '/xaridor/auth/login'

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

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>(LOGIN_PATH, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (input: RegisterInput) =>
    request<LoginResponse>('/xaridor/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  profile: () => request<Xaridor>('/xaridor/profile'),

  updateProfile: (input: XaridorProfileInput) =>
    request<Xaridor>('/xaridor/profile', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  categories: () => request<Category[]>('/categories?limit=100&offset=0'),

  subcategories: (categoryId?: number) => {
    const query = new URLSearchParams()
    query.set('limit', '100')
    query.set('offset', '0')
    if (categoryId != null) query.set('category_id', String(categoryId))
    return request<Subcategory[]>(`/subcategories?${query.toString()}`)
  },

  catalogProducts: (params?: {
    category_id?: number
    subcategory_id?: number
    search?: string
    limit?: number
    offset?: number
  }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 20))
    query.set('offset', String(params?.offset ?? 0))
    if (params?.category_id) query.set('category_id', String(params.category_id))
    if (params?.subcategory_id) query.set('subcategory_id', String(params.subcategory_id))
    if (params?.search) query.set('search', params.search)
    return request<Product[]>(`/catalog/products?${query.toString()}`)
  },

  catalogProduct: (id: number) => request<Product>(`/catalog/products/${id}`),

  createOrder: (input: CreateOrderInput) =>
    request<Order>('/xaridor/buyurtmalar', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  orders: (params?: { status?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 20))
    query.set('offset', String(params?.offset ?? 0))
    if (params?.status) query.set('status', params.status)
    return request<Order[]>(`/xaridor/buyurtmalar?${query.toString()}`)
  },

  order: (id: number) => request<Order>(`/xaridor/buyurtmalar/${id}`),

  receiveOrder: (id: number) =>
    request<Order>(`/xaridor/buyurtmalar/${id}/receive`, { method: 'POST' }),

  uploadReceipt: (id: number, file: File) => {
    const form = new FormData()
    form.set('receipt', file)
    return request<Order>(`/xaridor/buyurtmalar/${id}/upload-receipt`, {
      method: 'POST',
      body: form,
    })
  },

  uploadAdvanceReceipt: (id: number, file: File) => {
    const form = new FormData()
    form.set('receipt', file)
    return request<Order>(`/xaridor/buyurtmalar/${id}/upload-advance-receipt`, {
      method: 'POST',
      body: form,
    })
  },

  downloadContractPdf: (id: number, number?: string) =>
    downloadFile(`/xaridor/buyurtmalar/${id}/contract.pdf`, `shartnoma-${number || id}.pdf`),

  downloadInvoicePdf: (id: number, number?: string) =>
    downloadFile(`/xaridor/buyurtmalar/${id}/invoice.pdf`, `hisob-faktura-${number || id}.pdf`),

  notifications: (params?: { limit?: number; offset?: number }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 50))
    query.set('offset', String(params?.offset ?? 0))
    return request<Notification[]>(`/notifications?${query.toString()}`)
  },

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
