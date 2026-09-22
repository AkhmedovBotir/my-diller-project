import type {
  ApiError,
  BirgaOrder,
  DostavkaInput,
  LoginResponse,
  SmsChallenge,
  Notification,
  Order,
  OrderStatus,
  ProfileResponse,
  Region,
} from './types'

import { API_URL } from './config'
const TOKEN_KEY = 'mydiller_dostavka_token'
const LOGIN_PATH = '/dostavka/auth/login'

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
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  if (options.body) {
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
    request<SmsChallenge>(`/dostavka/auth/sms/resend?purpose=${purpose}`, {
      method: 'POST',
      body: JSON.stringify({ challenge_id: challengeId }),
    }),

  forgotPassword: (username: string) =>
    request<SmsChallenge>('/dostavka/auth/forgot', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  resetPassword: (challengeId: string, code: string, password: string) =>
    request<{ message: string }>('/dostavka/auth/reset', {
      method: 'POST',
      body: JSON.stringify({ challenge_id: challengeId, code, password }),
    }),

  profile: () => request<ProfileResponse>('/dostavka/profile'),

  updateProfile: (input: DostavkaInput) =>
    request<ProfileResponse>('/dostavka/profile', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  regions: (params?: { type?: 'region' | 'district' | 'mfy'; parent_id?: number; limit?: number }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 500))
    query.set('offset', '0')
    if (params?.type) query.set('type', params.type)
    if (params?.parent_id != null) query.set('parent_id', String(params.parent_id))
    return request<Region[]>(`/regions?${query.toString()}`)
  },

  region: (id: number) => request<Region>(`/regions/${id}`),

  orders: (params?: { status?: OrderStatus | ''; limit?: number; offset?: number }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 20))
    query.set('offset', String(params?.offset ?? 0))
    if (params?.status) query.set('status', params.status)
    return request<Order[]>(`/dostavka/buyurtmalar?${query.toString()}`)
  },

  order: (id: number) => request<Order>(`/dostavka/buyurtmalar/${id}`),

  pickupOrder: (id: number) =>
    request<Order>(`/dostavka/buyurtmalar/${id}/pickup`, { method: 'POST' }),

  deliverOrder: (id: number) =>
    request<Order>(`/dostavka/buyurtmalar/${id}/deliver`, { method: 'POST' }),

  birgaOrders: (params?: { limit?: number; offset?: number }) => {
    const query = new URLSearchParams()
    query.set('limit', String(params?.limit ?? 50))
    query.set('offset', String(params?.offset ?? 0))
    return request<BirgaOrder[]>(`/dostavka/birga-xarid/orders?${query.toString()}`)
  },

  birgaOrder: (id: number) => request<BirgaOrder>(`/dostavka/birga-xarid/orders/${id}`),

  claimBirgaOrder: (id: number) =>
    request<BirgaOrder>(`/dostavka/birga-xarid/orders/${id}/claim`, { method: 'POST' }),

  deliverBirgaOrder: (id: number, code: string) =>
    request<BirgaOrder>(`/dostavka/birga-xarid/orders/${id}/deliver`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

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
