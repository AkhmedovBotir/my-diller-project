import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  UploadCloud,
  X,
} from 'lucide-react'
import { api, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { commissionStatusLabel, commissionStatusStyle, formatMoney } from '../../shared/order'
import { useSnackbar } from '../../shared/Snackbar'
import type { Commission } from '../../shared/types'

export function CommissionsPage() {
  const { showSnackbar } = useSnackbar()
  const [items, setItems] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [offset, setOffset] = useState(0)
  const [viewingInvoice, setViewingInvoice] = useState<Commission | null>(null)
  const [uploadingFor, setUploadingFor] = useState<Commission | null>(null)
  const [markingPaidId, setMarkingPaidId] = useState<number | null>(null)
  const limit = 20

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await api.commissions({ limit, offset }))
    } catch (loadError) {
      const message = getErrorMessage(loadError)
      setError(message)
      showSnackbar(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [offset, showSnackbar])

  useEffect(() => {
    const task = window.setTimeout(() => void loadItems(), 0)
    return () => window.clearTimeout(task)
  }, [loadItems])

  const totals = useMemo(() => {
    const pending = items.filter((item) => item.status === 'pending').reduce((sum, item) => sum + item.amount, 0)
    const paid = items.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0)
    return { pending, paid }
  }, [items])

  async function markPaid(commission: Commission) {
    setMarkingPaidId(commission.id)
    try {
      const updated = await api.markCommissionPaid(commission.id)
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      showSnackbar('Komissiya to‘langan deb belgilandi')
    } catch (markError) {
      showSnackbar(getErrorMessage(markError), 'error')
    } finally {
      setMarkingPaidId(null)
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
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Platforma komissiyasi</h2>
          <p className="mt-1 text-xs text-slate-400">
            Har bir yakunlangan buyurtma uchun platforma komissiyasini to‘lang
          </p>
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
                          {item.status === 'pending' && (
                            <>
                              <button
                                onClick={() => setUploadingFor(item)}
                                className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                                title="Kvitansiya yuklash"
                              >
                                <UploadCloud size={14} />
                                {item.payment_receipt_url ? 'Qayta yuklash' : 'Kvitansiya'}
                              </button>
                              <button
                                onClick={() => void markPaid(item)}
                                disabled={!item.payment_receipt_url || markingPaidId === item.id}
                                className="flex h-9 items-center gap-1.5 rounded-lg bg-[#173c32] px-3 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                                title={
                                  item.payment_receipt_url
                                    ? 'To‘langan deb belgilash'
                                    : 'Avval kvitansiya yuklang'
                                }
                              >
                                {markingPaidId === item.id ? (
                                  <LoaderCircle className="animate-spin" size={14} />
                                ) : (
                                  <Check size={14} />
                                )}
                                To‘landi
                              </button>
                            </>
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
        {uploadingFor && (
          <UploadReceiptModal
            commission={uploadingFor}
            onClose={() => setUploadingFor(null)}
            onUploaded={(updated) => {
              setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
              setUploadingFor(null)
            }}
          />
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

function UploadReceiptModal({
  commission,
  onClose,
  onUploaded,
}: {
  commission: Commission
  onClose: () => void
  onUploaded: (commission: Commission) => void
}) {
  const { showSnackbar } = useSnackbar()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload() {
    if (!file) {
      showSnackbar('Fayl tanlang', 'error')
      return
    }
    setUploading(true)
    try {
      const updated = await api.uploadCommissionReceipt(commission.id, file)
      showSnackbar('Kvitansiya yuklandi')
      onUploaded(updated)
    } catch (uploadError) {
      showSnackbar(getErrorMessage(uploadError), 'error')
    } finally {
      setUploading(false)
    }
  }

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
        className="relative z-10 w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="font-bold">To‘lov kvitansiyasini yuklash</h3>
            <p className="mt-1 text-xs text-slate-400">Buyurtma #{commission.buyurtma_id} komissiyasi</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <label
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 px-4 py-10 transition hover:bg-slate-50"
          >
            <UploadCloud className="text-slate-400" size={24} />
            <span className="text-sm font-semibold text-slate-600">
              {file ? file.name : 'Faylni tanlash uchun bosing'}
            </span>
            <span className="text-xs text-slate-400">jpeg, png, webp yoki pdf</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <div className="mt-6 flex justify-end gap-2">
            <button onClick={onClose} className="h-11 rounded-xl px-4 text-sm font-bold text-slate-500 hover:bg-slate-100">
              Bekor qilish
            </button>
            <button
              onClick={() => void handleUpload()}
              disabled={uploading}
              className="flex h-11 items-center gap-2 rounded-xl bg-[#173c32] px-5 text-sm font-bold text-white disabled:opacity-60"
            >
              {uploading && <LoaderCircle className="animate-spin" size={16} />}
              {uploading ? 'Yuklanmoqda...' : 'Yuklash'}
            </button>
          </div>
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
