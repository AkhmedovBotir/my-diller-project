import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, BellRing, CheckCheck, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../shared/api'
import { formatDateTime } from '../shared/date'
import { playNotificationBeep } from '../shared/notifSound'
import { useSnackbar } from '../shared/Snackbar'
import { useAuth } from '../modules/auth/AuthContext'
import type { Notification } from '../shared/types'

export function NotificationsBell() {
  const { admin } = useAuth()
  const { showSnackbar } = useSnackbar()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const previousUnreadRef = useRef<number | null>(null)

  const basePath = admin ? `/${admin.type}` : ''
  const unreadCount = useMemo(() => items.filter((item) => !item.is_read).length, [items])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const fetched = await api.notifications({ limit: 20 })
      setItems(fetched)
      const unread = fetched.filter((item) => !item.is_read).length
      if (previousUnreadRef.current !== null && unread > previousUnreadRef.current) {
        playNotificationBeep()
      }
      previousUnreadRef.current = unread
    } catch {
      // Silently ignore polling errors to avoid noisy toasts.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0)
    const interval = window.setInterval(() => void load(), 30000)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
    }
  }, [load])

  async function handleOpen() {
    setOpen((current) => !current)
    if (!open) await load()
  }

  async function markRead(notification: Notification) {
    if (notification.is_read) return
    try {
      const updated = await api.markNotificationRead(notification.id)
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
    }
  }

  async function markAllRead() {
    setMarkingAll(true)
    try {
      await api.markAllNotificationsRead()
      setItems((current) => current.map((item) => ({ ...item, is_read: true })))
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
    } finally {
      setMarkingAll(false)
    }
  }

  function resolveLink(link: string): string | null {
    if (!link) return null
    const orderMatch = link.match(/\/(admin|kurator)\/buyurtmalar\/(\d+)/)
    if (orderMatch) return `${basePath}/orders/${orderMatch[2]}`
    if (link.includes('/admin/komissiyalar')) return `${basePath}/commissions`
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={() => void handleOpen()}
        aria-expanded={open}
        aria-haspopup="menu"
        className="relative grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900"
      >
        {unreadCount > 0 ? <BellRing size={18} /> : <Bell size={18} />}
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-orange-500 text-[9px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              aria-label="Bildirishnomalarni yopish"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-30 cursor-default"
            />
            <motion.div
              role="menu"
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.16 }}
              className="absolute right-0 top-[calc(100%+10px)] z-40 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-bold text-slate-800">Bildirishnomalar</p>
                <button
                  onClick={() => void markAllRead()}
                  disabled={markingAll || unreadCount === 0}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#397461] disabled:opacity-40"
                >
                  {markingAll ? <LoaderCircle className="animate-spin" size={13} /> : <CheckCheck size={13} />}
                  Barchasini o‘qish
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="grid place-items-center p-8">
                    <LoaderCircle className="animate-spin text-slate-300" size={20} />
                  </div>
                ) : items.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">Bildirishnomalar yo‘q</div>
                ) : (
                  <ul>
                    {items.map((notification) => (
                      <li key={notification.id}>
                        <NotificationRow
                          notification={notification}
                          linkTo={resolveLink(notification.link)}
                          onRead={() => void markRead(notification)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function NotificationRow({
  notification,
  linkTo,
  onRead,
}: {
  notification: Notification
  linkTo: string | null
  onRead: () => void
}) {
  const content = (
    <div
      onClick={onRead}
      className={`flex cursor-pointer flex-col gap-1 border-b border-slate-50 px-4 py-3 transition last:border-0 hover:bg-slate-50 ${
        notification.is_read ? '' : 'bg-[#f6fbf8]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-slate-800">{notification.title}</p>
        {!notification.is_read && <span className="mt-1 size-1.5 shrink-0 rounded-full bg-orange-500" />}
      </div>
      <p className="text-xs leading-5 text-slate-500">{notification.body}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{formatDateTime(notification.created_at)}</p>
    </div>
  )

  if (linkTo) {
    return (
      <Link to={linkTo} onClick={onRead}>
        {content}
      </Link>
    )
  }

  return content
}
