import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Building2, CheckCircle2, Clock3, FileClock, Percent } from 'lucide-react'
import { api, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { formatPrice } from '../../shared/order'
import { useSnackbar } from '../../shared/Snackbar'
import type { KomissiyaStatus, KuratorKomissiyaItem } from '../../shared/types'

type StatusFilter = KomissiyaStatus | 'all'

const statusLabel: Record<KomissiyaStatus, string> = {
  pending: 'Kutilmoqda',
  submitted: 'Tekshirilmoqda',
  paid: 'To‘langan',
  waived: 'Bepul aksiya',
}

const statusStyle: Record<KomissiyaStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  submitted: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
  waived: 'bg-slate-100 text-slate-500',
}

const filters: Array<[StatusFilter, string]> = [
  ['all', 'Barchasi'],
  ['pending', 'Kutilmoqda'],
  ['submitted', 'Tekshirilmoqda'],
  ['paid', 'To‘langan'],
  ['waived', 'Bepul aksiya'],
]

export function KomissiyalarPage() {
  const { showSnackbar } = useSnackbar()
  const [items, setItems] = useState<KuratorKomissiyaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await api.kuratorKomissiyalar({ limit: 100, offset: 0 }))
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

  const filtered = useMemo(
    () => (status === 'all' ? items : items.filter((item) => item.status === status)),
    [items, status],
  )

  const totals = useMemo(() => {
    const paid = items.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0)
    const pending = items
      .filter((item) => item.status === 'pending' || item.status === 'submitted')
      .reduce((sum, item) => sum + item.amount, 0)
    return { paid, pending }
  }, [items])

  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
          <div className="mb-3 grid size-10 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]">
            <Percent size={18} />
          </div>
          <p className="text-xs text-slate-400">Jami komissiyalar</p>
          <p className="mt-1 text-lg font-bold text-slate-800">{items.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
          <div className="mb-3 grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <Clock3 size={18} />
          </div>
          <p className="text-xs text-slate-400">To‘lanishi kerak</p>
          <p className="mt-1 text-lg font-bold text-slate-800">{formatPrice(totals.pending)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
          <div className="mb-3 grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={18} />
          </div>
          <p className="text-xs text-slate-400">To‘langan</p>
          <p className="mt-1 text-lg font-bold text-slate-800">{formatPrice(totals.paid)}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Fabrikalar komissiyasi</h2>
            <p className="mt-1 text-xs text-slate-400">
              Sizga biriktirilgan zavodlarning platforma komissiyasi to‘langanligi
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {filters.map(([value, label]) => (
              <button
                key={value}
                onClick={() => setStatus(value)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  status === value ? 'bg-[#173c32] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <CardSkeleton />
        ) : error ? (
          <div className="grid min-h-72 place-items-center p-6 text-center">
            <div>
              <AlertTriangle className="mx-auto mb-3 text-red-400" />
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button onClick={() => void load()} className="mt-4 text-xs font-bold text-[#397461]">
                Qayta urinish
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">Komissiyalar topilmadi</div>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item, index) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
                className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-[#397461]">
                      <Building2 size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{item.company_name}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">Buyurtma #{item.buyurtma_id}</p>
                    </div>
                  </div>
                  <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyle[item.status]}`}>
                    {statusLabel[item.status]}
                  </span>
                </div>

                <div className="mt-4 flex items-end justify-between border-t border-slate-200/70 pt-4">
                  <div>
                    <p className="text-[11px] text-slate-400">Komissiya to‘langanligi</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-700">
                      {item.status === 'paid' ? (
                        <CheckCircle2 size={14} className="text-emerald-600" />
                      ) : (
                        <FileClock size={14} className="text-amber-500" />
                      )}
                      {item.status === 'paid' ? 'To‘langan' : statusLabel[item.status]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tracking-tight text-[#173c32]">{formatPrice(item.amount)}</p>
                    <p className="text-[11px] text-slate-400">{item.percent}% · {formatDateTime(item.created_at)}</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Komissiyalar yuklanmoqda">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  )
}
