import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Bell, BellRing, Check, CheckCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { useSnackbar } from '../../shared/Snackbar'
import type { Notification } from '../../shared/types'

export function NotificationsPage() {
  const { showSnackbar } = useSnackbar()
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [markingAll, setMarkingAll] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await api.notifications(100, 0))
    } catch (loadError) {
      const message = getErrorMessage(loadError)
      setError(message)
      showSnackbar(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [showSnackbar])

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(task)
  }, [load])

  async function handleMarkRead(id: number) {
    try {
      const updated = await api.markNotificationRead(id)
      setItems((current) => current.map((item) => (item.id === id ? updated : item)))
    } catch (markError) {
      showSnackbar(getErrorMessage(markError), 'error')
    }
  }

  async function handleMarkAll() {
    setMarkingAll(true)
    try {
      await api.markAllNotificationsRead()
      setItems((current) => current.map((item) => ({ ...item, is_read: true })))
      showSnackbar('Barcha bildirishnomalar o‘qilgan deb belgilandi')
    } catch (markError) {
      showSnackbar(getErrorMessage(markError), 'error')
    } finally {
      setMarkingAll(false)
    }
  }

  const unreadCount = items.filter((item) => !item.is_read).length

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Bildirishnomalar</h2>
          <p className="mt-1 text-xs text-slate-400">
            {unreadCount > 0 ? `${unreadCount} ta o‘qilmagan bildirishnoma` : 'Barcha bildirishnomalar o‘qilgan'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => void handleMarkAll()}
            disabled={markingAll}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#173c32] px-4 text-sm font-bold text-white disabled:opacity-60"
          >
            <CheckCheck size={16} />
            Barchasini o‘qilgan deb belgilash
          </button>
        )}
      </section>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : error ? (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center">
          <div>
            <AlertTriangle className="mx-auto mb-3 text-red-400" />
            <p className="text-sm font-semibold text-red-600">{error}</p>
            <button onClick={() => void load()} className="mt-4 text-xs font-bold text-[#397461]">
              Qayta urinish
            </button>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white py-20 text-center">
          <Bell className="mx-auto mb-3 text-slate-300" size={32} />
          <p className="text-sm text-slate-400">Hozircha bildirishnomalar yo‘q</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item, index) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className={`flex items-start gap-4 rounded-2xl border p-4 transition ${
                item.is_read ? 'border-slate-200/80 bg-white' : 'border-[#397461]/25 bg-[#eff8f3]'
              }`}
            >
              <div
                className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${
                  item.is_read ? 'bg-slate-100 text-slate-400' : 'bg-[#173c32] text-[#c9f560]'
                }`}
              >
                {item.is_read ? <Bell size={16} /> : <BellRing size={16} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-slate-800">{item.title}</p>
                  <span className="shrink-0 text-[11px] text-slate-400">{formatDateTime(item.created_at)}</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-500">{item.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {item.link && (
                    <Link to={resolveLink(item.link)} className="text-xs font-bold text-[#397461] hover:underline">
                      Ko‘rish
                    </Link>
                  )}
                  {!item.is_read && (
                    <button
                      onClick={() => void handleMarkRead(item.id)}
                      className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-700"
                    >
                      <Check size={13} />
                      O‘qilgan deb belgilash
                    </button>
                  )}
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  )
}

function resolveLink(link: string) {
  const match = link.match(/\/buyurtmalar\/(\d+)/)
  if (match) return `/orders/${match[1]}`
  return '/orders'
}
