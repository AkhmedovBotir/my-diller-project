import type {
  ApiError,
  Category,
  Commission,
  Ishlabchiqaruvchi,
  IshlabchiqaruvchiInput,
  LoginResponse,
  Notification,
  Order,
  OrderStatus,
  Product,
  ProductCreateInput,
  ProductStatus,
  ProductUpdateInput,
  Subcategory,
} from './types'

import { API_URL } from './config'
const TOKEN_KEY = 'mydiller_ishlabchiqaruvchi_token'
const LOGIN_PATH = '/ishlabchiqaruvchi/auth/login'

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

function descriptionPayload(description: ProductCreateInput['description']) {
  return typeof description === 'string' ? description : JSON.stringify(description)
}

function toProductFormData(input: ProductCreateInput | ProductUpdateInput) {
  const form = new FormData()
  form.set('name', input.name)
  form.set('description', descriptionPayload(input.description))
  form.set('category_id', String(input.category_id))
  form.set('subcategory_id', String(input.subcategory_id))
  form.set('price', String(input.price))
  form.set('quantity', String(input.quantity))
  form.set('moq', String(input.moq))
  form.set('payment_term', input.payment_term)
  form.set('payment_days', String(input.payment_days))
  form.set('specs', JSON.stringify(input.specs ?? {}))
  if (input.images?.length) {
    for (const file of input.images) form.append('images', file)
  }
  return form
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

  profile: () => request<Ishlabchiqaruvchi>('/ishlabchiqaruvchi/profile'),

  updateProfile: (input: IshlabchiqaruvchiInput) =>
    request<Ishlabchiqaruvchi>('/ishlabchiqaruvchi/profile', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  categories: (limit = 100, offset = 0) =>
    request<Category[]>(`/categories?limit=${limit}&offset=${offset}`),

  subcategories: (params?: { category_id?: number; limit?: number; offset?: number }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 100))
    query.set('offset', String(params?.offset ?? 0))
    if (params?.category_id != null) query.set('category_id', String(params.category_id))
    return request<Subcategory[]>(`/subcategories?${query.toString()}`)
  },

  products: (params?: { status?: ProductStatus; limit?: number; offset?: number }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 20))
    query.set('offset', String(params?.offset ?? 0))
    if (params?.status) query.set('status', params.status)
    return request<Product[]>(`/ishlabchiqaruvchi/products?${query.toString()}`)
  },

  product: (id: number) => request<Product>(`/ishlabchiqaruvchi/products/${id}`),

  createProduct: (input: ProductCreateInput) =>
    request<Product>('/ishlabchiqaruvchi/products', {
      method: 'POST',
      body: toProductFormData(input),
    }),

  updateProduct: (id: number, input: ProductUpdateInput) => {
    if (input.images?.length) {
      return request<Product>(`/ishlabchiqaruvchi/products/${id}`, {
        method: 'PUT',
        body: toProductFormData(input),
      })
    }

    return request<Product>(`/ishlabchiqaruvchi/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: input.name,
        description: input.description,
        category_id: input.category_id,
        subcategory_id: input.subcategory_id,
        price: input.price,
        quantity: input.quantity,
        moq: input.moq,
        payment_term: input.payment_term,
        payment_days: input.payment_days,
        specs: input.specs ?? {},
      }),
    })
  },

  resubmitProduct: (id: number) =>
    request<Product>(`/ishlabchiqaruvchi/products/${id}/resubmit`, { method: 'POST' }),

  deleteProduct: (id: number) =>
    request<void>(`/ishlabchiqaruvchi/products/${id}`, { method: 'DELETE' }),

  orders: (params?: { status?: OrderStatus; limit?: number; offset?: number }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 20))
    query.set('offset', String(params?.offset ?? 0))
    if (params?.status) query.set('status', params.status)
    return request<Order[]>(`/ishlabchiqaruvchi/buyurtmalar?${query.toString()}`)
  },

  order: (id: number) => request<Order>(`/ishlabchiqaruvchi/buyurtmalar/${id}`),

  acceptOrder: (id: number) =>
    request<Order>(`/ishlabchiqaruvchi/buyurtmalar/${id}/accept`, { method: 'POST' }),

  readyOrder: (id: number) =>
    request<Order>(`/ishlabchiqaruvchi/buyurtmalar/${id}/ready`, { method: 'POST' }),

  shipOrder: (id: number) =>
    request<Order>(`/ishlabchiqaruvchi/buyurtmalar/${id}/ship`, { method: 'POST' }),

  confirmOrderPayment: (id: number) =>
    request<Order>(`/ishlabchiqaruvchi/buyurtmalar/${id}/confirm-payment`, { method: 'POST' }),

  confirmAdvance: (id: number) =>
    request<Order>(`/ishlabchiqaruvchi/buyurtmalar/${id}/confirm-advance`, { method: 'POST' }),

  downloadContractPdf: (id: number, number?: string) =>
    downloadFile(`/ishlabchiqaruvchi/buyurtmalar/${id}/contract.pdf`, `shartnoma-${number || id}.pdf`),

  downloadInvoicePdf: (id: number, number?: string) =>
    downloadFile(`/ishlabchiqaruvchi/buyurtmalar/${id}/invoice.pdf`, `hisob-faktura-${number || id}.pdf`),

  commissions: (params?: { limit?: number; offset?: number }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 20))
    query.set('offset', String(params?.offset ?? 0))
    return request<Commission[]>(`/ishlabchiqaruvchi/komissiyalar?${query.toString()}`)
  },

  uploadCommissionReceipt: (id: number, file: File) => {
    const form = new FormData()
    form.set('receipt', file)
    return request<Commission>(`/ishlabchiqaruvchi/komissiyalar/${id}/upload-receipt`, {
      method: 'POST',
      body: form,
    })
  },

  markCommissionPaid: (id: number) =>
    request<Commission>(`/ishlabchiqaruvchi/komissiyalar/${id}/mark-paid`, { method: 'POST' }),

  notifications: (params?: { limit?: number; offset?: number }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 20))
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
