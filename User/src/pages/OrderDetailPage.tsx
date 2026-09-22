import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Package, ShieldCheck } from 'lucide-react'
import { EmptyState, FadeIn, PageHeader } from '../app/AppShell'
import { api, ApiRequestError } from '../shared/api'
import { useAuth } from '../shared/AuthContext'
import { formatDateTime } from '../shared/date'
import { formatMoney, resolveImage } from '../shared/money'
import { toast } from '../shared/Snackbar'
import {
  ORDER_STATUS_HELP,
  ORDER_STATUS_LABEL,
  ORDER_STEPS,
  type GroupBuy,
  type Order,
} from '../shared/types'

export function OrderDetailPage() {
  const { id: idParam } = useParams()
  const id = Number(idParam)
  const navigate = useNavigate()
  const { customer, loading: authLoading, requireAuth } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [groupBuy, setGroupBuy] = useState<GroupBuy | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  async function load() {
    if (!customer || !id) {
      setOrder(null)
      setGroupBuy(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const next = await api.order(id)
      setOrder(next)
      try {
        setGroupBuy(await api.groupBuy(next.group_buy_id))
      } catch {
        setGroupBuy(null)
      }
    } catch {
      setOrder(null)
      setGroupBuy(null)
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
  }, [customer?.id, authLoading, id])

  async function cancel() {
    if (!order) return
    setBusy(true)
    try {
      const updated = await api.cancelOrder(order.id)
      setOrder(updated)
      toast('Buyurtma bekor qilindi')
    } catch (error) {
      toast(error instanceof ApiRequestError ? error.message : 'Bekor qilib bo‘lmadi', 'err')
    } finally {
      setBusy(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div>
        <PageHeader title="Buyurtma" subtitle="Batafsil ma’lumot yuklanmoqda..." />
        <div className="h-80 animate-pulse rounded-[28px] bg-white/70" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div>
        <PageHeader title="Buyurtma" subtitle="Kirish kerak." />
        <EmptyState
          title="Kirish kerak"
          text="Telefon orqali kirish oynasi ochiladi — kirgach buyurtma ochiladi."
        />
      </div>
    )
  }

  if (!order) {
    return (
      <div>
        <button
          type="button"
          onClick={() => navigate('/buyurtmalar')}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#3d5c52]"
        >
          <ArrowLeft className="h-4 w-4" />
          Buyurtmalarga qaytish
        </button>
        <EmptyState title="Buyurtma topilmadi" text="Bu buyurtma mavjud emas yoki sizga tegishli emas." />
      </div>
    )
  }

  const cover =
    resolveImage(order.photo_snapshot) ||
    resolveImage(groupBuy?.photo_urls?.[0]) ||
    resolveImage(groupBuy?.items?.find((line) => line.photo_url)?.photo_url)
  const stepIndex = ORDER_STEPS.indexOf(order.status as (typeof ORDER_STEPS)[number])
  const statusHelp = ORDER_STATUS_HELP[order.status] ?? 'Buyurtma holati yangilanmoqda.'
  const showCode =
    Boolean(order.pickup_code) && order.status !== 'cancelled' && order.status !== 'issued'

  return (
    <div className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={() => navigate('/buyurtmalar')}
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#3d5c52] transition hover:text-[#102d26]"
      >
        <ArrowLeft className="h-4 w-4" />
        Buyurtmalarga qaytish
      </button>

      <PageHeader
        title={order.title_snapshot || `Buyurtma #${order.id}`}
        subtitle={`#${order.id} · ${formatDateTime(order.created_at)}`}
      />

      <FadeIn>
        <div className="overflow-hidden rounded-[28px] bg-white ring-1 ring-[#102d26]/6">
          <div className="aspect-[16/10] bg-[#102d26]/5 sm:aspect-[16/9]">
            {cover ? (
              <img
                src={cover}
                alt={order.title_snapshot || ''}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center text-[#5f7a70]">
                <Package className="h-12 w-12 opacity-40" />
              </div>
            )}
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#5f7a70]">
                  Holat
                </p>
                <p className="mt-1 text-lg font-bold">
                  {ORDER_STATUS_LABEL[order.status] ?? order.status}
                </p>
              </div>
              <span className="rounded-full bg-[#c9f560]/45 px-3 py-1.5 text-xs font-bold text-[#102d26]">
                {ORDER_STATUS_LABEL[order.status] ?? order.status}
              </span>
            </div>

            <div className="rounded-2xl bg-[#f3f7f4] px-4 py-3.5 text-sm leading-6 text-[#3d5c52]">
              {statusHelp}
            </div>

            <div className="overflow-hidden rounded-[24px] bg-[#102d26] p-4 text-white sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#c9f560]/80">
                    Yig‘im tarkibi
                  </p>
                  <p className="mt-1.5 text-base font-bold leading-snug sm:text-lg">
                    {groupBuy?.title || order.title_snapshot || `Yig‘im #${order.group_buy_id}`}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[#c9f560] px-2.5 py-1 text-[11px] font-bold text-[#102d26]">
                  {order.quantity} to‘plam
                </span>
              </div>
              {groupBuy?.description ? (
                <p className="mt-2 text-sm leading-6 text-white/70">{groupBuy.description}</p>
              ) : null}

              {groupBuy?.items && groupBuy.items.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {groupBuy.items.map((line, index) => {
                    const name = (line.product_name || '').trim() || `Mahsulot #${line.product_id}`
                    const perSet = line.quantity
                    const total = perSet * order.quantity
                    const thumb = resolveImage(line.photo_url)
                    return (
                      <li
                        key={`${line.product_id}-${index}`}
                        className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur-sm"
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15">
                          {thumb ? (
                            <img src={thumb} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full place-items-center text-white/40">
                              <Package className="h-5 w-5" />
                            </div>
                          )}
                          <span className="absolute -left-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#c9f560] text-[10px] font-black text-[#102d26]">
                            {index + 1}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold capitalize leading-snug">{name}</p>
                          <p className="mt-0.5 text-[11px] text-white/55">
                            {perSet} dona / to‘plam
                          </p>
                        </div>
                        {order.quantity > 1 ? (
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-black text-[#c9f560]">{total} dona</p>
                            <p className="text-[10px] text-white/50">{order.quantity} to‘plam</p>
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="mt-4 rounded-2xl bg-white/10 px-3 py-3">
                  <p className="font-semibold">
                    {groupBuy?.title || order.title_snapshot || 'Mahsulot'}
                  </p>
                  <p className="mt-1 text-sm text-white/65">
                    {order.quantity} dona · {formatMoney(order.unit_price)} / dona
                  </p>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-sm">
                <span className="text-white/60">Jami summa</span>
                <span className="text-lg font-black text-[#c9f560]">
                  {formatMoney(order.total_amount)}
                </span>
              </div>
            </div>

            {showCode ? (
              <div className="rounded-[24px] border-2 border-[#102d26] bg-[#f7faf8] px-4 py-4 sm:px-5">
                <div className="flex items-center gap-2 text-[#102d26]">
                  <ShieldCheck className="h-5 w-5 shrink-0" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#5f7a70]">
                    Topshirish kodi
                  </p>
                </div>
                <p className="mt-2 font-mono text-3xl font-black tracking-[0.32em] text-[#102d26] sm:text-4xl">
                  {order.pickup_code}
                </p>
                <p className="mt-2 text-xs leading-5 text-[#5f7a70]">
                  Kuryer yetkazganda shu 6 xonali kodni ayting. Kod faqat sizda — kuryerga oldindan
                  yuborilmaydi.
                </p>
              </div>
            ) : null}

            {order.status !== 'cancelled' ? (
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#5f7a70]">
                  Jarayon
                </p>
                <div className="space-y-3">
                  {ORDER_STEPS.map((step, i) => {
                    const done = stepIndex >= i
                    const current = stepIndex === i
                    return (
                      <div key={step} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                              done
                                ? 'bg-[#102d26] text-[#c9f560]'
                                : 'bg-[#e8eee9] text-[#5f7a70]'
                            }`}
                          >
                            {i + 1}
                          </div>
                          {i < ORDER_STEPS.length - 1 ? (
                            <div
                              className={`mt-1 w-0.5 flex-1 min-h-4 ${
                                stepIndex > i ? 'bg-[#102d26]' : 'bg-[#e8eee9]'
                              }`}
                            />
                          ) : null}
                        </div>
                        <div className={`pb-2 ${current ? '' : 'opacity-70'}`}>
                          <p className="text-sm font-bold text-[#102d26]">
                            {ORDER_STATUS_LABEL[step]}
                          </p>
                          <p className="mt-0.5 text-xs leading-5 text-[#5f7a70]">
                            {ORDER_STATUS_HELP[step]}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow label="Narx" value={`${formatMoney(order.unit_price)} / to‘plam`} />
              <InfoRow label="Buyurtma" value={`${order.quantity} to‘plam`} />
              <InfoRow label="Yaratilgan" value={formatDateTime(order.created_at)} />
              <InfoRow label="Yangilangan" value={formatDateTime(order.updated_at)} />
            </div>

            {customer.region_name || customer.address ? (
              <div className="rounded-2xl border border-[#102d26]/8 bg-[#f7faf8] px-4 py-3.5">
                <div className="flex items-center gap-2 text-[#3d5c52]">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em]">Yetkazish manzili</p>
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#102d26]">
                  {[customer.region_name, customer.city_name, customer.mfy_name]
                    .filter(Boolean)
                    .join(', ')}
                  {customer.address ? (
                    <>
                      <br />
                      {customer.address}
                    </>
                  ) : null}
                </p>
              </div>
            ) : null}

            {order.status === 'collecting' ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void cancel()}
                className="flex h-11 w-full items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60 sm:h-12"
              >
                {busy ? 'Bekor qilinmoqda...' : 'Buyurtmani bekor qilish'}
              </button>
            ) : null}
          </div>
        </div>
      </FadeIn>
    </div>
  )
}

function InfoRow({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-2xl bg-[#f3f7f4] px-3.5 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#5f7a70]">{label}</p>
      <p className={`mt-1 text-sm font-bold ${highlight ? 'text-base text-[#102d26]' : ''}`}>
        {value}
      </p>
    </div>
  )
}
