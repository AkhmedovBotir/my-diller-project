import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  PackageCheck,
  Sparkles,
  Truck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api, getErrorMessage } from '../../shared/api'
import { formatLongDate } from '../../shared/date'
import { deliveryStage, orderStatusLabels, orderStatusTones } from '../../shared/order'
import { useSnackbar } from '../../shared/Snackbar'
import type { Order } from '../../shared/types'

export function DashboardPage() {
  const { user } = useAuth()
  const { showSnackbar } = useSnackbar()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .orders({ limit: 100 })
      .then((items) => {
        if (!cancelled) setOrders(items)
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

  if (!user) return null

  const now = new Date()
  const formattedDate = formatLongDate(now)

  const pendingPickups = orders.filter((order) => deliveryStage(order) === 'pickup')
  const pendingDeliveries = orders.filter((order) => deliveryStage(order) === 'transit')
  const completed = orders.filter((order) => deliveryStage(order) === 'done')

  const stats = [
    { label: 'Olib ketish kutilmoqda', value: pendingPickups.length, icon: ClipboardList, tone: 'orange' },
    { label: 'Yetkazish kutilmoqda', value: pendingDeliveries.length, icon: Truck, tone: 'green' },
    { label: 'Yakunlangan', value: completed.length, icon: PackageCheck, tone: 'lime' },
    { label: 'Jami buyurtmalar', value: orders.length, icon: CheckCircle2, tone: 'blue' },
  ]

  const actionable = [...pendingPickups, ...pendingDeliveries].slice(0, 6)

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
              Dostavka kabineti
            </div>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Assalomu alaykum, {user.first_name}!
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/60">
              {user.company_name} kompaniyasi buyurtmalarini olib ketish va yetkazish jarayonini shu yerdan boshqaring.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-50/55">
            <CalendarDays size={16} className="text-[#c9f560]" />
            <span className="capitalize">{formattedDate}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item, index) => (
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
            <p className="mt-1 truncate text-lg font-bold tracking-tight text-slate-800">
              {loading ? '—' : item.value}
            </p>
          </motion.article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <article className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">Diqqat talab qiladigan buyurtmalar</h3>
              <p className="mt-1 text-xs text-slate-400">Olib ketish yoki yetkazish kerak bo‘lgan buyurtmalar</p>
            </div>
            <Link to="/deliveries" className="text-xs font-bold text-[#397461] hover:underline">
              Barchasi
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-400">
              <LoaderCircle className="animate-spin" size={18} />
              Yuklanmoqda...
            </div>
          ) : actionable.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-14 text-center text-sm text-slate-400">
              Hozircha amal talab qiladigan buyurtmalar yo‘q
            </div>
          ) : (
            <div className="space-y-3">
              {actionable.map((order) => {
                const stage = deliveryStage(order)
                return (
                  <Link
                    key={order.id}
                    to={`/deliveries/${order.id}`}
                    className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-[#397461]/20 hover:bg-[#eff8f3]"
                  >
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#173c32] text-[#c9f560]">
                      {stage === 'pickup' ? <ClipboardList size={20} /> : <Truck size={20} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">№ {order.number}</p>
                      <p className="mt-1 truncate text-xs text-slate-400">{order.point_a_address} → {order.point_b_address}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${orderStatusTones[order.status]}`}>
                      {orderStatusLabels[order.status]}
                    </span>
                    <ArrowUpRight size={17} className="ml-1 shrink-0 text-slate-300 transition group-hover:text-[#397461]" />
                  </Link>
                )
              })}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <h3 className="font-bold text-slate-900">Hisob ma’lumotlari</h3>
          <div className="mt-6 space-y-5">
            <InfoRow label="Kompaniya" value={user.company_name} />
            <InfoRow label="Foydalanuvchi" value={`@${user.username}`} />
            <InfoRow label="Telefon" value={user.phone} />
          </div>
        </article>
      </section>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-700">{value}</span>
    </div>
  )
}
