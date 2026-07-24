import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  MapPin,
  Navigation,
  PackageCheck,
  Truck,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiRequestError, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { OrderMap } from '../../shared/OrderMap'
import { formatMoney, needsDelivery, needsPickup, orderStatusLabels, orderStatusTones } from '../../shared/order'
import { useSnackbar } from '../../shared/Snackbar'
import type { Order } from '../../shared/types'

export function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showSnackbar } = useSnackbar()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [acting, setActing] = useState<'pickup' | 'deliver' | null>(null)

  const orderId = Number(id)

  const load = useCallback(() => {
    if (!Number.isFinite(orderId) || orderId <= 0) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setLoading(true)
    api
      .order(orderId)
      .then(setOrder)
      .catch((error) => {
        if (error instanceof ApiRequestError && (error.status === 404 || error.status === 403)) {
          setNotFound(true)
        } else {
          showSnackbar(getErrorMessage(error), 'error')
        }
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  useEffect(() => {
    load()
  }, [load])

  async function handlePickup() {
    if (!order) return
    setActing('pickup')
    try {
      const updated = await api.pickupOrder(order.id)
      setOrder(updated)
      showSnackbar('Yuk olib ketilgani belgilandi')
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
    } finally {
      setActing(null)
    }
  }

  async function handleDeliver() {
    if (!order) return
    setActing('deliver')
    try {
      const updated = await api.deliverOrder(order.id)
      setOrder(updated)
      showSnackbar('Buyurtma yetkazilgani belgilandi')
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
        <div className="grid size-14 place-items-center rounded-2xl bg-slate-50 text-slate-300">
          <Truck size={26} />
        </div>
        <p className="text-sm font-semibold text-slate-500">Buyurtma topilmadi</p>
        <Link to="/deliveries" className="text-xs font-bold text-[#397461] hover:underline">
          Ro‘yxatga qaytish
        </Link>
      </div>
    )
  }

  const showPickupButton = needsPickup(order)
  const showDeliverButton = needsDelivery(order)

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/deliveries')}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-slate-800"
      >
        <ArrowLeft size={15} /> Ro‘yxatga qaytish
      </button>

      <section className="flex flex-col justify-between gap-6 rounded-[24px] border border-slate-200/80 bg-white p-6 sm:flex-row sm:items-center sm:p-8">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">№ {order.number}</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${orderStatusTones[order.status]}`}>
              {orderStatusLabels[order.status]}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-400">Yaratilgan: {formatDateTime(order.created_at)}</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">Summasi: {formatMoney(order.total_amount)}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {showPickupButton && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handlePickup}
              disabled={acting !== null}
              className="flex h-12 items-center gap-2 rounded-xl bg-[#173c32] px-5 text-sm font-bold text-white shadow-lg shadow-[#173c32]/10 transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {acting === 'pickup' ? <LoaderCircle className="animate-spin" size={17} /> : <ClipboardList size={17} />}
              Yukni oldim
            </motion.button>
          )}
          {showDeliverButton && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleDeliver}
              disabled={acting !== null}
              className="flex h-12 items-center gap-2 rounded-xl bg-[#c9f560] px-5 text-sm font-bold text-[#173c32] shadow-lg shadow-[#c9f560]/20 transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {acting === 'deliver' ? <LoaderCircle className="animate-spin" size={17} /> : <PackageCheck size={17} />}
              Yetkazib berdim
            </motion.button>
          )}
          {!showPickupButton && !showDeliverButton && (
            <span className="flex h-12 items-center gap-2 rounded-xl bg-[#efffcf] px-5 text-sm font-bold text-[#4d7c0f]">
              <CheckCircle2 size={17} />
              Yakunlangan
            </span>
          )}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <PointCard
          title="A nuqta — Yuklash"
          subtitle="Ishlab chiqaruvchidan olib ketish manzili"
          address={order.point_a_address}
          lat={order.point_a_lat}
          lng={order.point_a_lng}
          done={Boolean(order.picked_up_at)}
          doneLabel={order.picked_up_at ? `Olib ketildi: ${formatDateTime(order.picked_up_at)}` : undefined}
          accent="orange"
        />
        <PointCard
          title="B nuqta — Yetkazish"
          subtitle="Xaridorga yetkazib berish manzili"
          address={order.point_b_address}
          lat={order.point_b_lat}
          lng={order.point_b_lng}
          done={Boolean(order.delivered_at)}
          doneLabel={order.delivered_at ? `Yetkazildi: ${formatDateTime(order.delivered_at)}` : undefined}
          accent="green"
        />
      </section>

      {(order.point_a_lat != null && order.point_a_lng != null) ||
      (order.point_b_lat != null && order.point_b_lng != null) ? (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <h3 className="mb-5 font-bold text-slate-900">Xarita</h3>
          <OrderMap
            points={[
              order.point_a_lat != null && order.point_a_lng != null
                ? { lat: order.point_a_lat, lng: order.point_a_lng, label: `A nuqta — Yuklash: ${order.point_a_address || ''}` }
                : null,
              order.point_b_lat != null && order.point_b_lng != null
                ? { lat: order.point_b_lat, lng: order.point_b_lng, label: `B nuqta — Yetkazish: ${order.point_b_address || ''}` }
                : null,
            ].filter((point): point is NonNullable<typeof point> => point !== null)}
          />
        </section>
      ) : null}

      {order.items && order.items.length > 0 && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <h3 className="mb-5 font-bold text-slate-900">Buyurtma tarkibi</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                  <th className="pb-3 font-semibold">Mahsulot</th>
                  <th className="pb-3 font-semibold">Miqdor</th>
                  <th className="pb-3 text-right font-semibold">Summa</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3">
                      <p className="font-semibold text-slate-700">{item.product_name}</p>
                      <p className="text-xs text-slate-400">{item.product_code}</p>
                    </td>
                    <td className="py-3 text-slate-600">{item.quantity}</td>
                    <td className="py-3 text-right font-semibold text-slate-700">{formatMoney(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function PointCard({
  title,
  subtitle,
  address,
  lat,
  lng,
  done,
  doneLabel,
  accent,
}: {
  title: string
  subtitle: string
  address: string
  lat: number | null
  lng: number | null
  done: boolean
  doneLabel?: string
  accent: 'orange' | 'green'
}) {
  const iconClass = accent === 'orange' ? 'bg-orange-50 text-orange-500' : 'bg-[#eff8f3] text-[#397461]'
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`grid size-11 place-items-center rounded-xl ${iconClass}`}>
            <MapPin size={20} />
          </div>
          <div>
            <p className="font-bold text-slate-800">{title}</p>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>
        {done && (
          <span className="flex items-center gap-1 rounded-full bg-[#efffcf] px-2.5 py-1 text-[10px] font-bold text-[#4d7c0f]">
            <CheckCircle2 size={12} /> Bajarildi
          </span>
        )}
      </div>

      <p className="text-sm font-semibold leading-6 text-slate-700">{address || 'Manzil ko‘rsatilmagan'}</p>

      {lat != null && lng != null ? (
        <a
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          <Navigation size={14} />
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </a>
      ) : (
        <p className="mt-4 text-xs text-slate-400">Koordinatalar ko‘rsatilmagan</p>
      )}

      {doneLabel && <p className="mt-3 text-xs font-semibold text-slate-400">{doneLabel}</p>}
    </article>
  )
}
