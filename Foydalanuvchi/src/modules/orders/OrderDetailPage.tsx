import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  Circle,
  CircleCheck,
  FileText,
  Landmark,
  LoaderCircle,
  MapPin,
  PackageCheck,
  Receipt,
  ShieldAlert,
  Timer,
  Truck,
  Upload,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { api, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { OrderMap } from '../../shared/OrderMap'
import {
  formatPrice,
  orderStatusLabel,
  orderStatusStyle,
  paymentPhaseLabel,
  paymentPhaseStyle,
  paymentTermFull,
  ORDER_STATUS_FLOW,
} from '../../shared/format'
import { useSnackbar } from '../../shared/Snackbar'
import { formatCountdown, useCountdown } from '../../shared/useCountdown'
import type { Order } from '../../shared/types'

const STEPS: Array<{ status: (typeof ORDER_STATUS_FLOW)[number]; label: string; icon: typeof Circle }> = [
  { status: 'yangi', label: 'Buyurtma qabul qilindi', icon: Circle },
  { status: 'qabul_qilindi', label: 'Ishlab chiqaruvchi tasdiqladi', icon: Check },
  { status: 'logistikaga_uzatildi', label: 'Logistikaga uzatildi', icon: Truck },
  { status: 'yolda', label: 'Yo‘lda', icon: Truck },
  { status: 'yetkazildi_tolov_kutilmoqda', label: 'Yetkazildi, to‘lov kutilmoqda', icon: PackageCheck },
  { status: 'yakunlandi', label: 'Yakunlandi', icon: CircleCheck },
]

export function OrderDetailPage() {
  const { id } = useParams()
  const { showSnackbar } = useSnackbar()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [receiving, setReceiving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingAdvance, setUploadingAdvance] = useState(false)
  const [downloading, setDownloading] = useState<'contract' | 'invoice' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const advanceInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const orderId = Number(id)
    if (!orderId) return
    setLoading(true)
    setError('')
    try {
      setOrder(await api.order(orderId))
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(task)
  }, [load])

  const countdown = useCountdown(
    order?.status === 'yetkazildi_tolov_kutilmoqda' ? order.payment_deadline_at : null,
  )

  async function handleReceive() {
    if (!order) return
    setReceiving(true)
    try {
      const updated = await api.receiveOrder(order.id)
      setOrder(updated)
      showSnackbar('Buyurtma qabul qilindi, to‘lov muddati boshlandi')
    } catch (receiveError) {
      showSnackbar(getErrorMessage(receiveError), 'error')
    } finally {
      setReceiving(false)
    }
  }

  async function handleUploadReceipt(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!order || !file) return
    setUploading(true)
    try {
      const updated = await api.uploadReceipt(order.id, file)
      setOrder(updated)
      showSnackbar('To‘lov kvitansiyasi yuklandi')
    } catch (uploadError) {
      showSnackbar(getErrorMessage(uploadError), 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleUploadAdvanceReceipt(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!order || !file) return
    setUploadingAdvance(true)
    try {
      const updated = await api.uploadAdvanceReceipt(order.id, file)
      setOrder(updated)
      showSnackbar('Avans kvitansiyasi yuklandi')
    } catch (uploadError) {
      showSnackbar(getErrorMessage(uploadError), 'error')
    } finally {
      setUploadingAdvance(false)
      if (advanceInputRef.current) advanceInputRef.current.value = ''
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
      <div className="grid min-h-[60vh] place-items-center">
        <LoaderCircle className="animate-spin text-slate-300" size={32} />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="grid min-h-[60vh] place-items-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center">
        <div>
          <AlertTriangle className="mx-auto mb-3 text-red-400" />
          <p className="text-sm font-semibold text-red-600">{error || 'Buyurtma topilmadi'}</p>
          <Link to="/orders" className="mt-4 inline-block text-xs font-bold text-[#397461]">
            Buyurtmalarga qaytish
          </Link>
        </div>
      </div>
    )
  }

  const flowIndex = ORDER_STATUS_FLOW.indexOf(order.status)
  const isSpecial = flowIndex === -1
  const effectiveIndex = isSpecial ? ORDER_STATUS_FLOW.indexOf('yetkazildi_tolov_kutilmoqda') : flowIndex

  return (
    <div className="space-y-5">
      <Link to="/orders" className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} />
        Buyurtmalarga qaytish
      </Link>

      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">{order.number}</h2>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${orderStatusStyle[order.status]}`}>
              {orderStatusLabel[order.status]}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Yaratilgan: {formatDateTime(order.created_at)}</p>
        </div>
        <p className="text-2xl font-bold tracking-tight text-[#173c32]">{formatPrice(order.total_amount)}</p>
      </section>

      {countdown && (
        <section className={`rounded-2xl border p-6 ${countdown.expired ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`grid size-11 place-items-center rounded-xl ${countdown.expired ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
              <Timer size={20} />
            </div>
            <div>
              <p className={`text-sm font-bold ${countdown.expired ? 'text-red-700' : 'text-orange-700'}`}>
                {countdown.expired ? 'To‘lov muddati tugadi' : 'To‘lov muddati'}
              </p>
              <p className={`text-2xl font-bold tracking-tight ${countdown.expired ? 'text-red-700' : 'text-orange-700'}`}>
                {formatCountdown(countdown)}
              </p>
            </div>
          </div>
        </section>
      )}

      {order.status === 'fors_major' && (
        <section className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
          <ShieldAlert className="text-red-500" size={22} />
          <p className="text-sm font-semibold text-red-700">
            To‘lov muddati o‘tib ketgani sababli buyurtma fors-major holatiga o‘tkazildi. Platforma admin bilan bog‘laning.
          </p>
        </section>
      )}

      {order.status === 'kafolat_bilan_yopildi' && (
        <section className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <ShieldAlert className="text-slate-500" size={22} />
          <p className="text-sm font-semibold text-slate-600">
            Buyurtma platforma kafolati asosida yopildi.
          </p>
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6">
            <h3 className="mb-6 font-bold text-slate-900">Buyurtma jarayoni</h3>
            <ol className="space-y-0">
              {STEPS.map((step, index) => {
                const completed = index <= effectiveIndex
                const active = index === effectiveIndex && !isSpecial
                const Icon = step.icon
                return (
                  <li key={step.status} className="relative flex gap-4 pb-8 last:pb-0">
                    {index < STEPS.length - 1 && (
                      <span
                        className={`absolute left-[15px] top-8 h-full w-0.5 ${completed ? 'bg-[#397461]' : 'bg-slate-200'}`}
                      />
                    )}
                    <div
                      className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 ${
                        completed
                          ? 'border-[#397461] bg-[#397461] text-white'
                          : 'border-slate-200 bg-white text-slate-300'
                      } ${active ? 'ring-4 ring-[#397461]/15' : ''}`}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="pt-1">
                      <p className={`text-sm font-bold ${completed ? 'text-slate-800' : 'text-slate-400'}`}>
                        {step.label}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
            <div className="border-b border-slate-100 px-6 py-5">
              <h3 className="font-bold text-slate-900">Mahsulotlar</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3">Mahsulot</th>
                    <th className="px-4 py-3">Narxi</th>
                    <th className="px-4 py-3">Miqdor</th>
                    <th className="px-6 py-3 text-right">Summa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">{item.product_name}</p>
                        <p className="mt-0.5 font-mono text-xs text-slate-400">{item.product_code}</p>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{formatPrice(item.unit_price)}</td>
                      <td className="px-4 py-4 text-slate-600">{item.quantity}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800">{formatPrice(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end border-t border-slate-100 px-6 py-4">
              <p className="text-sm font-bold text-slate-800">
                Jami: <span className="text-[#173c32]">{formatPrice(order.total_amount)}</span>
              </p>
            </div>
          </section>

          {(order.point_a_lat != null && order.point_a_lng != null) ||
          (order.point_b_lat != null && order.point_b_lng != null) ? (
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6">
              <h3 className="mb-4 font-bold text-slate-900">Xarita</h3>
              <OrderMap
                points={[
                  order.point_a_lat != null && order.point_a_lng != null
                    ? { lat: order.point_a_lat, lng: order.point_a_lng, label: `A nuqta: ${order.point_a_address || 'Olinadigan manzil'}` }
                    : null,
                  order.point_b_lat != null && order.point_b_lng != null
                    ? { lat: order.point_b_lat, lng: order.point_b_lng, label: `B nuqta: ${order.point_b_address || 'Yetkaziladigan manzil'}` }
                    : null,
                ].filter((point): point is NonNullable<typeof point> => point !== null)}
              />
            </section>
          ) : null}

          <DocumentFrame title="Shartnoma" icon={FileText} html={order.contract_html} />
          <DocumentFrame title={`Hisob-faktura ${order.invoice_number}`} icon={Receipt} html={order.invoice_html} />
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Amallar</h3>
              {order.payment_phase && (
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${paymentPhaseStyle[order.payment_phase]}`}>
                  {paymentPhaseLabel[order.payment_phase]}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {order.status === 'yolda' && (
                <button
                  onClick={() => void handleReceive()}
                  disabled={receiving}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#173c32] text-sm font-bold text-white disabled:opacity-60"
                >
                  {receiving ? <LoaderCircle className="animate-spin" size={16} /> : <PackageCheck size={16} />}
                  Yetkazib olindi deb belgilash
                </button>
              )}

              {order.payment_phase === 'awaiting_advance' && !order.advance_receipt_url && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                  <p className="text-xs font-semibold text-orange-700">
                    Avans to‘lovi talab qilinadi: <span className="font-bold">{formatPrice(order.advance_amount || 0)}</span>
                  </p>
                  <label className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#173c32] text-sm font-bold text-white transition hover:bg-[#0f2721]">
                    {uploadingAdvance ? <LoaderCircle className="animate-spin" size={16} /> : <Upload size={16} />}
                    {uploadingAdvance ? 'Yuklanmoqda...' : 'Avans kvitansiyasini yuklash'}
                    <input
                      ref={advanceInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                      className="hidden"
                      onChange={(event) => void handleUploadAdvanceReceipt(event)}
                    />
                  </label>
                </div>
              )}

              {order.advance_receipt_url && (
                <a
                  href={order.advance_receipt_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  <Receipt size={16} />
                  {order.advance_confirmed_at ? 'Avans kvitansiyasi (tasdiqlangan)' : 'Avans kvitansiyasi (kutilmoqda)'}
                </a>
              )}

              {order.status === 'yetkazildi_tolov_kutilmoqda' && !order.payment_receipt_url && (
                <label className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#173c32] text-sm font-bold text-white transition hover:bg-[#0f2721]">
                  {uploading ? <LoaderCircle className="animate-spin" size={16} /> : <Upload size={16} />}
                  {uploading ? 'Yuklanmoqda...' : 'To‘lov kvitansiyasini yuklash'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    className="hidden"
                    onChange={(event) => void handleUploadReceipt(event)}
                  />
                </label>
              )}

              {order.payment_receipt_url && (
                <a
                  href={order.payment_receipt_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  <Receipt size={16} />
                  Yuklangan kvitansiyani ko‘rish
                </a>
              )}

              {!['yolda', 'yetkazildi_tolov_kutilmoqda'].includes(order.status) &&
                !order.payment_receipt_url &&
                order.payment_phase !== 'awaiting_advance' && (
                  <p className="text-center text-xs text-slate-400">Hozircha amal talab qilinmaydi</p>
                )}

              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
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
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6">
            <h3 className="font-bold text-slate-900">Buyurtma ma’lumotlari</h3>
            <InfoRow icon={Landmark} label="To‘lov sharti" value={paymentTermFull(order.payment_term, order.payment_days)} />
            <InfoRow icon={MapPin} label="Olinadigan manzil (A)" value={order.point_a_address || '—'} />
            <InfoRow icon={MapPin} label="Yetkaziladigan manzil (B)" value={order.point_b_address || '—'} />
            <InfoRow icon={Receipt} label="Hisob-faktura" value={order.invoice_number} />
          </section>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
      <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-700">{value}</p>
      </div>
    </div>
  )
}

function DocumentFrame({
  title,
  icon: Icon,
  html,
}: {
  title: string
  icon: typeof FileText
  html: string
}) {
  const [expanded, setExpanded] = useState(false)
  if (!html) return null

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
      <button
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between px-6 py-5 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Icon size={16} className="text-slate-400" />
          {title}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border-t border-slate-100 p-3"
        >
          <iframe title={title} srcDoc={html} sandbox="" className="h-[420px] w-full rounded-xl border border-slate-100 bg-white" />
        </motion.div>
      )}
    </section>
  )
}
