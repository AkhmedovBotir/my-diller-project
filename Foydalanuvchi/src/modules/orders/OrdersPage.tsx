import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, ChevronLeft, ChevronRight, ClipboardList, Timer } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { formatPrice, orderStatusLabel, orderStatusStyle } from '../../shared/format'
import { formatCountdown, useCountdown } from '../../shared/useCountdown'
import type { Order, OrderStatus } from '../../shared/types'

type StatusFilter = OrderStatus | 'all'

const LIMIT = 20

const FILTERS: Array<[StatusFilter, string]> = [
  ['all', 'Barchasi'],
  ['yangi', 'Yangi'],
  ['qabul_qilindi', 'Qabul qilindi'],
  ['logistikaga_uzatildi', 'Logistikada'],
  ['yolda', 'Yo‘lda'],
  ['yetkazildi_tolov_kutilmoqda', 'To‘lov kutilmoqda'],
  ['yakunlandi', 'Yakunlandi'],
  ['fors_major', 'Fors-major'],
  ['kafolat_bilan_yopildi', 'Kafolat bilan yopilgan'],
]

export function OrdersPage() {
  const [items, setItems] = useState<Order[]>([])
  const [status, setStatus] = useState<StatusFilter>('all')
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const orders = await api.orders({
        status: status === 'all' ? undefined : status,
        limit: LIMIT,
        offset,
      })
      setItems(orders)
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [status, offset])

  useEffect(() => {
    const task = window.setTimeout(() => void loadItems(), 0)
    return () => window.clearTimeout(task)
  }, [loadItems])

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Buyurtmalar</h2>
            <p className="mt-1 text-xs text-slate-400">Barcha buyurtmalaringiz holati shu yerda</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                setOffset(0)
                setStatus(value)
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                status === value ? 'bg-[#173c32] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center">
          <div>
            <AlertTriangle className="mx-auto mb-3 text-red-400" />
            <p className="text-sm font-semibold text-red-600">{error}</p>
            <button onClick={() => void loadItems()} className="mt-4 text-xs font-bold text-[#397461]">
              Qayta urinish
            </button>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center">
          <div>
            <ClipboardList className="mx-auto mb-3 text-slate-300" size={28} />
            <p className="text-sm font-semibold text-slate-500">Buyurtma topilmadi</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((order, index) => (
            <OrderCard key={order.id} order={order} index={index} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-5 py-4">
        <p className="text-xs text-slate-400">
          {items.length === 0 ? '0' : `${offset + 1}–${offset + items.length}`} ko‘rsatilmoqda
        </p>
        <div className="flex gap-2">
          <button
            disabled={offset === 0}
            onClick={() => setOffset((current) => Math.max(0, current - LIMIT))}
            className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            disabled={items.length < LIMIT}
            onClick={() => setOffset((current) => current + LIMIT)}
            className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function OrderCard({ order, index }: { order: Order; index: number }) {
  const countdown = useCountdown(order.status === 'yetkazildi_tolov_kutilmoqda' ? order.payment_deadline_at : null)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
    >
      <Link
        to={`/orders/${order.id}`}
        className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 transition hover:border-[#397461]/30 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-slate-800">{order.number}</p>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${orderStatusStyle[order.status]}`}>
              {orderStatusLabel[order.status]}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">{formatDateTime(order.created_at)} · {order.items?.length ?? 0} ta mahsulot</p>
        </div>
        <div className="flex items-center gap-4">
          {countdown && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${countdown.expired ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
              <Timer size={12} />
              {formatCountdown(countdown)}
            </span>
          )}
          <p className="text-lg font-bold tracking-tight text-[#173c32]">{formatPrice(order.total_amount)}</p>
        </div>
      </Link>
    </motion.div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-label="Buyurtmalar yuklanmoqda">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
      ))}
    </div>
  )
}
