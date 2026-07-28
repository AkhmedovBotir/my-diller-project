import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Check,
  ClipboardList,
  FileText,
  LoaderCircle,
  MapPin,
  Package,
  Receipt,
  Truck,
  X,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { OrderMap } from '../../shared/OrderMap'
import { formatMoney, orderStatusLabel, orderStatusStyle, paymentPhaseLabel, paymentPhaseStyle } from '../../shared/order'
import { paymentTermLabel } from '../../shared/product'
import { useSnackbar } from '../../shared/Snackbar'
import type { Order } from '../../shared/types'

export function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showSnackbar } = useSnackbar()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acting, setActing] = useState(false)
  const [docTab, setDocTab] = useState<'contract' | 'invoice'>('contract')
  const [downloading, setDownloading] = useState<'contract' | 'invoice' | null>(null)
  const [rejectTarget, setRejectTarget] = useState<'advance' | 'payment' | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      setOrder(await api.order(Number(id)))
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

  async function runAction(action: () => Promise<Order>, successMessage: string) {
    setActing(true)
    try {
      const updated = await action()
      setOrder(updated)
      showSnackbar(successMessage)
    } catch (actionError) {
      showSnackbar(getErrorMessage(actionError), 'error')
    } finally {
      setActing(false)
    }
  }

  async function handleReject(note: string) {
    if (!order || !rejectTarget) return
    setActing(true)
    try {
      const updated =
        rejectTarget === 'advance'
          ? await api.rejectAdvanceReceipt(order.id, note || undefined)
          : await api.rejectPaymentReceipt(order.id, note || undefined)
      setOrder(updated)
      showSnackbar('Kvitansiya rad etildi, xaridorga xabar yuborildi')
      setRejectTarget(null)
    } catch (rejectError) {
      showSnackbar(getErrorMessage(rejectError), 'error')
    } finally {
      setActing(false)
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
      <div className="grid min-h-[50vh] place-items-center">
        <LoaderCircle className="animate-spin text-slate-300" size={28} />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-center">
        <div>
          <AlertTriangle className="mx-auto mb-3 text-red-400" />
          <p className="text-sm font-semibold text-red-600">{error || 'Buyurtma topilmadi'}</p>
          <button onClick={() => navigate('/orders')} className="mt-4 text-xs font-bold text-[#397461]">
            Buyurtmalarga qaytish
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/orders"
            className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">{order.number}</h2>
            <p className="mt-0.5 text-xs text-slate-400">Yaratilgan: {formatDateTime(order.created_at)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-bold ${orderStatusStyle[order.status]}`}>
            {orderStatusLabel[order.status]}
          </span>
          {order.payment_phase && order.payment_phase !== 'none' && (
            <span className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-bold ${paymentPhaseStyle[order.payment_phase]}`}>
              {paymentPhaseLabel[order.payment_phase]}
            </span>
          )}
        </div>
      </div>

      {order.payment_phase === 'awaiting_advance' && (
        <AdvanceCard
          order={order}
          acting={acting}
          runAction={runAction}
          onReject={() => setRejectTarget('advance')}
        />
      )}

      {(order.status === 'tayyor_tolov_kutilmoqda' || order.status === 'yetkazildi_tolov_kutilmoqda') && (
        <PaymentReceiptCard
          order={order}
          acting={acting}
          runAction={runAction}
          onReject={() => setRejectTarget('payment')}
        />
      )}

      <ActionBar order={order} acting={acting} runAction={runAction} />

      {rejectTarget && (
        <RejectReasonModal
          title={rejectTarget === 'advance' ? 'Avans kvitansiyasini rad etish' : 'To‘lov kvitansiyasini rad etish'}
          acting={acting}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleReject}
        />
      )}

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
            <div className="flex items-center gap-3 border-b border-slate-100 p-5">
              <div className="grid size-10 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]">
                <Package size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Mahsulotlar</h3>
                <p className="text-xs text-slate-400">Buyurtma tarkibi</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3.5">Mahsulot</th>
                    <th className="px-4 py-3.5">Narx</th>
                    <th className="px-4 py-3.5">Soni</th>
                    <th className="px-5 py-3.5 text-right">Jami</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(order.items ?? []).map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-slate-800">{item.product_name}</p>
                        <p className="mt-0.5 font-mono text-xs text-slate-400">{item.product_code}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{formatMoney(item.unit_price)}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{item.quantity}</td>
                      <td className="px-5 py-4 text-right text-sm font-semibold text-slate-700">
                        {formatMoney(item.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-100">
                    <td colSpan={3} className="px-5 py-4 text-sm font-bold text-slate-700">
                      Umumiy summa
                    </td>
                    <td className="px-5 py-4 text-right text-base font-bold text-[#173c32]">
                      {formatMoney(order.total_amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
              {(order.items ?? []).length === 0 && (
                <div className="py-10 text-center text-sm text-slate-400">Mahsulotlar topilmadi</div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Hujjatlar</h3>
                  <p className="text-xs text-slate-400">Shartnoma va hisob-faktura</p>
                </div>
              </div>
              <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                <button
                  onClick={() => setDocTab('contract')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    docTab === 'contract' ? 'bg-white text-[#173c32] shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Shartnoma
                </button>
                <button
                  onClick={() => setDocTab('invoice')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    docTab === 'invoice' ? 'bg-white text-[#173c32] shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Hisob-faktura
                </button>
              </div>
            </div>
            <div className="p-5">
              {docTab === 'invoice' && order.invoice_number && (
                <p className="mb-3 text-xs font-semibold text-slate-500">
                  Hisob-faktura raqami: <span className="text-slate-800">{order.invoice_number}</span>
                </p>
              )}
              <DocumentFrame html={docTab === 'contract' ? order.contract_html : order.invoice_html} />
              <div className="mt-4 grid grid-cols-2 gap-2">
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
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
            <h3 className="mb-4 text-sm font-bold text-slate-900">Yetkazib berish</h3>
            <div className="space-y-4">
              <AddressRow icon={MapPin} label="Qabul qilish manzili" value={order.point_a_address || '—'} />
              <AddressRow icon={MapPin} label="Yetkazish manzili" value={order.point_b_address || '—'} />
            </div>
            {(order.point_a_lat != null && order.point_a_lng != null) ||
            (order.point_b_lat != null && order.point_b_lng != null) ? (
              <div className="mt-4">
                <OrderMap
                  className="h-56 w-full overflow-hidden rounded-xl border border-slate-200"
                  points={[
                    order.point_a_lat != null && order.point_a_lng != null
                      ? { lat: order.point_a_lat, lng: order.point_a_lng, label: `A nuqta: ${order.point_a_address || 'Qabul qilish manzili'}` }
                      : null,
                    order.point_b_lat != null && order.point_b_lng != null
                      ? { lat: order.point_b_lat, lng: order.point_b_lng, label: `B nuqta: ${order.point_b_address || 'Yetkazish manzili'}` }
                      : null,
                  ].filter((point): point is NonNullable<typeof point> => point !== null)}
                />
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
            <h3 className="mb-4 text-sm font-bold text-slate-900">To‘lov ma’lumotlari</h3>
            <div className="space-y-3">
              <InfoRow label="To‘lov sharti" value={paymentTermLabel[order.payment_term]} />
              {order.payment_term === 'deferred' && (
                <InfoRow label="Muddat" value={`${order.payment_days} kun`} />
              )}
              <InfoRow label="Summa" value={formatMoney(order.total_amount)} />
              {order.payment_deadline_at && (
                <InfoRow label="To‘lov muddati" value={formatDateTime(order.payment_deadline_at)} />
              )}
              {order.paid_at && <InfoRow label="To‘langan sana" value={formatDateTime(order.paid_at)} />}
            </div>

            {order.payment_receipt_url ? (
              <a
                href={order.payment_receipt_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition hover:bg-slate-100"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#eff8f3] text-[#397461]">
                  <Receipt size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-700">To‘lov kvitansiyasi</p>
                  <p className="truncate text-xs text-slate-400">Ko‘rish uchun bosing</p>
                </div>
              </a>
            ) : (
              <p className="mt-4 text-xs text-slate-400">To‘lov kvitansiyasi hali yuklanmagan</p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
            <h3 className="mb-4 text-sm font-bold text-slate-900">Jarayon vaqtlari</h3>
            <div className="space-y-3">
              <TimelineRow label="Qabul qilindi" value={order.accepted_at} />
              <TimelineRow label="Tayyor" value={order.ready_at} />
              <TimelineRow label="Kuryer oldi" value={order.picked_up_at} />
              <TimelineRow label="Jo‘natildi" value={order.shipped_at} />
              <TimelineRow label="Yetkazildi" value={order.delivered_at} />
              <TimelineRow label="Xaridor qabul qildi" value={order.buyer_received_at} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function ActionBar({
  order,
  acting,
  runAction,
}: {
  order: Order
  acting: boolean
  runAction: (action: () => Promise<Order>, successMessage: string) => Promise<void>
}) {
  if (order.status === 'yangi') {
    const advanceRequired = order.payment_term === 'prepay_100' || order.payment_term === 'pod_zakaz_50_50'
    const advancePending = advanceRequired && order.payment_phase === 'awaiting_advance' && !order.advance_confirmed_at
    return (
      <ActionCard
        icon={Check}
        title="Yangi buyurtma"
        description={
          advancePending
            ? 'Avans to‘lovi tasdiqlanmaguncha buyurtmani qabul qilib bo‘lmaydi'
            : 'Buyurtmani qabul qilib, tayyorlashni boshlang'
        }
        buttonLabel="Buyurtmani qabul qilish"
        acting={acting}
        disabled={advancePending}
        onClick={() => runAction(() => api.acceptOrder(order.id), 'Buyurtma qabul qilindi')}
      />
    )
  }

  if (order.status === 'qabul_qilindi') {
    return (
      <ActionCard
        icon={Package}
        title="Buyurtma tayyorlanmoqda"
        description="Mahsulot tayyor bo‘lgach, logistikaga uzating"
        buttonLabel="Tayyor, logistikaga uzatish"
        acting={acting}
        onClick={() => runAction(() => api.readyOrder(order.id), 'Buyurtma logistikaga uzatildi')}
      />
    )
  }

  if (order.status === 'logistikaga_uzatildi') {
    if (!order.picked_up_at) {
      return (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
          <Truck size={20} />
          <p className="text-sm font-semibold">Dostavka kompaniyasi hali yukni olib ketmadi. Iltimos kuting.</p>
        </div>
      )
    }
    return (
      <ActionCard
        icon={Truck}
        title="Yuk kuryerda"
        description="Kuryer yukni olib ketdi. Jo‘natishni tasdiqlang"
        buttonLabel="Jo‘natildi deb belgilash"
        acting={acting}
        onClick={() => runAction(() => api.shipOrder(order.id), 'Buyurtma jo‘natildi deb belgilandi')}
      />
    )
  }

  if (order.status === 'yakunlandi') {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
        <Check size={20} />
        <p className="text-sm font-semibold">Buyurtma muvaffaqiyatli yakunlandi</p>
      </div>
    )
  }

  if (order.status === 'fors_major') {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600">
        <AlertTriangle size={20} />
        <p className="text-sm font-semibold">
          Buyurtma bo‘yicha fors-major holati qayd etilgan. Bosh admin kafolatni ko‘rib chiqmoqda.
        </p>
      </div>
    )
  }

  if (order.status === 'kafolat_bilan_yopildi') {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
        <ClipboardList size={20} />
        <p className="text-sm font-semibold">Buyurtma kafolat orqali yopilgan</p>
      </div>
    )
  }

  return null
}

function ActionCard({
  icon: Icon,
  title,
  description,
  buttonLabel,
  acting,
  disabled = false,
  onClick,
}: {
  icon: typeof Check
  title: string
  description: string
  buttonLabel: string
  acting: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#173c32] text-[#c9f560]">
          <Icon size={20} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">{title}</p>
          <p className="mt-0.5 text-xs text-slate-400">{description}</p>
        </div>
      </div>
      <button
        onClick={onClick}
        disabled={acting || disabled}
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#173c32] px-5 text-sm font-bold text-white shadow-lg shadow-[#173c32]/10 disabled:opacity-50"
      >
        {acting && <LoaderCircle className="animate-spin" size={16} />}
        {buttonLabel}
      </button>
    </motion.section>
  )
}

function AdvanceCard({
  order,
  acting,
  runAction,
  onReject,
}: {
  order: Order
  acting: boolean
  runAction: (action: () => Promise<Order>, successMessage: string) => Promise<void>
  onReject: () => void
}) {
  if (order.advance_confirmed_at) return null

  if (!order.advance_receipt_url) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
        <Banknote size={20} />
        <p className="text-sm font-semibold">
          Avans talab qilinadi ({formatMoney(order.advance_amount || 0)}). Xaridor hali kvitansiya yuklamagan.
        </p>
      </div>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#173c32] text-[#c9f560]">
          <Banknote size={20} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">Avans kvitansiyasi yuklandi</p>
          <p className="mt-0.5 text-xs text-slate-400">
            Summa: {formatMoney(order.advance_amount || 0)} — tekshirib tasdiqlang
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={order.advance_receipt_url}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"
        >
          <Receipt size={16} />
          Ko‘rish
        </a>
        <button
          onClick={onReject}
          disabled={acting}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
        >
          <X size={16} />
          Rad etish
        </button>
        <button
          onClick={() => runAction(() => api.confirmAdvance(order.id), 'Avans tasdiqlandi')}
          disabled={acting}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#173c32] px-5 text-sm font-bold text-white shadow-lg shadow-[#173c32]/10 disabled:opacity-50"
        >
          {acting && <LoaderCircle className="animate-spin" size={16} />}
          Avansni tasdiqlash
        </button>
      </div>
    </motion.section>
  )
}

function PaymentReceiptCard({
  order,
  acting,
  runAction,
  onReject,
}: {
  order: Order
  acting: boolean
  runAction: (action: () => Promise<Order>, successMessage: string) => Promise<void>
  onReject: () => void
}) {
  const isSecondHalf = order.status === 'tayyor_tolov_kutilmoqda'
  const confirmMessage = isSecondHalf
    ? 'Yakuniy to‘lov tasdiqlandi, buyurtma logistikaga uzatildi'
    : 'To‘lov tasdiqlandi, buyurtma yakunlandi'

  if (!order.payment_receipt_url) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
        <Receipt size={20} />
        <p className="text-sm font-semibold">
          {isSecondHalf
            ? 'Mahsulot tayyor. Xaridorning yakuniy (2-50%) to‘lov kvitansiyasi kutilmoqda.'
            : 'Buyurtma yetkazildi. Xaridorning to‘lov kvitansiyasi kutilmoqda.'}
        </p>
      </div>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#173c32] text-[#c9f560]">
          <Receipt size={20} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">
            {isSecondHalf ? 'Yakuniy (2-50%) to‘lov kvitansiyasi yuklandi' : 'To‘lov kvitansiyasi yuklandi'}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Tekshirib tasdiqlang yoki rad eting</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={order.payment_receipt_url}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"
        >
          <Receipt size={16} />
          Ko‘rish
        </a>
        <button
          onClick={onReject}
          disabled={acting}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
        >
          <X size={16} />
          Rad etish
        </button>
        <button
          onClick={() => runAction(() => api.confirmOrderPayment(order.id), confirmMessage)}
          disabled={acting}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#173c32] px-5 text-sm font-bold text-white shadow-lg shadow-[#173c32]/10 disabled:opacity-50"
        >
          {acting && <LoaderCircle className="animate-spin" size={16} />}
          To‘lovni tasdiqlash
        </button>
      </div>
    </motion.section>
  )
}

function RejectReasonModal({
  title,
  acting,
  onClose,
  onConfirm,
}: {
  title: string
  acting: boolean
  onClose: () => void
  onConfirm: (note: string) => void
}) {
  const [note, setNote] = useState('')

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
        className="relative z-10 w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-600">
              Sabab <span className="font-normal text-slate-400">(ixtiyoriy)</span>
            </span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="Nima uchun rad etilmoqda..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100"
            />
          </label>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={onClose} className="h-11 rounded-xl px-4 text-sm font-bold text-slate-500 hover:bg-slate-100">
              Bekor qilish
            </button>
            <button
              onClick={() => onConfirm(note.trim())}
              disabled={acting}
              className="flex h-11 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white disabled:opacity-60"
            >
              {acting && <LoaderCircle className="animate-spin" size={16} />}
              Rad etish
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function DocumentFrame({ html }: { html: string }) {
  if (!html) {
    return (
      <div className="grid min-h-[200px] place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-400">
        Hujjat hali tayyorlanmagan
      </div>
    )
  }

  return (
    <iframe
      title="document"
      srcDoc={html}
      className="h-[420px] w-full rounded-xl border border-slate-200 bg-white"
      sandbox=""
    />
  )
}

function AddressRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-medium text-slate-700">{value}</p>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-700">{value}</span>
    </div>
  )
}

function TimelineRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-xs font-semibold ${value ? 'text-slate-700' : 'text-slate-300'}`}>
        {value ? formatDateTime(value) : '—'}
      </span>
    </div>
  )
}
