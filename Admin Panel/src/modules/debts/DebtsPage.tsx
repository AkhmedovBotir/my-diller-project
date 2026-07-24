import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Ban, Banknote, CheckCircle2, Clock3, LoaderCircle, Wallet } from 'lucide-react'
import { api, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { formatMoney } from '../../shared/order'
import { useSnackbar } from '../../shared/Snackbar'
import type { Debt, DebtStatus } from '../../shared/types'

const debtStatusLabel: Record<DebtStatus, string> = {
  open: 'Ochiq',
  collected: 'Undirilgan',
  written_off: 'Hisobdan chiqarilgan',
}

const debtStatusStyle: Record<DebtStatus, string> = {
  open: 'bg-amber-50 text-amber-700',
  collected: 'bg-emerald-50 text-emerald-700',
  written_off: 'bg-slate-100 text-slate-500',
}

type StatusFilter = DebtStatus | 'all'

export function DebtsPage() {
  const { showSnackbar } = useSnackbar()
  const [items, setItems] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [actingId, setActingId] = useState<number | null>(null)

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await api.debts())
    } catch (loadError) {
      const message = getErrorMessage(loadError)
      setError(message)
      showSnackbar(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [showSnackbar])

  useEffect(() => {
    const task = window.setTimeout(() => void loadItems(), 0)
    return () => window.clearTimeout(task)
  }, [loadItems])

  const filtered = useMemo(
    () => (status === 'all' ? items : items.filter((item) => item.status === status)),
    [items, status],
  )

  const totals = useMemo(() => {
    const open = items.filter((item) => item.status === 'open').reduce((sum, item) => sum + item.amount, 0)
    const collected = items.filter((item) => item.status === 'collected').reduce((sum, item) => sum + item.amount, 0)
    const writtenOff = items.filter((item) => item.status === 'written_off').reduce((sum, item) => sum + item.amount, 0)
    return { open, collected, writtenOff }
  }, [items])

  async function handleCollect(debt: Debt) {
    setActingId(debt.id)
    try {
      const updated = await api.collectDebt(debt.id)
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      showSnackbar('Qarz undirilgan deb belgilandi')
    } catch (actionError) {
      showSnackbar(getErrorMessage(actionError), 'error')
    } finally {
      setActingId(null)
    }
  }

  async function handleWriteOff(debt: Debt) {
    setActingId(debt.id)
    try {
      const updated = await api.writeOffDebt(debt.id)
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      showSnackbar('Qarz hisobdan chiqarildi')
    } catch (actionError) {
      showSnackbar(getErrorMessage(actionError), 'error')
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
          <div className="mb-3 grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <Clock3 size={18} />
          </div>
          <p className="text-xs text-slate-400">Ochiq qarzlar</p>
          <p className="mt-1 text-lg font-bold text-slate-800">{formatMoney(totals.open)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
          <div className="mb-3 grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={18} />
          </div>
          <p className="text-xs text-slate-400">Undirilgan</p>
          <p className="mt-1 text-lg font-bold text-slate-800">{formatMoney(totals.collected)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
          <div className="mb-3 grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-500">
            <Ban size={18} />
          </div>
          <p className="text-xs text-slate-400">Hisobdan chiqarilgan</p>
          <p className="mt-1 text-lg font-bold text-slate-800">{formatMoney(totals.writtenOff)}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Qarzlar reyestri</h2>
            <p className="mt-1 text-xs text-slate-400">Fors-major va kechiktirilgan to‘lovlar bo‘yicha qarzdorlik</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {([
              ['all', 'Barchasi'],
              ['open', 'Ochiq'],
              ['collected', 'Undirilgan'],
              ['written_off', 'Hisobdan chiqarilgan'],
            ] as const).map(([value, label]) => (
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Buyurtma</th>
                  <th className="px-4 py-4">Qarzdor</th>
                  <th className="px-4 py-4">Summasi</th>
                  <th className="px-4 py-4">Muddat</th>
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
                    className="hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4 text-sm font-bold text-slate-800">
                      {item.order_number || `#${item.buyurtma_id}`}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {item.debtor_type} #{item.debtor_id}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-700">{formatMoney(item.amount)}</td>
                    <td className="px-4 py-4 text-xs text-slate-500">{item.due_at ? formatDateTime(item.due_at) : '—'}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${debtStatusStyle[item.status]}`}>
                        {debtStatusLabel[item.status]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">{formatDateTime(item.created_at)}</td>
                    <td className="px-6 py-4">
                      {item.status === 'open' ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => void handleCollect(item)}
                            disabled={actingId === item.id}
                            className="flex h-9 items-center gap-1.5 rounded-lg bg-[#173c32] px-3 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {actingId === item.id ? <LoaderCircle className="animate-spin" size={14} /> : <Banknote size={14} />}
                            Undirish
                          </button>
                          <button
                            onClick={() => void handleWriteOff(item)}
                            disabled={actingId === item.id}
                            className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Ban size={14} />
                            Hisobdan chiqarish
                          </button>
                        </div>
                      ) : (
                        <p className="text-right text-xs text-slate-300">—</p>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center text-sm text-slate-400">Qarzlar topilmadi</div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-5" aria-label="Qarzlar yuklanmoqda">
      {Array.from({ length: 6 }).map((_, key) => (
        <div key={key} className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
          <Wallet className="text-slate-200" size={16} />
          <div className="h-3 w-20 rounded-full bg-slate-200" />
          <div className="h-3 flex-1 rounded-full bg-slate-200/70" />
          <div className="h-3 w-16 rounded-full bg-slate-200" />
          <div className="h-3 w-24 rounded-full bg-slate-200" />
        </div>
      ))}
    </div>
  )
}
