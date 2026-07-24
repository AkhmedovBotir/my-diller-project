import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../../shared/api'
import { playNotificationBeep } from '../../shared/notifSound'
import type { Notification } from '../../shared/types'
import { useAuth } from '../auth/AuthContext'

interface NotificationsContextValue {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  refresh: () => Promise<void>
  markRead: (id: number) => Promise<void>
  markAllRead: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const previousUnreadRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const items = await api.notifications({ limit: 50 })
      setNotifications(items)
      const unread = items.filter((item) => !item.is_read).length
      if (previousUnreadRef.current !== null && unread > previousUnreadRef.current) {
        playNotificationBeep()
      }
      previousUnreadRef.current = unread
    } catch {
      // Silently ignore — badge just stays at its previous value.
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    const task = window.setTimeout(() => {
      if (!user) {
        setNotifications([])
        return
      }
      void refresh()
    }, 0)
    const interval = user ? window.setInterval(() => void refresh(), 30_000) : undefined
    return () => {
      window.clearTimeout(task)
      if (interval) window.clearInterval(interval)
    }
  }, [user, refresh])

  const markRead = useCallback(async (id: number) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, is_read: true } : item)),
    )
    try {
      await api.markNotificationRead(id)
    } catch {
      // Best effort — a background refresh will reconcile state.
    }
  }, [])

  const markAllRead = useCallback(async () => {
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
    try {
      await api.markAllNotificationsRead()
    } catch {
      // Best effort — a background refresh will reconcile state.
    }
  }, [])

  const unreadCount = notifications.filter((item) => !item.is_read).length

  const value = useMemo(
    () => ({ notifications, unreadCount, loading, refresh, markRead, markAllRead }),
    [notifications, unreadCount, loading, refresh, markRead, markAllRead],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const value = useContext(NotificationsContext)
  if (!value) throw new Error('useNotifications must be used inside NotificationsProvider')
  return value
}
