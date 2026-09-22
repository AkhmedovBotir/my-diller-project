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
import { isProfileComplete } from '../../shared/profileComplete'
import type { RegisterInput, SmsChallenge, XaridorProfileResponse } from '../../shared/types'

function withProfileFlag(profile: XaridorProfileResponse): XaridorProfileResponse {
  return {
    ...profile,
    profile_complete: isProfileComplete(profile),
  }
}

interface AuthContextValue {
  user: XaridorProfileResponse | null
  loading: boolean
  startLogin: (username: string, password: string) => Promise<SmsChallenge>
  completeLogin: (challengeId: string, code: string) => Promise<XaridorProfileResponse>
  startRegister: (input: RegisterInput) => Promise<SmsChallenge>
  completeRegister: (challengeId: string, code: string) => Promise<XaridorProfileResponse>
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
      .then((profile) => setUser(withProfileFlag(profile)))
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
    const profile = withProfileFlag(await api.profile())
    setUser(profile)
    return profile
  }, [])

  const startRegister = useCallback(async (input: RegisterInput) => {
    return api.register(input)
  }, [])

  const completeRegister = useCallback(async (challengeId: string, code: string) => {
    const result = await api.verifyRegister(challengeId, code)
    tokenStorage.set(result.token)
    const profile = withProfileFlag(await api.profile())
    setUser(profile)
    return profile
  }, [])

  const logout = useCallback(() => {
    tokenStorage.remove()
    setUser(null)
  }, [])

  const applyUser = useCallback((next: XaridorProfileResponse) => {
    setUser(withProfileFlag(next))
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      startLogin,
      completeLogin,
      startRegister,
      completeRegister,
      logout,
      setUser: applyUser,
    }),
    [user, loading, startLogin, completeLogin, startRegister, completeRegister, logout, applyUser],
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
