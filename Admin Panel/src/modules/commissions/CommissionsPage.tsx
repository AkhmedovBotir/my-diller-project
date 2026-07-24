import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  LoaderCircle,
  Percent,
  Receipt,
  X,
} from 'lucide-react'
import { api, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { commissionStatusLabel, commissionStatusStyle, formatMoney } from '../../shared/order'
import { useSnackbar } from '../../shared/Snackbar'
import type { Commission, CommissionStatus } from '../../shared/types'

type StatusFilter = CommissionStatus | 'all'

export function CommissionsPage() {
  const { showSnackbar } = useSnackbar()
  const [items, setItems] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [offset, setOffset] = useState(0)
  const [viewingInvoice, setViewingInvoice] = useState<Commission | null>(null)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const limit = 20

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await api.komissiyalar({ status: status === 'all' ? undefined : status, limit, offset }))
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

  async function confirmPaid(commission: Commission) {
    setConfirmingId(commission.id)
    try {
      const updated = await api.confirmCommissionPaid(commission.id)
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      showSnackbar('Komissiya to‘langan deb tasdiqlandi')
    } catch (confirmError) {
      showSnackbar(getErrorMessage(confirmError), 'error')
    } finally {
      setConfirmingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
          <div className="mb-3 grid size-10 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]">
            <Percent size={18} />
          </div>
          <p className="text-xs text-slate-400">Jami komissiyalar</p>
          <p className="mt-1 text-lg font-bold text-slate-800">{items.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
          <div className="mb-3 grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <Receipt size={18} />
          </div>
          <p className="text-xs text-slate-400">To‘lanishi kerak</p>
          <p className="mt-1 text-lg font-bold text-slate-800">{formatMoney(totals.pending)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
          <div className="mb-3 grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <Check size={18} />
          </div>
          <p className="text-xs text-slate-400">To‘langan</p>
          <p className="mt-1 text-lg font-bold text-slate-800">{formatMoney(totals.paid)}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Komissiyalar</h2>
            <p className="mt-1 text-xs text-slate-400">
              Ishlab chiqaruvchilar to‘lagan platforma komissiyasini kuzating va tasdiqlang
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {([
              ['all', 'Barchasi'],
              ['pending', 'Kutilmoqda'],
              ['paid', 'To‘langan'],
              ['waived', 'Bekor qilingan'],
            ] as const).map(([value, label]) => (
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
              <table className="w-full min-w-[960px] text-left">
                <thead>
                  <tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Buyurtma</th>
                    <th className="px-4 py-4">Ishlab chiqaruvchi</th>
                    <th className="px-4 py-4">Summasi</th>
                    <th className="px-4 py-4">Foiz</th>
                    <th className="px-4 py-4">Komissiya</th>
                    <th className="px-4 py-4">Holat</th>
                    <th className="px-4 py-4">Yaratilgan</th>
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
                      <td className="px-6 py-4 text-sm font-bold text-slate-800">#{item.buyurtma_id}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">#{item.ishlabchiqaruvchi_id}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{formatMoney(item.order_amount)}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{item.percent}%</td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-700">{formatMoney(item.amount)}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${commissionStatusStyle[item.status]}`}>
                          {commissionStatusLabel[item.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500">{formatDateTime(item.created_at)}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1.5">
                          {item.invoice_html && (
                            <button
                              onClick={() => setViewingInvoice(item)}
                              className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                              title="Hisob-fakturani ko‘rish"
                            >
                              <FileText size={16} />
                            </button>
                          )}
                          {item.payment_receipt_url && (
                            <a
                              href={item.payment_receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                              title="Kvitansiyani ko‘rish"
                            >
                              <Receipt size={16} />
                            </a>
                          )}
                          {item.status === 'pending' && (
                            <button
                              onClick={() => void confirmPaid(item)}
                              disabled={!item.payment_receipt_url || confirmingId === item.id}
                              className="flex h-9 items-center gap-1.5 rounded-lg bg-[#173c32] px-3 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                              title={
                                item.payment_receipt_url
                                  ? 'To‘langan deb tasdiqlash'
                                  : 'Kvitansiya hali yuklanmagan'
                              }
                            >
                              {confirmingId === item.id ? (
                                <LoaderCircle className="animate-spin" size={14} />
                              ) : (
                                <Check size={14} />
                              )}
                              Tasdiqlash
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {items.length === 0 && (
                <div className="py-16 text-center text-sm text-slate-400">Komissiyalar topilmadi</div>
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
        {viewingInvoice && (
          <InvoiceModal commission={viewingInvoice} onClose={() => setViewingInvoice(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function InvoiceModal({ commission, onClose }: { commission: Commission; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <button aria-label="Yopish" onClick={onClose} className="absolute inset-0 cursor-default" />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="font-bold">Komissiya hisob-fakturasi</h3>
            <p className="mt-1 text-xs text-slate-400">Buyurtma #{commission.buyurtma_id}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <iframe
            title="commission-invoice"
            srcDoc={commission.invoice_html}
            className="h-[420px] w-full rounded-xl border border-slate-200 bg-white"
            sandbox=""
          />
        </div>
      </motion.div>
    </motion.div>
  )
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-5" aria-label="Komissiyalar yuklanmoqda">
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
