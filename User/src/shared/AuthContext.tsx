import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, ApiRequestError, tokenStorage } from './api'
import type { Customer, ProfileInput } from './types'

type AuthContextValue = {
  customer: Customer | null
  loading: boolean
  cartCount: number
  refreshCartCount: () => Promise<void>
  refreshMe: () => Promise<Customer | null>
  setSession: (token: string, customer: Customer) => void
  updateProfile: (input: ProfileInput) => Promise<Customer>
  logout: () => void
  requireAuth: (onReady?: (customer: Customer) => void) => void
  authOpen: boolean
  closeAuth: () => void
  authIntent: ((customer: Customer) => void) | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [cartCount, setCartCount] = useState(0)
  const [authOpen, setAuthOpen] = useState(false)
  const [authIntent, setAuthIntent] = useState<((customer: Customer) => void) | null>(null)

  const refreshCartCount = useCallback(async () => {
    if (!tokenStorage.get()) {
      setCartCount(0)
      return
    }
    try {
      const items = await api.cart()
      setCartCount(items.reduce((sum, item) => sum + (item.quantity || 0), 0))
    } catch {
      setCartCount(0)
    }
  }, [])

  const refreshMe = useCallback(async () => {
    if (!tokenStorage.get()) {
      setCustomer(null)
      setCartCount(0)
      return null
    }
    try {
      const me = await api.me()
      setCustomer(me)
      void refreshCartCount()
      return me
    } catch (error) {
      if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
        tokenStorage.remove()
        setCustomer(null)
        setCartCount(0)
      }
      return null
    }
  }, [refreshCartCount])

  useEffect(() => {
    void (async () => {
      await refreshMe()
      setLoading(false)
    })()
  }, [refreshMe])

  const setSession = useCallback(
    (token: string, next: Customer) => {
      tokenStorage.set(token)
      setCustomer(next)
      void refreshCartCount()
    },
    [refreshCartCount],
  )

  const updateProfile = useCallback(async (input: ProfileInput) => {
    const next = await api.updateMe(input)
    setCustomer(next)
    return next
  }, [])

  const logout = useCallback(() => {
    tokenStorage.remove()
    setCustomer(null)
    setCartCount(0)
  }, [])

  const closeAuth = useCallback(() => {
    setAuthOpen(false)
    setAuthIntent(null)
  }, [])

  const requireAuth = useCallback(
    (onReady?: (customer: Customer) => void) => {
      if (customer?.profile_completed) {
        onReady?.(customer)
        return
      }
      if (customer && !customer.profile_completed) {
        setAuthIntent(() => onReady ?? null)
        setAuthOpen(true)
        return
      }
      setAuthIntent(() => onReady ?? null)
      setAuthOpen(true)
    },
    [customer],
  )

  const value = useMemo(
    () => ({
      customer,
      loading,
      cartCount,
      refreshCartCount,
      refreshMe,
      setSession,
      updateProfile,
      logout,
      requireAuth,
      authOpen,
      closeAuth,
      authIntent,
    }),
    [
      customer,
      loading,
      cartCount,
      refreshCartCount,
      refreshMe,
      setSession,
      updateProfile,
      logout,
      requireAuth,
      authOpen,
      closeAuth,
      authIntent,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth AuthProvider ichida ishlatilishi kerak')
  return ctx
}
