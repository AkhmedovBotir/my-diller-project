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
import type { Ishlabchiqaruvchi } from '../../shared/types'

interface AuthContextValue {
  user: Ishlabchiqaruvchi | null
  loading: boolean
  login: (username: string, password: string) => Promise<Ishlabchiqaruvchi>
  logout: () => void
  setUser: (user: Ishlabchiqaruvchi) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Ishlabchiqaruvchi | null>(null)
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
    setUser(result.ishlabchiqaruvchi)
    return result.ishlabchiqaruvchi
  }, [])

  const logout = useCallback(() => {
    tokenStorage.remove()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout, setUser }),
    [user, loading, login, logout],
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
