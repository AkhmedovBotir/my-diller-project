import { motion } from 'framer-motion'
import { Bell, BellOff, BellRing, CheckCheck, LoaderCircle } from 'lucide-react'
import { formatDateTime } from '../../shared/date'
import { useNotifications } from './NotificationsContext'

export function NotificationsPage() {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications()

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Bildirishnomalar</h2>
          <p className="mt-1 text-xs text-slate-400">
            {unreadCount > 0 ? `${unreadCount} ta o‘qilmagan xabar` : 'Barcha xabarlar o‘qilgan'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => void markAllRead()}
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            <CheckCheck size={16} />
            Barchasini o‘qilgan qilish
          </button>
        )}
      </section>

      {loading && notifications.length === 0 ? (
        <div className="grid min-h-52 place-items-center rounded-2xl border border-slate-200/80 bg-white">
          <LoaderCircle className="animate-spin text-slate-300" size={28} />
        </div>
      ) : notifications.length === 0 ? (
        <div className="grid min-h-52 place-items-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center">
          <div>
            <BellOff className="mx-auto mb-3 text-slate-300" size={28} />
            <p className="text-sm font-semibold text-slate-500">Hozircha bildirishnoma yo‘q</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification, index) => (
            <motion.button
              key={notification.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.02, 0.3) }}
              onClick={() => !notification.is_read && void markRead(notification.id)}
              className={`flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition ${
                notification.is_read
                  ? 'border-slate-200/80 bg-white'
                  : 'border-[#397461]/20 bg-[#eff8f3]'
              }`}
            >
              <div
                className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                  notification.is_read ? 'bg-slate-100 text-slate-400' : 'bg-[#173c32] text-[#c9f560]'
                }`}
              >
                {notification.is_read ? <Bell size={18} /> : <BellRing size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-sm font-bold ${notification.is_read ? 'text-slate-600' : 'text-slate-900'}`}>
                    {notification.title}
                  </p>
                  {!notification.is_read && <span className="size-2 shrink-0 rounded-full bg-[#c9f560]" />}
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-500">{notification.body}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDateTime(notification.created_at)}</p>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}
