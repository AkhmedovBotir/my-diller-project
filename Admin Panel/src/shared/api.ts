import type {
  Admin,
  AdminInput,
  ApiError,
  BirgaCategory,
  BirgaCategoryInput,
  BirgaCustomer,
  BirgaCustomerInput,
  BirgaFinanceAccrual,
  BirgaFinanceStats,
  BirgaOrder,
  BirgaOrderStatus,
  BirgaSettings,
  BirgaSettingsInput,
  BirgaGroupBuy,
  BirgaGroupBuyInput,
  BirgaGroupBuyStatus,
  BirgaProduct,
  BirgaProductInput,
  BirgaSubcategory,
  BirgaSubcategoryInput,
  Category,
  CategoryInput,
  Commission,
  Debt,
  Dostavka,
  DostavkaInput,
  ForsMajorAlert,
  Ishlabchiqaruvchi,
  IshlabchiqaruvchiInput,
  KuratorTolovSorovi,
  KuratorTolovStatus,
  LoginResponse,
  SmsChallenge,
  Notification,
  Order,
  OrderStatus,
  PlatformSettings,
  Product,
  ProductStatus,
  ProductUpdateInput,
  Region,
  RegionImportResult,
  RegionInput,
  RegionType,
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
    request<SmsChallenge>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  verifyLogin: (challengeId: string, code: string) =>
    request<LoginResponse>('/admin/auth/login/verify', {
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

  profile: () => request<Admin>('/admin/profile'),

  updateProfile: (input: Omit<AdminInput, 'type'>) =>
    request<Admin>('/admin/profile', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  admins: (limit = 20, offset = 0, type?: string) => {
    const query = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (type) query.set('type', type)
    return request<Admin[]>(`/admin/admins?${query.toString()}`)
  },

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

  regions: (params?: { type?: RegionType; parent_id?: number; status?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 500))
    query.set('offset', String(params?.offset ?? 0))
    if (params?.type) query.set('type', params.type)
    if (params?.parent_id != null) query.set('parent_id', String(params.parent_id))
    if (params?.status) query.set('status', params.status)
    return request<Region[]>(`/admin/regions?${query.toString()}`)
  },

  region: (id: number) => request<Region>(`/admin/regions/${id}`),

  createRegion: (input: RegionInput) =>
    request<Region>('/admin/regions', { method: 'POST', body: JSON.stringify(input) }),

  updateRegion: (id: number, input: RegionInput) =>
    request<Region>(`/admin/regions/${id}`, { method: 'PUT', body: JSON.stringify(input) }),

  deleteRegion: (id: number) => request<void>(`/admin/regions/${id}`, { method: 'DELETE' }),

  importRegions: () =>
    request<RegionImportResult>('/admin/regions/import', { method: 'POST' }),

  kuratorMfys: (kuratorId: number) =>
    request<Region[]>(`/admin/kuratorlar/${kuratorId}/mfys`),

  setKuratorMfys: (kuratorId: number, mfy_ids: number[]) =>
    request<Region[]>(`/admin/kuratorlar/${kuratorId}/mfys`, {
      method: 'PUT',
      body: JSON.stringify({ mfy_ids }),
    }),

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
      form.set('code', input.code)
      form.set('name', input.name)
      form.set('city', input.city)
      form.set(
        'description',
        typeof input.description === 'string' ? input.description : JSON.stringify(input.description),
      )
      form.set('category_id', String(input.category_id))
      form.set('subcategory_id', String(input.subcategory_id))
      form.set('price', String(input.price))
      form.set('quantity', String(input.quantity))
      form.set('moq', String(input.moq))
      form.set('payment_term', input.payment_term)
      form.set('payment_days', String(input.payment_days))
      for (const file of input.images) form.append('images', file)
      return request<Product>(`/admin/products/${id}`, { method: 'PUT', body: form })
    }

    return request<Product>(`/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        code: input.code,
        name: input.name,
        city: input.city,
        description: input.description,
        category_id: input.category_id,
        subcategory_id: input.subcategory_id,
        price: input.price,
        quantity: input.quantity,
        moq: input.moq,
        payment_term: input.payment_term,
        payment_days: input.payment_days,
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

  rejectCommission: (id: number, note?: string) =>
    request<Commission>(`/admin/komissiyalar/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ note: note || '' }),
    }),

  // ---- Kurator kartaga pul yechish so'rovlari ----
  kuratorTolovSorovlari: (params?: { status?: KuratorTolovStatus | ''; limit?: number; offset?: number }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 50))
    query.set('offset', String(params?.offset ?? 0))
    if (params?.status) query.set('status', params.status)
    return request<KuratorTolovSorovi[]>(`/admin/kurator-tolov-sorovlari?${query.toString()}`)
  },

  payKuratorTolovSorov: (id: number) =>
    request<KuratorTolovSorovi>(`/admin/kurator-tolov-sorovlari/${id}/pay`, { method: 'POST' }),

  rejectKuratorTolovSorov: (id: number, note?: string) =>
    request<KuratorTolovSorovi>(`/admin/kurator-tolov-sorovlari/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ admin_note: note || '' }),
    }),

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

  birgaSettings: () => request<BirgaSettings>('/birga-xarid/settings'),

  updateBirgaSettings: (input: Partial<BirgaSettingsInput> & { min_order_amount: number }) =>
    request<BirgaSettings>('/birga-xarid/settings', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  birgaFinanceStats: () => request<BirgaFinanceStats>('/birga-xarid/finance/stats'),

  birgaFinanceAccruals: (params?: {
    role?: 'courier' | 'kurator' | ''
    paid?: boolean
    limit?: number
    offset?: number
  }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 50))
    query.set('offset', String(params?.offset ?? 0))
    if (params?.role) query.set('role', params.role)
    if (params?.paid !== undefined) query.set('paid', String(params.paid))
    return request<BirgaFinanceAccrual[]>(`/birga-xarid/finance/accruals?${query}`)
  },

  birgaPayCourier: (ids: number[]) =>
    request<{ updated: number }>('/birga-xarid/finance/pay/courier', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  birgaPayKurator: (ids: number[]) =>
    request<{ updated: number }>('/birga-xarid/finance/pay/kurator', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

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
