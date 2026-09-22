import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  MapPin,
  Package,
  Phone,
  UserRound,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import { api, ApiRequestError, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { resolveImage } from '../../shared/media'
import { formatMoney } from '../../shared/order'
import { SmsCodeInput } from '../../shared/SmsCodeInput'
import { useSnackbar } from '../../shared/Snackbar'
import type { BirgaOrder } from '../../shared/types'

const STATUS_LABEL: Record<string, string> = {
  awaiting_courier: 'Olish mumkin',
  with_courier: 'Yetkazilmoqda',
  issued: 'Topshirildi',
}

export function BirgaOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showSnackbar } = useSnackbar()
  const [order, setOrder] = useState<BirgaOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [acting, setActing] = useState<'claim' | 'deliver' | null>(null)
  const [code, setCode] = useState('')

  const orderId = Number(id)

  const load = useCallback(() => {
    if (!Number.isFinite(orderId) || orderId <= 0) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setLoading(true)
    api
      .birgaOrder(orderId)
      .then(setOrder)
      .catch((error) => {
        if (error instanceof ApiRequestError && (error.status === 404 || error.status === 403)) {
          setNotFound(true)
        } else {
          showSnackbar(getErrorMessage(error), 'error')
        }
      })
      .finally(() => setLoading(false))
  }, [orderId, showSnackbar])

  useEffect(() => {
    load()
  }, [load])

  async function handleClaim() {
    if (!order) return
    setActing('claim')
    try {
      const updated = await api.claimBirgaOrder(order.id)
      setOrder(updated)
      showSnackbar('Buyurtma sizga biriktirildi')
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
    } finally {
      setActing(null)
    }
  }

  async function handleDeliver() {
    if (!order || code.length !== 6) return
    setActing('deliver')
    try {
      const updated = await api.deliverBirgaOrder(order.id, code)
      setOrder(updated)
      showSnackbar('Buyurtma muvaffaqiyatli topshirildi')
      setCode('')
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
    } finally {
      setActing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-400">
        <LoaderCircle className="animate-spin" size={18} />
        Yuklanmoqda...
      </div>
    )
  }

  if (notFound || !order) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200/80 bg-white py-24 text-center">
        <Package className="text-slate-300" size={28} />
        <p className="text-sm font-semibold text-slate-500">Buyurtma topilmadi</p>
        <button
          type="button"
          onClick={() => navigate('/birga-xarid')}
          className="text-sm font-bold text-[#397461]"
        >
          Ro‘yxatga qaytish
        </button>
      </div>
    )
  }

  const cover =
    resolveImage(order.photo_snapshot) ||
    resolveImage(order.items?.find((line) => line.photo_url)?.photo_url)
  const items = order.items ?? []

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-24 lg:pb-0">
      <Link
        to="/birga-xarid"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={16} />
        Birga Xarid
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white"
      >
        {cover ? (
          <div className="aspect-[16/9] bg-slate-100">
            <img
              src={cover}
              alt={order.title_snapshot}
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}

        <div className="border-b border-slate-100 bg-[#102d26] px-5 py-5 text-white sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c9f560]/70">
            Buyurtma #{order.id}
          </p>
          <h2 className="mt-2 text-xl font-bold leading-snug">{order.title_snapshot}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#c9f560] px-2.5 py-1 text-[11px] font-bold text-[#173c32]">
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
            <span className="text-sm text-emerald-50/70">{formatDateTime(order.created_at)}</span>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info
              icon={<UserRound size={16} />}
              label="Mijoz"
              value={order.customer_name || '—'}
            />
            <Info
              icon={<Phone size={16} />}
              label="Telefon"
              value={order.customer_phone || '—'}
            />
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <MapPin size={13} />
              Manzil
            </p>
            <p className="mt-1.5 text-sm font-semibold text-slate-800">
              {[order.region_name, order.city_name, order.mfy_name].filter(Boolean).join(', ')}
            </p>
            {order.address ? <p className="mt-1 text-sm text-slate-500">{order.address}</p> : null}
          </div>

          <div className="overflow-hidden rounded-[22px] bg-[#102d26] p-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#c9f560]/75">
                  Yig‘im tarkibi
                </p>
                <p className="mt-1 text-sm font-semibold text-white/80">
                  {order.quantity} to‘plam yetkaziladi
                </p>
              </div>
              <span className="rounded-full bg-[#c9f560] px-2.5 py-1 text-[11px] font-bold text-[#102d26]">
                {formatMoney(order.unit_price)} / to‘plam
              </span>
            </div>

            {items.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {items.map((line, index) => {
                  const name =
                    (line.product_name || '').trim() || `Mahsulot #${line.product_id}`
                  const thumb = resolveImage(line.photo_url)
                  const totalDona = line.quantity * order.quantity
                  return (
                    <li
                      key={`${line.product_id}-${index}`}
                      className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-2.5"
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15">
                        {thumb ? (
                          <img src={thumb} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full place-items-center text-white/40">
                            <Package size={18} />
                          </div>
                        )}
                        <span className="absolute -left-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#c9f560] text-[10px] font-black text-[#102d26]">
                          {index + 1}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold capitalize">{name}</p>
                        <p className="mt-0.5 text-[11px] text-white/55">
                          {line.quantity} dona / to‘plam
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black text-[#c9f560]">{totalDona} dona</p>
                        {order.quantity > 1 ? (
                          <p className="text-[10px] text-white/50">{order.quantity} to‘plam</p>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="mt-3 rounded-2xl bg-white/10 px-3 py-3 text-sm text-white/80">
                {order.title_snapshot} · {order.quantity} to‘plam
              </div>
            )}
          </div>

          <div className="flex items-end justify-between rounded-2xl border border-slate-100 px-4 py-3">
            <div>
              <p className="text-xs font-semibold text-slate-400">Miqdor</p>
              <p className="mt-1 text-lg font-bold">{order.quantity} to‘plam</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-400">Summa</p>
              <p className="mt-1 text-lg font-black text-[#173c32]">
                {formatMoney(order.total_amount)}
              </p>
            </div>
          </div>

          {order.status === 'awaiting_courier' ? (
            <button
              type="button"
              disabled={acting === 'claim'}
              onClick={() => void handleClaim()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#102d26] text-sm font-bold text-[#c9f560] disabled:opacity-60"
            >
              {acting === 'claim' ? (
                <LoaderCircle className="animate-spin" size={18} />
              ) : (
                <Package size={18} />
              )}
              Buyurtmani olish
            </button>
          ) : null}

          {order.status === 'with_courier' ? (
            <div className="space-y-4 rounded-2xl border border-[#c9f560]/60 bg-[#f7faf0] p-4">
              <div>
                <p className="text-sm font-bold text-[#173c32]">Topshirish kodi</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Mijozdagi 6 xonali kodni so‘rang va kiriting.
                </p>
              </div>
              <SmsCodeInput value={code} onChange={setCode} disabled={acting === 'deliver'} />
              <button
                type="button"
                disabled={acting === 'deliver' || code.length !== 6}
                onClick={() => void handleDeliver()}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#102d26] text-sm font-bold text-[#c9f560] disabled:opacity-60"
              >
                {acting === 'deliver' ? (
                  <LoaderCircle className="animate-spin" size={18} />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                Kod bilan topshirish
              </button>
            </div>
          ) : null}

          {order.status === 'issued' ? (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={18} />
              Buyurtma mijozga topshirildi
            </div>
          ) : null}
        </div>
      </motion.section>
    </div>
  )
}

function Info({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-100 px-4 py-3">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
        {icon}
        {label}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  )
}
