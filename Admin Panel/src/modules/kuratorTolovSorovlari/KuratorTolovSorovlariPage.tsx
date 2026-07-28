import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Banknote,
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  User,
  Wallet,
  X,
  XCircle,
} from 'lucide-react'
import { api, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { formatMoney } from '../../shared/order'
import { useSnackbar } from '../../shared/Snackbar'
import type { KuratorTolovSorovi, KuratorTolovStatus } from '../../shared/types'

type StatusFilter = KuratorTolovStatus | 'all'

const statusLabel: Record<KuratorTolovStatus, string> = {
  pending: 'Kutilmoqda',
  paid: 'To‘langan',
  rejected: 'Rad etilgan',
}

const statusStyle: Record<KuratorTolovStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  paid: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-600',
}

export function KuratorTolovSorovlariPage() {
  const { showSnackbar } = useSnackbar()
  const [items, setItems] = useState<KuratorTolovSorovi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [offset, setOffset] = useState(0)
  const [payingId, setPayingId] = useState<number | null>(null)
  const [rejecting, setRejecting] = useState<KuratorTolovSorovi | null>(null)
  const limit = 20

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await api.kuratorTolovSorovlari({ status: status === 'all' ? undefined : status, limit, offset }))
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

  const totals = useMemo(() => {
    const pending = items.filter((item) => item.status === 'pending').reduce((sum, item) => sum + item.amount, 0)
    const paid = items.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0)
    return { pending, paid }
  }, [items])

  async function payRequest(item: KuratorTolovSorovi) {
    setPayingId(item.id)
    try {
      const updated = await api.payKuratorTolovSorov(item.id)
      setItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)))
      showSnackbar('So‘rov to‘langan deb belgilandi')
    } catch (payError) {
      showSnackbar(getErrorMessage(payError), 'error')
    } finally {
      setPayingId(null)
    }
  }

  function handleRejected(updated: KuratorTolovSorovi) {
    setItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)))
    setRejecting(null)
    showSnackbar('So‘rov rad etildi')
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] bg-[#173c32] px-6 py-7 text-white sm:px-8">
        <div className="absolute -right-8 -top-14 size-52 rounded-full border border-white/10" />
        <div className="absolute bottom-0 right-1/4 h-1/2 w-1/3 bg-[#c9f560]/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-[#c9f560]">
              <Wallet size={14} />
              Kurator to‘lovlari
            </div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Kartaga pul yechish so‘rovlari</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/60">
              Kuratorlarning daromadidan kartaga o‘tkazish so‘rovlarini ko‘rib chiqing, to‘lang yoki rad eting.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
          <div className="mb-3 grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <Banknote size={18} />
          </div>
          <p className="text-xs text-slate-400">To‘lanishi kerak (joriy sahifa)</p>
          <p className="mt-1 text-lg font-bold text-slate-800">{formatMoney(totals.pending)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
          <div className="mb-3 grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <Check size={18} />
          </div>
          <p className="text-xs text-slate-400">To‘langan (joriy sahifa)</p>
          <p className="mt-1 text-lg font-bold text-slate-800">{formatMoney(totals.paid)}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">So‘rovlar ro‘yxati</h2>
            <p className="mt-1 text-xs text-slate-400">Barcha kuratorlarning yechish so‘rovlari</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {([
              ['all', 'Barchasi'],
              ['pending', 'Kutilmoqda'],
              ['paid', 'To‘langan'],
              ['rejected', 'Rad etilgan'],
            ] as const).map(([value, label]) => (
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
              <table className="w-full min-w-[960px] text-left">
                <thead>
                  <tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Kurator</th>
                    <th className="px-4 py-4">Summasi</th>
                    <th className="px-4 py-4">Karta</th>
                    <th className="px-4 py-4">Izoh</th>
                    <th className="px-4 py-4">Holat</th>
                    <th className="px-4 py-4">Sana</th>
                    <th className="px-6 py-4 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.025 }}
                      className="hover:bg-slate-50/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                          <User size={14} className="text-slate-400" />
                          #{item.kurator_id}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-700">{formatMoney(item.amount)}</td>
                      <td className="px-4 py-4 text-xs text-slate-600">
                        <p className="font-mono">{item.card_number}</p>
                        <p className="mt-0.5 text-slate-400">{item.card_holder}</p>
                      </td>
                      <td className="px-4 py-4 max-w-[220px] truncate text-xs text-slate-500" title={item.note}>
                        {item.note || '—'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyle[item.status]}`}>
                          {statusLabel[item.status]}
                        </span>
                        {item.status === 'rejected' && item.admin_note && (
                          <p className="mt-1 max-w-[180px] truncate text-[10px] text-red-500" title={item.admin_note}>
                            {item.admin_note}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500">{formatDateTime(item.created_at)}</td>
                      <td className="px-6 py-4">
                        {item.status === 'pending' && (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => void payRequest(item)}
                              disabled={payingId === item.id}
                              className="flex h-9 items-center gap-1.5 rounded-lg bg-[#173c32] px-3 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {payingId === item.id ? <LoaderCircle className="animate-spin" size={14} /> : <Check size={14} />}
                              To‘lash
                            </button>
                            <button
                              onClick={() => setRejecting(item)}
                              className="flex h-9 items-center gap-1.5 rounded-lg bg-red-50 px-3 text-xs font-bold text-red-600 transition hover:bg-red-100"
                            >
                              <XCircle size={14} />
                              Rad etish
                            </button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {items.length === 0 && (
                <div className="py-16 text-center text-sm text-slate-400">So‘rovlar topilmadi</div>
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

      <AnimatePresence>
        {rejecting && (
          <RejectRequestModal item={rejecting} onClose={() => setRejecting(null)} onRejected={handleRejected} />
        )}
      </AnimatePresence>
    </div>
  )
}

function RejectRequestModal({
  item,
  onClose,
  onRejected,
}: {
  item: KuratorTolovSorovi
  onClose: () => void
  onRejected: (updated: KuratorTolovSorovi) => void
}) {
  const { showSnackbar } = useSnackbar()
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    try {
      const updated = await api.rejectKuratorTolovSorov(item.id, note.trim() || undefined)
      onRejected(updated)
    } catch (rejectError) {
      showSnackbar(getErrorMessage(rejectError), 'error')
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-red-50 text-red-600">
              <XCircle size={20} />
            </div>
            <div>
              <h3 className="font-bold">So‘rovni rad etish</h3>
              <p className="mt-0.5 text-xs text-slate-400">{formatMoney(item.amount)} · {item.card_holder}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={19} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-600">
              Sabab <span className="font-medium text-slate-400">(ixtiyoriy)</span>
            </span>
            <textarea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Masalan: Karta ma’lumotlari noto‘g‘ri"
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#397461] focus:ring-4 focus:ring-[#397461]/8"
            />
          </label>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600">
              Bekor qilish
            </button>
            <button
              disabled={loading}
              className="flex h-11 items-center gap-2 rounded-xl bg-red-500 px-5 text-sm font-bold text-white disabled:opacity-60"
            >
              {loading && <LoaderCircle className="animate-spin" size={17} />}
              {loading ? 'Yuborilmoqda...' : 'Rad etish'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-5" aria-label="So‘rovlar yuklanmoqda">
      {Array.from({ length: 6 }).map((_, key) => (
        <div key={key} className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
          <div className="h-3 w-20 rounded-full bg-slate-200" />
          <div className="h-3 flex-1 rounded-full bg-slate-200/70" />
          <div className="h-3 w-16 rounded-full bg-slate-200" />
          <div className="h-3 w-24 rounded-full bg-slate-200" />
        </div>
      ))}
    </div>
  )
}
