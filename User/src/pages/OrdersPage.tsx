import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { EmptyState, FadeIn, PageHeader } from '../app/AppShell'
import { api } from '../shared/api'
import { useAuth } from '../shared/AuthContext'
import { formatDateTime } from '../shared/date'
import { formatMoney, resolveImage } from '../shared/money'
import {
  ORDER_STATUS_LABEL,
  ORDER_STEPS,
  type Order,
} from '../shared/types'

export function OrdersPage() {
  const { customer, loading: authLoading, requireAuth } = useAuth()
  const [items, setItems] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!customer) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setItems(await api.orders())
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!customer) {
      requireAuth(() => void load())
      return
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id, authLoading])

  if (authLoading) {
    return (
      <div>
        <PageHeader title="Buyurtmalar" subtitle="Buyurtmalar tarixi va jarayon holati." />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-[24px] bg-white/70" />
          ))}
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div>
        <PageHeader title="Buyurtmalar" subtitle="Buyurtmalar tarixi va jarayon holati." />
        <EmptyState
          title="Kirish kerak"
          text="Telefon orqali kirish oynasi ochiladi — kirgach buyurtmalar shu yerda chiqadi."
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Buyurtmalar"
        subtitle="Buyurtmani bosing — holat va topshirish kodi batafsil ochiladi."
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-[24px] bg-white/70" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Buyurtmalar yo‘q"
          text="Birinchi yig‘imga qo‘shiling — buyurtma shu yerda chiqadi."
        />
      ) : (
        <div className="space-y-3">
          {items.map((order, index) => {
            const photo = resolveImage(order.photo_snapshot)
            const stepIndex = ORDER_STEPS.indexOf(order.status as (typeof ORDER_STEPS)[number])
            const showCode =
              Boolean(order.pickup_code) &&
              order.status !== 'cancelled' &&
              order.status !== 'issued'
            return (
              <FadeIn key={order.id} delay={index * 0.04}>
                <Link
                  to={`/buyurtmalar/${order.id}`}
                  className="flex gap-3 rounded-[24px] bg-white p-3 ring-1 ring-[#102d26]/6 transition hover:ring-[#102d26]/20 sm:gap-4 sm:p-4"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#102d26]/5 sm:h-24 sm:w-24">
                    {photo ? (
                      <img src={photo} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#5f7a70]">
                          #{order.id} · {formatDateTime(order.created_at)}
                        </p>
                        <h3 className="mt-1 line-clamp-2 font-bold leading-snug">
                          {order.title_snapshot || `Yig‘im #${order.group_buy_id}`}
                        </h3>
                      </div>
                      <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[#5f7a70]" />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#c9f560]/40 px-2.5 py-1 text-[11px] font-bold text-[#102d26]">
                        {ORDER_STATUS_LABEL[order.status] ?? order.status}
                      </span>
                      <span className="text-sm font-black">{formatMoney(order.total_amount)}</span>
                      <span className="text-xs text-[#5f7a70]">
                        {order.quantity} × {formatMoney(order.unit_price)}
                      </span>
                    </div>
                    {order.status !== 'cancelled' && stepIndex >= 0 ? (
                      <div className="mt-3 grid grid-cols-4 gap-1.5">
                        {ORDER_STEPS.map((step, i) => (
                          <div
                            key={step}
                            className={`h-1 rounded-full ${
                              stepIndex >= i ? 'bg-[#102d26]' : 'bg-[#e8eee9]'
                            }`}
                          />
                        ))}
                      </div>
                    ) : null}
                    {showCode ? (
                      <p className="mt-2 text-xs font-semibold text-[#102d26]">
                        Kod: <span className="font-mono tracking-widest">{order.pickup_code}</span>
                      </p>
                    ) : null}
                  </div>
                </Link>
              </FadeIn>
            )
          })}
        </div>
      )}
    </div>
  )
}
