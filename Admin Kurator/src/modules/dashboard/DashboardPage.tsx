import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  Factory,
  Package,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../../shared/api'
import { useSnackbar } from '../../shared/Snackbar'
import { formatDateTime, formatLongDate } from '../../shared/date'
import {
  ACTIVE_ORDER_STATUSES,
  formatPrice,
  orderStatusLabel,
  orderStatusStyle,
} from '../../shared/order'
import type { Ishlabchiqaruvchi, Order } from '../../shared/types'
import { useAuth } from '../auth/AuthContext'

export function DashboardPage() {
  const { user } = useAuth()
  const { showSnackbar } = useSnackbar()
  const [orders, setOrders] = useState<Order[]>([])
  const [factories, setFactories] = useState<Ishlabchiqaruvchi[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [ordersResult, factoriesResult] = await Promise.all([
          api.kuratorOrders({ limit: 100, offset: 0 }),
          api.factories(100, 0),
        ])
        if (!cancelled) {
          setOrders(ordersResult)
          setFactories(factoriesResult)
        }
      } catch (loadError) {
        if (!cancelled) showSnackbar(getErrorMessage(loadError), 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [showSnackbar])

  const myFactories = useMemo(() => {
    if (!user) return factories
    if (user.type !== 'kurator') return factories
    return factories.filter((factory) => factory.kurator_id === user.id)
  }, [factories, user])

  const gmv = useMemo(
    () => orders.filter((order) => order.status === 'yakunlandi').reduce((sum, order) => sum + order.total_amount, 0),
    [orders],
  )

  const activeOrders = useMemo(
    () => orders.filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status)),
    [orders],
  )

  const recentOrders = useMemo(() => orders.slice(0, 6), [orders])

  if (!user) return null

  const now = new Date()
  const formattedDate = formatLongDate(now)

  const stats = [
    { label: 'Yakunlangan aylanma (GMV)', value: formatPrice(gmv), icon: Wallet, tone: 'lime' },
    { label: 'Faol buyurtmalar', value: String(activeOrders.length), icon: ClipboardList, tone: 'green' },
    { label: 'Biriktirilgan fabrikalar', value: String(myFactories.length), icon: Factory, tone: 'orange' },
    { label: 'Jami buyurtmalar', value: String(orders.length), icon: ShieldCheck, tone: 'blue' },
  ]

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
              Kurator kabineti
            </div>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Assalomu alaykum, {user.first_name}!
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/60">
              Biriktirilgan fabrikalar va buyurtmalarni shu yerdan nazorat qiling.
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
              <h3 className="font-bold text-slate-900">So‘nggi buyurtmalar</h3>
              <p className="mt-1 text-xs text-slate-400">Eng oxirgi 6 ta buyurtma</p>
            </div>
            <Link to="/orders" className="text-xs font-bold text-[#397461] hover:underline">
              Barchasini ko‘rish
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">Hozircha buyurtmalar yo‘q</div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 transition hover:border-[#397461]/20 hover:bg-[#eff8f3]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{order.number}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(order.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700">{formatPrice(order.total_amount)}</span>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${orderStatusStyle[order.status]}`}>
                      {orderStatusLabel[order.status]}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <h3 className="font-bold text-slate-900">Tezkor amallar</h3>
          <div className="mt-6 space-y-3">
            <Link
              to="/factories"
              className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-[#397461]/20 hover:bg-[#eff8f3]"
            >
              <div className="grid size-11 place-items-center rounded-xl bg-[#173c32] text-[#c9f560]">
                <Factory size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Fabrikalar</p>
                <p className="mt-1 text-xs text-slate-400">Biriktirilgan ishlab chiqaruvchilar</p>
              </div>
              <ArrowUpRight size={17} className="ml-auto text-slate-300 transition group-hover:text-[#397461]" />
            </Link>
            <Link
              to="/orders"
              className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-[#397461]/20 hover:bg-[#eff8f3]"
            >
              <div className="grid size-11 place-items-center rounded-xl bg-[#dff6b0] text-[#173c32]">
                <ClipboardList size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Buyurtmalar</p>
                <p className="mt-1 text-xs text-slate-400">Holat va fors-major nazorati</p>
              </div>
              <ArrowUpRight size={17} className="ml-auto text-slate-300 transition group-hover:text-[#397461]" />
            </Link>
            <Link
              to="/products"
              className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-[#397461]/20 hover:bg-[#eff8f3]"
            >
              <div className="grid size-11 place-items-center rounded-xl bg-[#173c32] text-[#c9f560]">
                <Package size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Mahsulotlar</p>
                <p className="mt-1 text-xs text-slate-400">Narx, soni va shartlarni tahrirlash</p>
              </div>
              <ArrowUpRight size={17} className="ml-auto text-slate-300 transition group-hover:text-[#397461]" />
            </Link>
          </div>
        </article>
      </section>
    </div>
  )
}
