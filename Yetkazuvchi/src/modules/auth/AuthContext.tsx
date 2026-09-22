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
import type { ProfileResponse, SmsChallenge } from '../../shared/types'

interface AuthContextValue {
  user: ProfileResponse | null
  loading: boolean
  startLogin: (username: string, password: string) => Promise<SmsChallenge>
  completeLogin: (challengeId: string, code: string) => Promise<ProfileResponse>
  logout: () => void
  setUser: (user: ProfileResponse) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ProfileResponse | null>(null)
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

  const startLogin = useCallback(async (username: string, password: string) => {
    return api.login(username, password)
  }, [])

  const completeLogin = useCallback(async (challengeId: string, code: string) => {
    const result = await api.verifyLogin(challengeId, code)
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
