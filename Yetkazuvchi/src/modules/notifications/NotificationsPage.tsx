import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, BellRing, CheckCheck, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { useSnackbar } from '../../shared/Snackbar'
import type { Notification } from '../../shared/types'

export function NotificationsPage() {
  const { showSnackbar } = useSnackbar()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .notifications({ limit: 100 })
      .then((items) => {
        if (!cancelled) setNotifications(items)
      })
      .catch((error) => {
        if (!cancelled) showSnackbar(getErrorMessage(error), 'error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const unreadCount = notifications.filter((item) => !item.is_read).length

  async function handleMarkRead(id: number) {
    try {
      const updated = await api.markNotificationRead(id)
      setNotifications((current) => current.map((item) => (item.id === id ? updated : item)))
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true)
    try {
      await api.markAllNotificationsRead()
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
      showSnackbar('Barcha bildirishnomalar o‘qilgan deb belgilandi')
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Bildirishnomalar</h2>
          <p className="mt-1 text-sm text-slate-400">
            {unreadCount > 0 ? `${unreadCount} ta o‘qilmagan bildirishnoma` : 'Barcha bildirishnomalar o‘qilgan'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {markingAll ? <LoaderCircle className="animate-spin" size={15} /> : <CheckCheck size={15} />}
            Barchasini o‘qilgan deb belgilash
          </button>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
            <LoaderCircle className="animate-spin" size={18} />
            Yuklanmoqda...
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-slate-50 text-slate-300">
              <Bell size={26} />
            </div>
            <p className="text-sm font-semibold text-slate-500">Bildirishnomalar yo‘q</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((notification, index) => {
              const content = (
                <div className="flex items-start gap-4 p-5 sm:px-6">
                  <div
                    className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                      notification.is_read ? 'bg-slate-100 text-slate-400' : 'bg-[#eff8f3] text-[#397461]'
                    }`}
                  >
                    {notification.is_read ? <Bell size={18} /> : <BellRing size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-sm font-bold ${notification.is_read ? 'text-slate-600' : 'text-slate-900'}`}>
                        {notification.title}
                      </p>
                      {!notification.is_read && <span className="size-1.5 rounded-full bg-[#c9f560]" />}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{notification.body}</p>
                    <p className="mt-2 text-xs text-slate-400">{formatDateTime(notification.created_at)}</p>
                  </div>
                  {!notification.is_read && (
                    <button
                      onClick={(event) => {
                        event.preventDefault()
                        handleMarkRead(notification.id)
                      }}
                      className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                    >
                      O‘qildi
                    </button>
                  )}
                </div>
              )
              return (
                <motion.li
                  key={notification.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  {notification.link ? (
                    <Link
                      to={notification.link}
                      onClick={() => {
                        if (!notification.is_read) handleMarkRead(notification.id)
                      }}
                      className="block transition hover:bg-slate-50/70"
                    >
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </motion.li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
