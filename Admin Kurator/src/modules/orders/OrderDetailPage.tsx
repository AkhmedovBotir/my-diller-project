import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileText,
  LoaderCircle,
  MapPin,
  Receipt,
  ShieldAlert,
  X,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { OrderMap } from '../../shared/OrderMap'
import {
  buildTimeline,
  formatPrice,
  isForceMajeureEligible,
  orderStatusLabel,
  orderStatusStyle,
  paymentTermLabel,
} from '../../shared/order'
import { useSnackbar } from '../../shared/Snackbar'
import type { Order } from '../../shared/types'

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showSnackbar } = useSnackbar()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeDocument, setActiveDocument] = useState<{ title: string; html: string } | null>(null)
  const [confirmingForceMajeure, setConfirmingForceMajeure] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [downloading, setDownloading] = useState<'contract' | 'invoice' | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      setOrder(await api.kuratorOrder(Number(id)))
    } catch (loadError) {
      const message = getErrorMessage(loadError)
      setError(message)
      showSnackbar(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [id, showSnackbar])

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(task)
  }, [load])

  async function handleForceMajeure() {
    if (!order) return
    setSubmitting(true)
    try {
      const updated = await api.forceMajeure(order.id)
      setOrder(updated)
      showSnackbar('Buyurtma fors-major holatiga o‘tkazildi')
      setConfirmingForceMajeure(false)
    } catch (submitError) {
      showSnackbar(getErrorMessage(submitError), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDownloadContract() {
    if (!order) return
    setDownloading('contract')
    try {
      await api.downloadContractPdf(order.id, order.number)
    } catch (downloadError) {
      showSnackbar(getErrorMessage(downloadError), 'error')
    } finally {
      setDownloading(null)
    }
  }

  async function handleDownloadInvoice() {
    if (!order) return
    setDownloading('invoice')
    try {
      await api.downloadInvoicePdf(order.id, order.invoice_number)
    } catch (downloadError) {
      showSnackbar(getErrorMessage(downloadError), 'error')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-10 w-40 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-48 animate-pulse rounded-2xl bg-white" />
        <div className="h-72 animate-pulse rounded-2xl bg-white" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="grid min-h-72 place-items-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center">
        <div>
          <AlertTriangle className="mx-auto mb-3 text-red-400" />
          <p className="text-sm font-semibold text-red-600">{error || 'Buyurtma topilmadi'}</p>
          <button onClick={() => void load()} className="mt-4 text-xs font-bold text-[#397461]">
            Qayta urinish
          </button>
        </div>
      </div>
    )
  }

  const timeline = buildTimeline(order)
  const eligible = isForceMajeureEligible(order)

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate('/orders')}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft size={16} />
        Buyurtmalarga qaytish
      </button>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">{order.number}</h2>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${orderStatusStyle[order.status]}`}>
                {orderStatusLabel[order.status]}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">Yaratilgan: {formatDateTime(order.created_at)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Umumiy summa</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900">{formatPrice(order.total_amount)}</p>
          </div>
        </div>

        {eligible && (
          <div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 shrink-0 text-orange-500" size={20} />
              <div>
                <p className="text-sm font-bold text-orange-800">To‘lov muddati o‘tib ketgan</p>
                <p className="mt-0.5 text-xs text-orange-600">
                  To‘lov muddati: {order.payment_deadline_at ? formatDateTime(order.payment_deadline_at) : '—'}.
                  Fors-major holatini belgilashingiz mumkin.
                </p>
              </div>
            </div>
            <button
              onClick={() => setConfirmingForceMajeure(true)}
              className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700"
            >
              <ShieldAlert size={16} />
              Fors-major belgilash
            </button>
          </div>
        )}

        {order.status === 'fors_major' && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <ShieldAlert className="mt-0.5 shrink-0 text-red-500" size={20} />
            <div>
              <p className="text-sm font-bold text-red-700">Fors-major holati belgilangan</p>
              <p className="mt-0.5 text-xs text-red-500">
                {order.force_majeure_at ? formatDateTime(order.force_majeure_at) : '—'} sanasida qayd etildi
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2">
          <InfoBlock
            icon={MapPin}
            label="Olib ketish manzili"
            value={order.point_a_address || '—'}
          />
          <InfoBlock
            icon={MapPin}
            label="Yetkazib berish manzili"
            value={order.point_b_address || '—'}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <MetaRow label="To‘lov sharti" value={paymentTermLabel[order.payment_term]} />
          <MetaRow label="Kechiktirish (kun)" value={order.payment_days ? String(order.payment_days) : '—'} />
          <MetaRow label="Hisob-faktura raqami" value={order.invoice_number || '—'} />
        </div>

        {(order.point_a_lat != null && order.point_a_lng != null) ||
        (order.point_b_lat != null && order.point_b_lng != null) ? (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <h3 className="mb-4 text-sm font-bold text-slate-900">Xarita</h3>
            <OrderMap
              points={[
                order.point_a_lat != null && order.point_a_lng != null
                  ? { lat: order.point_a_lat, lng: order.point_a_lng, label: `A nuqta: ${order.point_a_address || 'Olib ketish manzili'}` }
                  : null,
                order.point_b_lat != null && order.point_b_lng != null
                  ? { lat: order.point_b_lat, lng: order.point_b_lng, label: `B nuqta: ${order.point_b_address || 'Yetkazib berish manzili'}` }
                  : null,
              ].filter((point): point is NonNullable<typeof point> => point !== null)}
            />
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-6">
        <h3 className="mb-5 font-bold text-slate-900">Buyurtma tarkibi</h3>
        {order.items && order.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2 pr-3">Mahsulot</th>
                  <th className="py-2 pr-3">Kod</th>
                  <th className="py-2 pr-3">Narx</th>
                  <th className="py-2 pr-3">Soni</th>
                  <th className="py-2 text-right">Summa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-3 font-semibold text-slate-700">{item.product_name}</td>
                    <td className="py-3 pr-3 font-mono text-xs text-slate-400">{item.product_code}</td>
                    <td className="py-3 pr-3 text-slate-600">{formatPrice(item.unit_price)}</td>
                    <td className="py-3 pr-3 text-slate-600">{item.quantity}</td>
                    <td className="py-3 text-right font-semibold text-slate-800">{formatPrice(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Mahsulotlar ma’lumoti mavjud emas</p>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_.8fr]">
        <article className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <h3 className="mb-6 font-bold text-slate-900">Buyurtma tarixi</h3>
          <ol className="space-y-5">
            {timeline.map((step, index) => (
              <li key={step.key} className="relative flex gap-3">
                {index < timeline.length - 1 && (
                  <span
                    className={`absolute left-[9px] top-6 h-full w-px ${step.done ? 'bg-[#397461]/40' : 'bg-slate-200'}`}
                  />
                )}
                {step.done ? (
                  <CheckCircle2 size={19} className="shrink-0 text-[#397461]" />
                ) : (
                  <Circle size={19} className="shrink-0 text-slate-300" />
                )}
                <div className="min-w-0 pb-1">
                  <p className={`text-sm font-semibold ${step.done ? 'text-slate-800' : 'text-slate-400'}`}>
                    {step.label}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {step.at ? formatDateTime(step.at) : 'Hali amalga oshmagan'}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <h3 className="mb-5 font-bold text-slate-900">Hujjatlar</h3>
          <div className="space-y-2.5">
            <DocumentRow
              icon={FileText}
              label="Shartnoma"
              disabled={!order.contract_html}
              onClick={() => setActiveDocument({ title: 'Shartnoma', html: order.contract_html })}
            />
            <DocumentRow
              icon={Receipt}
              label="Hisob-faktura"
              disabled={!order.invoice_html}
              onClick={() => setActiveDocument({ title: 'Hisob-faktura', html: order.invoice_html })}
            />
            {order.payment_receipt_url ? (
              <a
                href={order.payment_receipt_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-sm font-semibold text-slate-700 transition hover:border-[#397461]/20 hover:bg-[#eff8f3]"
              >
                <Receipt size={17} className="text-slate-400" />
                To‘lov kvitansiyasi
              </a>
            ) : (
              <DocumentRow icon={Receipt} label="To‘lov kvitansiyasi" disabled onClick={() => undefined} />
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
            <button
              onClick={() => void handleDownloadContract()}
              disabled={downloading === 'contract'}
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              {downloading === 'contract' ? <LoaderCircle className="animate-spin" size={14} /> : <FileText size={14} />}
              Shartnoma PDF
            </button>
            <button
              onClick={() => void handleDownloadInvoice()}
              disabled={downloading === 'invoice'}
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              {downloading === 'invoice' ? <LoaderCircle className="animate-spin" size={14} /> : <Receipt size={14} />}
              Hisob-faktura PDF
            </button>
          </div>
        </article>
      </section>

      <AnimatePresence>
        {activeDocument && (
          <DocumentModal document={activeDocument} onClose={() => setActiveDocument(null)} />
        )}
        {confirmingForceMajeure && (
          <ForceMajeureModal
            submitting={submitting}
            onCancel={() => setConfirmingForceMajeure(false)}
            onConfirm={() => void handleForceMajeure()}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function InfoBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        <Icon size={13} />
        {label}
      </div>
      <p className="text-sm font-semibold text-slate-700">{value}</p>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{value}</p>
    </div>
  )
}

function DocumentRow({
  icon: Icon,
  label,
  disabled,
  onClick,
}: {
  icon: typeof FileText
  label: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-left text-sm font-semibold transition ${
        disabled
          ? 'cursor-not-allowed text-slate-300'
          : 'text-slate-700 hover:border-[#397461]/20 hover:bg-[#eff8f3]'
      }`}
    >
      <Icon size={17} className={disabled ? 'text-slate-300' : 'text-slate-400'} />
      {label}
      {disabled && <span className="ml-auto text-[11px] font-normal text-slate-300">Mavjud emas</span>}
    </button>
  )
}

function DocumentModal({
  document,
  onClose,
}: {
  document: { title: string; html: string }
  onClose: () => void
}) {
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
        className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <h3 className="font-bold text-slate-900">{document.title}</h3>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4">
          <iframe
            title={document.title}
            srcDoc={document.html}
            className="h-[70vh] w-full rounded-xl border border-slate-200 bg-white"
            sandbox=""
          />
        </div>
      </motion.div>
    </motion.div>
  )
}

function ForceMajeureModal({
  submitting,
  onCancel,
  onConfirm,
}: {
  submitting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <button aria-label="Yopish" onClick={onCancel} className="absolute inset-0 cursor-default" />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="px-6 py-6 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-orange-50 text-orange-500">
            <ShieldAlert size={24} />
          </div>
          <h3 className="mt-5 text-lg font-bold">Fors-major belgilaysizmi?</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Buyurtma to‘lov muddati o‘tib ketgan. Fors-major holatini belgilash bosh adminlarga
            xabar yuboradi va buyurtma holatini o‘zgartiradi.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={onCancel}
              className="h-10 rounded-xl px-4 text-sm font-bold text-slate-500 hover:bg-slate-100"
            >
              Bekor qilish
            </button>
            <button
              disabled={submitting}
              onClick={onConfirm}
              className="flex h-10 items-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {submitting ? <LoaderCircle className="animate-spin" size={16} /> : null}
              Tasdiqlash
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}