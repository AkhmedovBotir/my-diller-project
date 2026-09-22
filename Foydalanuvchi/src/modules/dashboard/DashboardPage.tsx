import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  ClipboardList,
  LayoutGrid,
  PackageSearch,
  ShoppingCart,
  Sparkles,
  Timer,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../../shared/api'
import { formatLongDate } from '../../shared/date'
import { formatPrice, orderStatusLabel, orderStatusStyle } from '../../shared/format'
import { formatCountdown, useCountdown } from '../../shared/useCountdown'
import type { Order } from '../../shared/types'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'
import { useNotifications } from '../notifications/NotificationsContext'

const ACTIVE_STATUSES = new Set([
  'yangi',
  'qabul_qilindi',
  'logistikaga_uzatildi',
  'yolda',
  'yetkazildi_tolov_kutilmoqda',
])

export function DashboardPage() {
  const { user } = useAuth()
  const { itemCount } = useCart()
  const { unreadCount } = useNotifications()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api.orders({ limit: 50 })
      .then((items) => {
        if (active) setOrders(items)
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (!user) return null

  const activeOrders = orders.filter((order) => ACTIVE_STATUSES.has(order.status))
  const awaitingPayment = orders.filter(
    (order) => order.status === 'yetkazildi_tolov_kutilmoqda' && order.payment_deadline_at,
  )
  const now = new Date()
  const formattedDate = formatLongDate(now)

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-[#173c32] px-6 py-8 text-white sm:px-9 sm:py-10">
        <div className="absolute -right-14 -top-20 size-72 rounded-full border border-white/8" />
        <div className="absolute -right-2 -top-3 size-40 rounded-full border border-white/8" />
        <div className="absolute bottom-0 right-1/4 h-1/2 w-1/3 bg-[#c9f560]/5 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-[#c9f560]">
              <Sparkles size={13} />
              Xaridor kabineti
            </div>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Assalomu alaykum, {user.first_name || user.shop_name}!
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/60">
              {user.shop_name} do‘koni uchun katalogdan mahsulot tanlang va buyurtmalaringizni shu yerdan kuzating.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-50/55">
            <CalendarDays size={16} className="text-[#c9f560]" />
            <span className="capitalize">{formattedDate}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Faol buyurtmalar', value: String(activeOrders.length), icon: ClipboardList, tone: 'green' },
          { label: 'Savatdagi mahsulot', value: String(itemCount), icon: ShoppingCart, tone: 'lime' },
          { label: 'To‘lov kutilmoqda', value: String(awaitingPayment.length), icon: Timer, tone: 'orange' },
          { label: 'O‘qilmagan xabar', value: String(unreadCount), icon: Bell, tone: 'blue' },
        ].map((item, index) => (
          <motion.article
            key={item.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="rounded-2xl border border-slate-200/80 bg-white p-5"
          >
            <div className="mb-6 flex items-start justify-between">
              <div className={`stat-icon stat-icon-${item.tone}`}><item.icon size={19} /></div>
              <ArrowUpRight size={16} className="text-slate-300" />
            </div>
            <p className="text-xs font-medium text-slate-400">{item.label}</p>
            <p className="mt-1 truncate text-lg font-bold tracking-tight text-slate-800">{item.value}</p>
          </motion.article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <article className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">Faol buyurtmalar</h3>
              <p className="mt-1 text-xs text-slate-400">To‘lov muddati yaqinlashayotgan buyurtmalar birinchi</p>
            </div>
            <Link to="/orders" className="text-xs font-bold text-[#397461] hover:underline">
              Barchasi
            </Link>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-16 rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : activeOrders.length === 0 ? (
            <div className="grid min-h-40 place-items-center text-center">
              <div>
                <PackageSearch className="mx-auto mb-3 text-slate-300" size={28} />
                <p className="text-sm font-semibold text-slate-500">Hozircha faol buyurtma yo‘q</p>
                <Link to="/catalog" className="mt-3 inline-block text-xs font-bold text-[#397461] hover:underline">
                  Katalogni ko‘rish
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {activeOrders.slice(0, 5).map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <h3 className="font-bold text-slate-900">Tezkor amallar</h3>
          <div className="mt-5 space-y-3">
            <QuickLink to="/catalog" icon={LayoutGrid} title="Katalog" subtitle="Mahsulotlarni ko‘rish" />
            <QuickLink to="/cart" icon={ShoppingCart} title="Savat" subtitle="Buyurtma berish" />
            <QuickLink to="/orders" icon={ClipboardList} title="Buyurtmalar" subtitle="Holatni kuzatish" />
          </div>
        </article>
      </section>
    </div>
  )
}

function QuickLink({
  to,
  icon: Icon,
  title,
  subtitle,
}: {
  to: string
  icon: typeof LayoutGrid
  title: string
  subtitle: string
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-[#397461]/20 hover:bg-[#eff8f3]"
    >
      <div className="grid size-11 place-items-center rounded-xl bg-[#173c32] text-[#c9f560]">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800">{title}</p>
        <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
      </div>
      <ArrowUpRight size={17} className="ml-auto text-slate-300 transition group-hover:text-[#397461]" />
    </Link>
  )
}

function OrderRow({ order }: { order: Order }) {
  const countdown = useCountdown(order.status === 'yetkazildi_tolov_kutilmoqda' ? order.payment_deadline_at : null)

  return (
    <Link
      to={`/orders/${order.id}`}
      className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition hover:border-[#397461]/20 hover:bg-[#eff8f3] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-800">{order.number}</p>
        <p className="mt-0.5 text-xs text-slate-400">{formatPrice(order.total_amount)}</p>
      </div>
      <div className="flex items-center gap-3">
        {countdown && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${countdown.expired ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
            <Timer size={12} />
            {formatCountdown(countdown)}
          </span>
        )}
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${orderStatusStyle[order.status]}`}>
          {orderStatusLabel[order.status]}
        </span>
      </div>
    </Link>
  )
}
