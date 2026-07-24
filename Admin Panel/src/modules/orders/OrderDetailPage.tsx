import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  FileText,
  LoaderCircle,
  MapPin,
  Package,
  Receipt,
  ShieldCheck,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { formatMoney, orderStatusLabel, orderStatusStyle, paymentTermLabel } from '../../shared/order'
import { useSnackbar } from '../../shared/Snackbar'
import { useAuth } from '../auth/AuthContext'
import type { Order } from '../../shared/types'

export function OrderDetailPage() {
  const { id } = useParams()
  const { admin } = useAuth()
  const navigate = useNavigate()
  const { showSnackbar } = useSnackbar()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acting, setActing] = useState(false)
  const [docTab, setDocTab] = useState<'contract' | 'invoice'>('contract')
  const [downloading, setDownloading] = useState<'contract' | 'invoice' | null>(null)

  const basePath = admin ? `/${admin.type}` : ''

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

  async function handleGuarantee() {
    if (!order) return
    setActing(true)
    try {
      const updated = await api.guaranteeOrder(order.id)
      setOrder(updated)
      showSnackbar('Buyurtma kafolat orqali yopildi')
    } catch (actionError) {
      showSnackbar(getErrorMessage(actionError), 'error')
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
          <button onClick={() => navigate(`${basePath}/orders`)} className="mt-4 text-xs font-bold text-[#397461]">
            Buyurtmalarga qaytish
          </button>
        </div>
      </div>
    )
  }

  const canGuarantee = admin?.type === 'general' && order.status === 'fors_major'

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={`${basePath}/orders`}
            className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">{order.number}</h2>
            <p className="mt-0.5 text-xs text-slate-400">Yaratilgan: {formatDateTime(order.created_at)}</p>
          </div>
        </div>
        <span className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-bold ${orderStatusStyle[order.status]}`}>
          {orderStatusLabel[order.status]}
        </span>
      </div>

      {canGuarantee && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-red-600 text-white">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-red-700">Fors-major holati aniqlandi</p>
              <p className="mt-0.5 text-xs text-red-500">
                Zaxira balansdan kafolat to‘lovini amalga oshirib, buyurtmani yoping
              </p>
            </div>
          </div>
          <button
            onClick={() => void handleGuarantee()}
            disabled={acting}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white shadow-lg shadow-red-600/20 disabled:opacity-50"
          >
            {acting && <LoaderCircle className="animate-spin" size={16} />}
            Kafolat bilan yopish
          </button>
        </motion.section>
      )}

      {order.status === 'fors_major' && !canGuarantee && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600">
          <AlertTriangle size={20} />
          <p className="text-sm font-semibold">
            Buyurtma fors-major holatida. Kafolat to‘lovini faqat bosh admin amalga oshira oladi.
          </p>
        </div>
      )}

      {order.status === 'kafolat_bilan_yopildi' && (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
          <Check size={20} />
          <p className="text-sm font-semibold">Buyurtma kafolat orqali yopilgan</p>
        </div>
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
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
            <h3 className="mb-4 text-sm font-bold text-slate-900">To‘lov ma’lumotlari</h3>
            <div className="space-y-3">
              <InfoRow label="To‘lov sharti" value={paymentTermLabel[order.payment_term]} />
              {order.payment_term === 'deferred' && (
                <InfoRow label="Muddat" value={`${order.payment_days} kun`} />
              )}
              <InfoRow label="Summa" value={formatMoney(order.total_amount)} />
              <InfoRow label="Xaridor" value={`#${order.xaridor_id}`} />
              <InfoRow label="Ishlab chiqaruvchi" value={`#${order.ishlabchiqaruvchi_id}`} />
              {order.dostavka_id && <InfoRow label="Dostavka" value={`#${order.dostavka_id}`} />}
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
              {order.force_majeure_at && <TimelineRow label="Fors-major" value={order.force_majeure_at} />}
              {order.guarantee_paid_at && <TimelineRow label="Kafolat to‘landi" value={order.guarantee_paid_at} />}
            </div>
          </section>
        </div>
      </div>
    </div>
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
