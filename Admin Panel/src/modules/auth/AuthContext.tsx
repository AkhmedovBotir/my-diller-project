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
import type { Admin } from '../../shared/types'

interface AuthContextValue {
  admin: Admin | null
  loading: boolean
  login: (username: string, password: string) => Promise<Admin>
  logout: () => void
  setAdmin: (admin: Admin) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(Boolean(tokenStorage.get()))

  useEffect(() => {
    if (!tokenStorage.get()) return

    api.profile()
      .then(setAdmin)
      .catch(() => tokenStorage.remove())
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => setAdmin(null)
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const result = await api.login(username, password)
    tokenStorage.set(result.token)
    setAdmin(result.admin)
    return result.admin
  }, [])

  const logout = useCallback(() => {
    tokenStorage.remove()
    setAdmin(null)
  }, [])

  const value = useMemo(
    () => ({ admin, loading, login, logout, setAdmin }),
    [admin, loading, login, logout],
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
