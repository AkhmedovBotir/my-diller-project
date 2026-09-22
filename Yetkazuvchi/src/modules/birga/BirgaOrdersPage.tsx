import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, LoaderCircle, MapPin, Package, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { resolveImage } from '../../shared/media'
import { formatMoney } from '../../shared/order'
import { useSnackbar } from '../../shared/Snackbar'
import type { BirgaOrder } from '../../shared/types'

const STATUS_LABEL: Record<string, string> = {
  awaiting_courier: 'Olish mumkin',
  with_courier: 'Yo‘lda',
  issued: 'Topshirildi',
}

type FilterKey = 'all' | 'awaiting_courier' | 'with_courier' | 'issued'

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Barchasi' },
  { key: 'awaiting_courier', label: 'Yangi' },
  { key: 'with_courier', label: 'Yo‘lda' },
  { key: 'issued', label: 'Berilgan' },
]

export function BirgaOrdersPage() {
  const { showSnackbar } = useSnackbar()
  const [items, setItems] = useState<BirgaOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .birgaOrders({ limit: 100 })
      .then((list) => {
        if (!cancelled) setItems(list)
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
  }, [showSnackbar])

  const filtered = useMemo(() => {
    if (filter === 'all') return items
    return items.filter((item) => item.status === filter)
  }, [filter, items])

  return (
    <div className="space-y-5 pb-20 lg:pb-0">
      <section className="rounded-[28px] bg-[#102d26] px-5 py-6 text-white sm:px-7">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#c9f560]">
          <UsersRound size={14} />
          Birga Xarid
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Hududingizdagi buyurtmalar</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/65">
          Yig‘im yopilgach shu yerda chiqadi. Oling, yetkazing va mijozdagi 6 xonali kod bilan
          topshiring.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              filter === item.key
                ? 'bg-[#102d26] text-[#c9f560]'
                : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
          <LoaderCircle className="animate-spin" size={18} />
          Yuklanmoqda...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Package className="text-slate-300" size={28} />
          <p className="text-sm font-semibold text-slate-500">Buyurtma yo‘q</p>
          <p className="max-w-xs text-xs text-slate-400">
            Profilingizdagi hudud bilan mos keladigan Birga buyurtmalar shu yerda chiqadi.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order, index) => {
            const photo =
              resolveImage(order.photo_snapshot) ||
              resolveImage(order.items?.find((line) => line.photo_url)?.photo_url)
            const itemCount = order.items?.length ?? 0
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Link
                  to={`/birga-xarid/${order.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 transition hover:border-[#102d26]/20 hover:shadow-md sm:gap-4 sm:p-4"
                >
                  <div className="size-14 shrink-0 overflow-hidden rounded-2xl bg-[#eff8f3] ring-1 ring-slate-100 sm:size-16">
                    {photo ? (
                      <img
                        src={photo}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-[#397461]">
                        <Package size={22} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-bold text-slate-900">
                        {order.title_snapshot || `Buyurtma #${order.id}`}
                      </p>
                      <span className="rounded-full bg-[#c9f560]/50 px-2 py-0.5 text-[10px] font-bold text-[#173c32]">
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {formatMoney(order.total_amount)} · {order.quantity} to‘plam
                      {itemCount > 0 ? ` · ${itemCount} mahsulot` : ''}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                      <MapPin size={12} className="shrink-0" />
                      <span className="truncate">
                        {[order.city_name, order.mfy_name, order.address]
                          .filter(Boolean)
                          .join(', ') || order.customer_name}
                      </span>
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      #{order.id} · {formatDateTime(order.created_at)}
                    </p>
                  </div>
                  <ArrowUpRight className="shrink-0 text-slate-300" size={18} />
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
