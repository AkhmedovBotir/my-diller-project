import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  Search,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { formatMoney, orderStatusLabel, orderStatusStyle } from '../../shared/order'
import { paymentTermLabel } from '../../shared/product'
import { useSnackbar } from '../../shared/Snackbar'
import type { Order, OrderStatus } from '../../shared/types'

type StatusFilter = OrderStatus | 'all'

const statusTabs: Array<[StatusFilter, string]> = [
  ['all', 'Barchasi'],
  ['yangi', 'Yangi'],
  ['qabul_qilindi', 'Qabul qilindi'],
  ['logistikaga_uzatildi', 'Logistikada'],
  ['yetkazildi_tolov_kutilmoqda', 'To‘lov kutilmoqda'],
  ['yakunlandi', 'Yakunlandi'],
  ['fors_major', 'Fors-major'],
]

export function OrdersPage() {
  const navigate = useNavigate()
  const { showSnackbar } = useSnackbar()
  const [items, setItems] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [offset, setOffset] = useState(0)
  const limit = 20

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(
        await api.orders({
          status: status === 'all' ? undefined : status,
          limit,
          offset,
        }),
      )
    } catch (loadError) {
      const message = getErrorMessage(loadError)
      setError(message)
      showSnackbar(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [offset, showSnackbar, status])

  useEffect(() => {
    const task = window.setTimeout(() => void loadItems(), 0)
    return () => window.clearTimeout(task)
  }, [loadItems])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return items
    return items.filter((item) => item.number.toLocaleLowerCase().includes(query))
  }, [items, search])

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Buyurtmalar</h2>
          <p className="mt-1 text-xs text-slate-400">
            Kelib tushgan buyurtmalarni qabul qiling va bosqichma-bosqich yakunlang
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buyurtma raqami"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm outline-none transition focus:border-[#397461] focus:bg-white"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {statusTabs.map(([value, label]) => (
              <button
                key={value}
                onClick={() => {
                  setOffset(0)
                  setStatus(value)
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  status === value
                    ? 'bg-[#173c32] text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="grid min-h-72 place-items-center p-6 text-center">
            <div>
              <AlertTriangle className="mx-auto mb-3 text-red-400" />
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button onClick={() => void loadItems()} className="mt-4 text-xs font-bold text-[#397461]">
                Qayta urinish
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Buyurtma</th>
                    <th className="px-4 py-4">To‘lov sharti</th>
                    <th className="px-4 py-4">Summa</th>
                    <th className="px-4 py-4">Holat</th>
                    <th className="px-4 py-4">Yaratilgan</th>
                    <th className="px-6 py-4 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.025 }}
                      className="group cursor-pointer hover:bg-slate-50/50"
                      onClick={() => navigate(`/orders/${item.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]">
                            <ClipboardList size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{item.number}</p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {item.items?.length ?? 0} mahsulot
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {paymentTermLabel[item.payment_term]}
                        {item.payment_term === 'deferred' && (
                          <span className="ml-1 text-xs text-slate-400">({item.payment_days} kun)</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                        {formatMoney(item.total_amount)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${orderStatusStyle[item.status]}`}>
                          {orderStatusLabel[item.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500">{formatDateTime(item.created_at)}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={(event) => {
                              event.stopPropagation()
                              navigate(`/orders/${item.id}`)
                            }}
                            className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                            title="Ko‘rish"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-16 text-center text-sm text-slate-400">Buyurtma topilmadi</div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-400">
                {items.length === 0 ? '0' : `${offset + 1}–${offset + items.length}`} ko‘rsatilmoqda
              </p>
              <div className="flex gap-2">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset((current) => Math.max(0, current - limit))}
                  className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={items.length < limit}
                  onClick={() => setOffset((current) => current + limit)}
                  className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-5" aria-label="Buyurtmalar yuklanmoqda">
      {Array.from({ length: 6 }).map((_, key) => (
        <div key={key} className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
          <div className="size-11 rounded-xl bg-slate-200" />
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
