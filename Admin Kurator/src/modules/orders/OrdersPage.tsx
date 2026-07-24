import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowUpRight,
  Columns3,
  Rows3,
  Search,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import {
  ORDER_STATUSES,
  formatPrice,
  orderStatusLabel,
  orderStatusStyle,
  paymentTermLabel,
} from '../../shared/order'
import { useSnackbar } from '../../shared/Snackbar'
import type { Order, OrderStatus } from '../../shared/types'

type StatusFilter = OrderStatus | 'all'
type ViewMode = 'table' | 'kanban'

export function OrdersPage() {
  const { showSnackbar } = useSnackbar()
  const [items, setItems] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ViewMode>('table')

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(
        await api.kuratorOrders({
          status: status === 'all' ? undefined : status,
          limit: 100,
          offset: 0,
        }),
      )
    } catch (loadError) {
      const message = getErrorMessage(loadError)
      setError(message)
      showSnackbar(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [showSnackbar, status])

  useEffect(() => {
    const task = window.setTimeout(() => void loadItems(), 0)
    return () => window.clearTimeout(task)
  }, [loadItems])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return items
    return items.filter((item) => item.number.toLocaleLowerCase().includes(query))
  }, [items, search])

  const grouped = useMemo(() => {
    const map = new Map<OrderStatus, Order[]>()
    for (const s of ORDER_STATUSES) map.set(s, [])
    for (const order of filtered) map.get(order.status)?.push(order)
    return map
  }, [filtered])

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Buyurtmalar</h2>
          <p className="mt-1 text-xs text-slate-400">Holat bo‘yicha kuzatuv va fors-major nazorati</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            onClick={() => setView('table')}
            className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${
              view === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
            }`}
          >
            <Rows3 size={15} />
            Jadval
          </button>
          <button
            onClick={() => setView('kanban')}
            className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${
              view === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
            }`}
          >
            <Columns3 size={15} />
            Kanban
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buyurtma raqami"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm outline-none transition focus:border-[#397461] focus:bg-white"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStatus('all')}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
              status === 'all' ? 'bg-[#173c32] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            Barchasi
          </button>
          {ORDER_STATUSES.map((value) => (
            <button
              key={value}
              onClick={() => setStatus(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                status === value ? 'bg-[#173c32] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {orderStatusLabel[value]}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <TableSkeleton />
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
      ) : view === 'table' ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Buyurtma</th>
                  <th className="px-4 py-4">Summasi</th>
                  <th className="px-4 py-4">To‘lov sharti</th>
                  <th className="px-4 py-4">Holat</th>
                  <th className="px-4 py-4">Yaratilgan</th>
                  <th className="px-6 py-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((order, index) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="group hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">{order.number}</p>
                      <p className="mt-0.5 text-xs text-slate-400">Xaridor #{order.xaridor_id}</p>
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-700">{formatPrice(order.total_amount)}</td>
                    <td className="px-4 py-4 text-xs text-slate-500">{paymentTermLabel[order.payment_term]}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${orderStatusStyle[order.status]}`}>
                        {orderStatusLabel[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">{formatDateTime(order.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/orders/${order.id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-[#397461] transition hover:bg-emerald-50"
                      >
                        Batafsil
                        <ArrowUpRight size={13} />
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center text-sm text-slate-400">Buyurtma topilmadi</div>
            )}
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-4 overflow-x-auto pb-2 sm:grid-cols-2 xl:grid-flow-col xl:auto-cols-[280px]">
          {ORDER_STATUSES.map((s) => (
            <div key={s} className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${orderStatusStyle[s]}`}>
                  {orderStatusLabel[s]}
                </span>
                <span className="text-xs font-bold text-slate-400">{grouped.get(s)?.length ?? 0}</span>
              </div>
              <div className="space-y-2">
                {(grouped.get(s) ?? []).map((order) => (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    className="block rounded-xl border border-slate-200 bg-white p-3 transition hover:border-[#397461]/30 hover:shadow-sm"
                  >
                    <p className="text-sm font-bold text-slate-800">{order.number}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">{formatPrice(order.total_amount)}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(order.created_at)}</p>
                  </Link>
                ))}
                {(grouped.get(s) ?? []).length === 0 && (
                  <p className="px-1 py-4 text-center text-xs text-slate-300">Bo‘sh</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5" aria-label="Buyurtmalar yuklanmoqda">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 rounded-full bg-slate-200" />
            <div className="h-2.5 w-24 rounded-full bg-slate-200/70" />
          </div>
          <div className="h-3 w-20 rounded-full bg-slate-200" />
          <div className="h-3 w-16 rounded-full bg-slate-200" />
        </div>
      ))}
    </div>
  )
}
