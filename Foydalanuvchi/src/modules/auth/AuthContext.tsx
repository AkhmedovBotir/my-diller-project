import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, tokenStorage } from '../../shared/api'
import type { RegisterInput, XaridorProfileResponse } from '../../shared/types'

interface AuthContextValue {
  user: XaridorProfileResponse | null
  loading: boolean
  login: (username: string, password: string) => Promise<XaridorProfileResponse>
  register: (input: RegisterInput) => Promise<XaridorProfileResponse>
  logout: () => void
  setUser: (user: XaridorProfileResponse) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<XaridorProfileResponse | null>(null)
  const [loading, setLoading] = useState(Boolean(tokenStorage.get()))

  useEffect(() => {
    if (!tokenStorage.get()) return

    api.profile()
      .then(setUser)
      .catch(() => tokenStorage.remove())
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => setUser(null)
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const result = await api.login(username, password)
    tokenStorage.set(result.token)
    const profile = await api.profile()
    setUser(profile)
    return profile
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    const result = await api.register(input)
    tokenStorage.set(result.token)
    const profile = await api.profile()
    setUser(profile)
    return profile
  }, [])

  const logout = useCallback(() => {
    tokenStorage.remove()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, setUser }),
    [user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// The provider and its hook intentionally live together as one auth module.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
