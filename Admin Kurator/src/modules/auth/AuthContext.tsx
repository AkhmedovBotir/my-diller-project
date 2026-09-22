import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ApiRequestError, api, tokenStorage } from '../../shared/api'
import type { Admin, SmsChallenge } from '../../shared/types'

const ALLOWED_TYPES: Admin['type'][] = ['kurator', 'general']

interface AuthContextValue {
  user: Admin | null
  loading: boolean
  startLogin: (username: string, password: string) => Promise<SmsChallenge>
  completeLogin: (challengeId: string, code: string) => Promise<Admin>
  logout: () => void
  setUser: (user: Admin) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(Boolean(tokenStorage.get()))

  useEffect(() => {
    if (!tokenStorage.get()) return

    api.profile()
      .then((admin) => {
        if (!ALLOWED_TYPES.includes(admin.type)) {
          tokenStorage.remove()
          setUser(null)
          return
        }
        setUser(admin)
      })
      .catch(() => tokenStorage.remove())
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => setUser(null)
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  const startLogin = useCallback(async (username: string, password: string) => {
    return api.login(username, password)
  }, [])

  const completeLogin = useCallback(async (challengeId: string, code: string) => {
    const result = await api.verifyLogin(challengeId, code)
    if (!ALLOWED_TYPES.includes(result.admin.type)) {
      throw new ApiRequestError(
        'Bu kabinet faqat kurator xodimlari uchun mo‘ljallangan',
        403,
        'RUXSAT_YOQ',
      )
    }
    tokenStorage.set(result.token)
    setUser(result.admin)
    return result.admin
  }, [])

  const logout = useCallback(() => {
    tokenStorage.remove()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, startLogin, completeLogin, logout, setUser }),
    [user, loading, startLogin, completeLogin, logout],
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
