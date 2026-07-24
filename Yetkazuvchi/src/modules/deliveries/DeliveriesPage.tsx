import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, ChevronLeft, ChevronRight, LoaderCircle, MapPin, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { deliveryStage, orderStatusLabels, orderStatusTones } from '../../shared/order'
import { useSnackbar } from '../../shared/Snackbar'
import type { Order } from '../../shared/types'

type FilterKey = 'all' | 'pickup' | 'transit' | 'done'

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Barchasi' },
  { key: 'pickup', label: 'Olib ketish kerak' },
  { key: 'transit', label: "Yo'lda" },
  { key: 'done', label: 'Yakunlangan' },
]

const PAGE_SIZE = 20

export function DeliveriesPage() {
  const { showSnackbar } = useSnackbar()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .orders({ limit: PAGE_SIZE, offset })
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
  }, [offset])

  const filtered = useMemo(() => {
    if (filter === 'all') return orders
    return orders.filter((order) => deliveryStage(order) === filter)
  }, [orders, filter])

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Yetkazib berishlar</h2>
          <p className="mt-1 text-sm text-slate-400">Sizga biriktirilgan buyurtmalar ro‘yxati</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                filter === item.key
                  ? 'bg-[#173c32] text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
            <LoaderCircle className="animate-spin" size={18} />
            Yuklanmoqda...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-slate-50 text-slate-300">
              <Truck size={26} />
            </div>
            <p className="text-sm font-semibold text-slate-500">Buyurtmalar topilmadi</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((order, index) => {
              const stage = deliveryStage(order)
              return (
                <motion.li
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Link
                    to={`/deliveries/${order.id}`}
                    className="group flex flex-col gap-4 p-5 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:px-6"
                  >
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]">
                      <Truck size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-800">№ {order.number}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${orderStatusTones[order.status]}`}>
                          {orderStatusLabels[order.status]}
                        </span>
                        {stage === 'pickup' && (
                          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-600">
                            Olib ketish kerak
                          </span>
                        )}
                        {stage === 'transit' && (
                          <span className="rounded-full bg-[#eff8f3] px-2.5 py-1 text-[10px] font-bold text-[#397461]">
                            Yetkazish kerak
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin size={13} /> {order.point_a_address}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={13} /> {order.point_b_address}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-xs text-slate-400 sm:text-left">
                      <p>{formatDateTime(order.created_at)}</p>
                    </div>
                    <ArrowUpRight size={17} className="ml-auto shrink-0 text-slate-300 transition group-hover:text-[#397461]" />
                  </Link>
                </motion.li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="flex items-center justify-between">
        <button
          onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
          disabled={offset === 0 || loading}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft size={15} /> Oldingi
        </button>
        <span className="text-xs text-slate-400">Sahifa {Math.floor(offset / PAGE_SIZE) + 1}</span>
        <button
          onClick={() => setOffset((current) => current + PAGE_SIZE)}
          disabled={orders.length < PAGE_SIZE || loading}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Keyingi <ChevronRight size={15} />
        </button>
      </section>
    </div>
  )
}
