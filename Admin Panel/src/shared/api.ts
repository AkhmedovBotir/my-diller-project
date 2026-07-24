import type {
  Admin,
  AdminInput,
  ApiError,
  Category,
  CategoryInput,
  Commission,
  Debt,
  Dostavka,
  DostavkaInput,
  ForsMajorAlert,
  Ishlabchiqaruvchi,
  IshlabchiqaruvchiInput,
  LoginResponse,
  Notification,
  Order,
  OrderStatus,
  PlatformSettings,
  Product,
  ProductStatus,
  ProductUpdateInput,
  Subcategory,
  SubcategoryInput,
  UpdatePlatformSettingsInput,
  Xaridor,
  XaridorInput,
} from './types'
import { API_URL } from './config'

const TOKEN_KEY = 'mydiller_admin_token'

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

  if (options.headers) {
    const extra = new Headers(options.headers)
    extra.forEach((value, key) => {
      headers[key] = value
    })
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
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
    if (response.status === 401 && path !== '/admin/auth/login') {
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
    request<LoginResponse>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  profile: () => request<Admin>('/admin/profile'),

  updateProfile: (input: Omit<AdminInput, 'type'>) =>
    request<Admin>('/admin/profile', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  admins: (limit = 20, offset = 0) =>
    request<Admin[]>(`/admin/admins?limit=${limit}&offset=${offset}`),

  admin: (id: number) => request<Admin>(`/admin/admins/${id}`),

  createAdmin: (input: AdminInput) =>
    request<Admin>('/admin/admins', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateAdmin: (id: number, input: AdminInput) =>
    request<Admin>(`/admin/admins/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  deleteAdmin: (id: number) =>
    request<void>(`/admin/admins/${id}`, { method: 'DELETE' }),

  ishlabchiqaruvchilar: (limit = 20, offset = 0) =>
    request<Ishlabchiqaruvchi[]>(`/ishlabchiqaruvchilar?limit=${limit}&offset=${offset}`),

  ishlabchiqaruvchi: (id: number) =>
    request<Ishlabchiqaruvchi>(`/ishlabchiqaruvchilar/${id}`),

  createIshlabchiqaruvchi: (input: IshlabchiqaruvchiInput) =>
    request<Ishlabchiqaruvchi>('/ishlabchiqaruvchilar', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateIshlabchiqaruvchi: (id: number, input: IshlabchiqaruvchiInput) =>
    request<Ishlabchiqaruvchi>(`/ishlabchiqaruvchilar/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  deleteIshlabchiqaruvchi: (id: number) =>
    request<void>(`/ishlabchiqaruvchilar/${id}`, { method: 'DELETE' }),

  categories: (limit = 50, offset = 0) =>
    request<Category[]>(`/categories?limit=${limit}&offset=${offset}`),

  category: (id: number) => request<Category>(`/categories/${id}`),

  createCategory: (input: CategoryInput) =>
    request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateCategory: (id: number, input: CategoryInput) =>
    request<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  deleteCategory: (id: number) =>
    request<void>(`/categories/${id}`, { method: 'DELETE' }),

  subcategories: (params?: { category_id?: number; limit?: number; offset?: number }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 50))
    query.set('offset', String(params?.offset ?? 0))
    if (params?.category_id != null) query.set('category_id', String(params.category_id))
    return request<Subcategory[]>(`/subcategories?${query.toString()}`)
  },

  subcategory: (id: number) => request<Subcategory>(`/subcategories/${id}`),

  createSubcategory: (input: SubcategoryInput) =>
    request<Subcategory>('/subcategories', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateSubcategory: (id: number, input: SubcategoryInput) =>
    request<Subcategory>(`/subcategories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  deleteSubcategory: (id: number) =>
    request<void>(`/subcategories/${id}`, { method: 'DELETE' }),

  products: (params?: { status?: ProductStatus; limit?: number; offset?: number }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 20))
    query.set('offset', String(params?.offset ?? 0))
    if (params?.status) query.set('status', params.status)
    return request<Product[]>(`/admin/products?${query.toString()}`)
  },

  product: (id: number) => request<Product>(`/admin/products/${id}`),

  approveProduct: (id: number) =>
    request<Product>(`/admin/products/${id}/approve`, { method: 'POST' }),

  rejectProduct: (id: number, note: string) =>
    request<Product>(`/admin/products/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),

  updateProduct: (id: number, input: ProductUpdateInput) => {
    if (input.images?.length) {
      const form = new FormData()
      form.set('name', input.name)
      form.set(
        'description',
        typeof input.description === 'string' ? input.description : JSON.stringify(input.description),
      )
      form.set('category_id', String(input.category_id))
      form.set('subcategory_id', String(input.subcategory_id))
      form.set('price', String(input.price))
      form.set('quantity', String(input.quantity))
      for (const file of input.images) form.append('images', file)
      return request<Product>(`/admin/products/${id}`, { method: 'PUT', body: form })
    }

    return request<Product>(`/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: input.name,
        description: input.description,
        category_id: input.category_id,
        subcategory_id: input.subcategory_id,
        price: input.price,
        quantity: input.quantity,
      }),
    })
  },

  deleteProduct: (id: number) =>
    request<void>(`/admin/products/${id}`, { method: 'DELETE' }),

  orders: (params?: { status?: OrderStatus; limit?: number; offset?: number }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 20))
    query.set('offset', String(params?.offset ?? 0))
    if (params?.status) query.set('status', params.status)
    return request<Order[]>(`/admin/buyurtmalar?${query.toString()}`)
  },

  order: (id: number) => request<Order>(`/admin/buyurtmalar/${id}`),

  guaranteeOrder: (id: number) =>
    request<Order>(`/admin/buyurtmalar/${id}/guarantee`, { method: 'POST' }),

  downloadContractPdf: (id: number, number?: string) =>
    downloadFile(`/admin/buyurtmalar/${id}/contract.pdf`, `shartnoma-${number || id}.pdf`),

  downloadInvoicePdf: (id: number, number?: string) =>
    downloadFile(`/admin/buyurtmalar/${id}/invoice.pdf`, `hisob-faktura-${number || id}.pdf`),

  // ---- Qarzlar (debt registry) ----
  debts: () => request<Debt[]>('/admin/qarzlar'),

  collectDebt: (id: number) =>
    request<Debt>(`/admin/qarzlar/${id}/collect`, { method: 'POST' }),

  writeOffDebt: (id: number) =>
    request<Debt>(`/admin/qarzlar/${id}/write-off`, { method: 'POST' }),

  // ---- Fors-major ogohlantirishi ----
  forsMajorAlert: () => request<ForsMajorAlert>('/admin/alerts/fors-major'),

  komissiyalar: (params?: { status?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 20))
    query.set('offset', String(params?.offset ?? 0))
    if (params?.status) query.set('status', params.status)
    return request<Commission[]>(`/admin/komissiyalar?${query.toString()}`)
  },

  confirmCommissionPaid: (id: number) =>
    request<Commission>(`/admin/komissiyalar/${id}/confirm-paid`, { method: 'POST' }),

  platformSettings: () => request<PlatformSettings>('/admin/platform-settings'),

  updatePlatformSettings: (input: UpdatePlatformSettingsInput) =>
    request<PlatformSettings>('/admin/platform-settings', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  xaridorlar: (limit = 20, offset = 0) =>
    request<Xaridor[]>(`/xaridorlar?limit=${limit}&offset=${offset}`),

  xaridor: (id: number) => request<Xaridor>(`/xaridorlar/${id}`),

  createXaridor: (input: XaridorInput) =>
    request<Xaridor>('/xaridorlar', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateXaridor: (id: number, input: XaridorInput) =>
    request<Xaridor>(`/xaridorlar/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  deleteXaridor: (id: number) => request<void>(`/xaridorlar/${id}`, { method: 'DELETE' }),

  blockXaridor: (id: number, reason: string) =>
    request<Xaridor>(`/xaridorlar/${id}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  unblockXaridor: (id: number) =>
    request<Xaridor>(`/xaridorlar/${id}/unblock`, { method: 'POST' }),

  dostavkaKompaniyalari: (limit = 20, offset = 0) =>
    request<Dostavka[]>(`/dostavka-kompaniyalari?limit=${limit}&offset=${offset}`),

  dostavkaKompaniyasi: (id: number) => request<Dostavka>(`/dostavka-kompaniyalari/${id}`),

  createDostavkaKompaniyasi: (input: DostavkaInput) =>
    request<Dostavka>('/dostavka-kompaniyalari', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateDostavkaKompaniyasi: (id: number, input: DostavkaInput) =>
    request<Dostavka>(`/dostavka-kompaniyalari/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  deleteDostavkaKompaniyasi: (id: number) =>
    request<void>(`/dostavka-kompaniyalari/${id}`, { method: 'DELETE' }),

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
