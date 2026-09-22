import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Package,
  Sparkles,
  Users,
  Warehouse,
} from 'lucide-react'
import { EmptyState, FadeIn, PageHeader, motion } from '../app/AppShell'
import { api, ApiRequestError } from '../shared/api'
import { useAuth } from '../shared/AuthContext'
import { formatDateTime } from '../shared/date'
import { formatMoney, progressPercent, resolveImage } from '../shared/money'
import { toast } from '../shared/Snackbar'
import type { GroupBuy, Product } from '../shared/types'

export function GroupBuysPage() {
  const [items, setItems] = useState<GroupBuy[]>([])
  const [loading, setLoading] = useState(true)
  const { requireAuth, refreshCartCount } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const list = await api.groupBuys({ status: 'open', limit: 100 })
        if (!cancelled) setItems(list)
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function orderNow(gb: GroupBuy) {
    requireAuth(async () => {
      try {
        await api.upsertCart({ group_buy_id: gb.id, quantity: 1, add: true })
        await refreshCartCount()
        toast('Savatga qo‘shildi')
        navigate('/savat')
      } catch (error) {
        toast(error instanceof ApiRequestError ? error.message : 'Xatolik', 'err')
      }
    })
  }

  return (
    <div>
      <PageHeader
        title="Yig‘imlar"
        subtitle="Ochiq jamoaviy xaridlar — birga arzonroq oling."
      />

      {loading ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-[22px] bg-white/70 sm:rounded-[28px]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Hozircha ochiq yig‘im yo‘q"
          text="Tez orada yangi takliflar paydo bo‘ladi. Katalogdan mahsulotlarni ko‘rib chiqing."
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
          {items.map((item, index) => (
            <FadeIn key={item.id} delay={index * 0.03}>
              <GroupBuyCard item={item} onOrder={() => orderNow(item)} />
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  )
}

function GroupBuyCard({ item, onOrder }: { item: GroupBuy; onOrder: () => void }) {
  const photo = resolveImage(item.photo_urls?.[0])
  const percent = progressPercent(item.current_volume, item.min_volume)
  const left = Math.max(item.stock - item.current_volume, 0)

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_14px_40px_-24px_rgba(16,45,38,0.45)] ring-1 ring-[#102d26]/6 transition hover:-translate-y-0.5 hover:shadow-[0_22px_50px_-22px_rgba(16,45,38,0.5)] sm:rounded-[28px]">
      <Link
        to={`/yigimlar/${item.id}`}
        className="relative block aspect-[4/3] overflow-hidden bg-[#102d26]/5"
      >
        {photo ? (
          <img
            src={photo}
            alt={item.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-[#102d26]/25">
            <Sparkles className="h-8 w-8 sm:h-10 sm:w-10" />
          </div>
        )}
        <div className="absolute left-2 top-2 rounded-full bg-[#102d26]/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#c9f560] sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[10px]">
          {item.kind === 'combo' ? 'Kombo' : 'Yig‘im'}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-2.5 sm:p-5">
        <Link
          to={`/yigimlar/${item.id}`}
          className="line-clamp-2 text-[13px] font-bold leading-snug text-[#102d26] sm:text-lg"
        >
          {item.title}
        </Link>
        <p className="mt-1.5 text-base font-black tracking-tight text-[#102d26] sm:mt-2 sm:text-xl">
          {formatMoney(item.price)}
        </p>

        <div className="mt-2.5 sm:mt-4">
          <div className="mb-1 flex items-center justify-between text-[10px] font-semibold text-[#5f7a70] sm:mb-1.5 sm:text-[11px]">
            <span className="truncate">
              {item.current_volume} / {item.min_volume} yig‘ildi
            </span>
            <span className="shrink-0 pl-1">{percent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#e8eee9] sm:h-2">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#102d26] to-[#c9f560]"
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-[#5f7a70] sm:mt-2 sm:text-xs">Qoldiq joy: {left}</p>
        </div>

        <div className="mt-auto flex flex-row gap-1.5 pt-3 sm:gap-2 sm:pt-5">
          <Link
            to={`/yigimlar/${item.id}`}
            className="flex h-10 min-w-0 flex-1 items-center justify-center rounded-xl border border-[#102d26]/15 px-1 text-[11px] font-semibold leading-none text-[#102d26] transition hover:bg-[#f3f7f4] sm:h-11 sm:rounded-2xl sm:px-2 sm:text-sm"
          >
            Batafsil
          </Link>
          <button
            type="button"
            onClick={onOrder}
            className="flex h-10 min-w-0 flex-1 items-center justify-center gap-0.5 rounded-xl bg-[#102d26] px-1 text-[11px] font-bold leading-none text-[#c9f560] transition hover:brightness-110 sm:h-11 sm:gap-1 sm:rounded-2xl sm:px-2 sm:text-sm"
          >
            <span className="truncate">Buyurtma</span>
            <ArrowRight className="hidden h-4 w-4 shrink-0 sm:inline" />
          </button>
        </div>
      </div>
    </article>
  )
}

export function GroupBuyDetailPage() {
  const { id: idParam } = useParams()
  const id = Number(idParam)
  const [item, setItem] = useState<GroupBuy | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [qty, setQty] = useState(1)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const { requireAuth, refreshCartCount } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const gb = await api.groupBuy(id)
        if (cancelled) return
        setItem(gb)
        setPhotoIndex(0)
        if ((!gb.items || gb.items.length === 0) && gb.product_id && gb.kind !== 'combo') {
          try {
            const p = await api.product(gb.product_id)
            if (!cancelled) setProduct(p)
          } catch {
            if (!cancelled) setProduct(null)
          }
        } else {
          setProduct(null)
        }
      } catch {
        if (!cancelled) {
          setItem(null)
          setProduct(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const maxQty = useMemo(
    () => (item ? Math.max(item.stock - item.current_volume, 0) : 0),
    [item],
  )

  const photos = useMemo(() => {
    if (!item) return [] as string[]
    const fromGb = (item.photo_urls ?? []).map(resolveImage).filter(Boolean)
    if (fromGb.length > 0) return fromGb
    if (product?.photo_url) {
      const one = resolveImage(product.photo_url)
      return one ? [one] : []
    }
    return (item.items ?? [])
      .map((line) => resolveImage(line.photo_url))
      .filter(Boolean)
      .slice(0, 5)
  }, [item, product])

  const total = item ? item.price * qty : 0
  const left = item ? Math.max(item.stock - item.current_volume, 0) : 0
  const percent = item ? progressPercent(item.current_volume, item.min_volume) : 0
  const needed = item ? Math.max(item.min_volume - item.current_volume, 0) : 0

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded-full bg-white/70" />
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="aspect-[16/11] animate-pulse rounded-[28px] bg-white/70" />
          <div className="h-96 animate-pulse rounded-[28px] bg-white/70" />
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#3d5c52]"
        >
          <ArrowLeft className="h-4 w-4" />
          Yig‘imlarga qaytish
        </button>
        <EmptyState title="Yig‘im topilmadi" text="Bu yig‘im mavjud emas yoki yopilgan." />
      </div>
    )
  }

  function addToCart() {
    if (!item) return
    const gb = item
    requireAuth(async () => {
      try {
        await api.upsertCart({ group_buy_id: gb.id, quantity: qty, add: true })
        await refreshCartCount()
        toast('Savatga qo‘shildi')
        navigate('/savat')
      } catch (error) {
        toast(error instanceof ApiRequestError ? error.message : 'Xatolik', 'err')
      }
    })
  }

  const activePhoto = photos[photoIndex] ?? photos[0] ?? ''

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#3d5c52] transition hover:text-[#102d26]"
      >
        <ArrowLeft className="h-4 w-4" />
        Orqaga
      </button>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <FadeIn>
          <div className="overflow-hidden rounded-[24px] bg-white ring-1 ring-[#102d26]/6 sm:rounded-[32px]">
            <div className="relative aspect-[16/11] bg-[#102d26]/5">
              {activePhoto ? (
                <img src={activePhoto} alt={item.title} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-[#102d26]/25">
                  <Package className="h-14 w-14" />
                </div>
              )}
              <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#102d26]/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#c9f560]">
                  {item.kind === 'combo' ? 'Kombo to‘plam' : 'Mahsulot yig‘imi'}
                </span>
                <span className="rounded-full bg-[#c9f560] px-2.5 py-1 text-[10px] font-bold text-[#102d26]">
                  {item.status === 'open' ? 'Ochiq' : item.status}
                </span>
              </div>
            </div>
            {photos.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto p-3">
                {photos.map((src, index) => (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    onClick={() => setPhotoIndex(index)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl ring-2 transition ${
                      photoIndex === index ? 'ring-[#102d26]' : 'ring-transparent opacity-70'
                    }`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </FadeIn>

        <FadeIn delay={0.06}>
          <div className="rounded-[24px] bg-white p-4 ring-1 ring-[#102d26]/6 sm:rounded-[32px] sm:p-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5f7a70]">
              Yig‘im #{item.id}
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-3xl">{item.title}</h2>
            <p className="mt-3 text-2xl font-black sm:mt-4 sm:text-3xl">{formatMoney(item.price)}</p>
            <p className="mt-1 text-xs text-[#5f7a70]">1 to‘plam narxi</p>

            {item.description || product?.description ? (
              <p className="mt-4 text-sm leading-7 text-[#3d5c52]">
                {item.description || product?.description}
              </p>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3">
              <StatCard
                icon={Users}
                label="Yig‘ilgan"
                value={`${item.current_volume} / ${item.min_volume}`}
                hint={needed > 0 ? `Yana ${needed} ta kerak` : 'Minimal hajm yetdi'}
              />
              <StatCard
                icon={Warehouse}
                label="Qoldiq joy"
                value={String(left)}
                hint={`Ombor: ${item.stock}`}
              />
            </div>

            <div className="mt-4 rounded-2xl bg-[#f3f7f4] p-4">
              <div className="mb-2 flex justify-between text-xs font-semibold text-[#5f7a70]">
                <span>Yig‘im jarayoni</span>
                <span>{percent}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#102d26] to-[#c9f560]"
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
              <p className="mt-2 text-[11px] leading-5 text-[#5f7a70]">
                Minimal hajm yig‘ilgach yig‘im yopiladi va buyurtmalar kuryerga uzatiladi.
              </p>
            </div>

            <div className="mt-5 overflow-hidden rounded-[22px] bg-[#102d26] p-4 text-white">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#c9f560]/80">
                Tarkib
              </p>
              {item.items && item.items.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {item.items.map((line, index) => {
                    const name =
                      (line.product_name || '').trim() || `Mahsulot #${line.product_id}`
                    const thumb = resolveImage(line.photo_url)
                    const lineTotal = line.quantity * qty
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
                              <Package className="h-5 w-5" />
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
                        {qty > 1 ? (
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-black text-[#c9f560]">{lineTotal} dona</p>
                            <p className="text-[10px] text-white/50">{qty} to‘plam</p>
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-2.5">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/10">
                    {resolveImage(product?.photo_url) ? (
                      <img
                        src={resolveImage(product?.photo_url)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-white/40">
                        <Package className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{product?.name || item.title}</p>
                    <p className="mt-0.5 text-[11px] text-white/55">
                      {product?.unit ? `Birlik: ${product.unit}` : 'Bitta mahsulot yig‘imi'}
                      {product?.price != null ? ` · katalog: ${formatMoney(product.price)}` : ''}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-black text-[#c9f560]">{qty} dona</p>
                </div>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-[#102d26]/8 bg-[#f7faf8] px-4 py-3.5 text-sm leading-6 text-[#3d5c52]">
              <p className="font-bold text-[#102d26]">Qanday ishlaydi?</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs sm:text-sm">
                <li>To‘plam miqdorini tanlang va savatga qo‘shing.</li>
                <li>Yig‘im minimal hajmga yetgach yopiladi.</li>
                <li>Kuryer yetkazganda 6 xonali kod bilan qabul qilasiz.</li>
              </ol>
            </div>

            {item.created_at || item.updated_at ? (
              <p className="mt-3 text-[11px] text-[#5f7a70]">
                Yangilangan: {formatDateTime(item.updated_at || item.created_at)}
              </p>
            ) : null}

            <div className="mt-5 flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-2xl bg-[#f3f7f4] px-4 py-3">
                <span className="text-sm text-[#5f7a70]">Jami</span>
                <span className="text-lg font-black text-[#102d26]">{formatMoney(total)}</span>
              </div>
              <div className="flex flex-row items-stretch gap-2 sm:gap-3">
                <div className="flex h-11 shrink-0 items-center rounded-2xl border border-[#102d26]/15 bg-[#f7faf8] sm:h-12">
                  <button
                    type="button"
                    className="h-full w-10 text-lg font-bold sm:w-11"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                  >
                    −
                  </button>
                  <span className="min-w-7 text-center text-sm font-bold sm:min-w-8">{qty}</span>
                  <button
                    type="button"
                    className="h-full w-10 text-lg font-bold sm:w-11"
                    onClick={() => setQty((q) => Math.min(maxQty || 1, q + 1))}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  disabled={maxQty < 1}
                  onClick={addToCart}
                  className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-2xl bg-[#102d26] px-2 text-xs font-bold text-[#c9f560] transition hover:brightness-110 disabled:opacity-50 sm:h-12 sm:text-sm"
                >
                  {maxQty < 1 ? 'Joy qolmadi' : 'Savatga qo‘shish'}
                </button>
              </div>
              {maxQty > 0 ? (
                <p className="text-center text-[11px] text-[#5f7a70]">Maksimal: {maxQty} to‘plam</p>
              ) : null}
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-2xl bg-[#f3f7f4] px-3 py-3 sm:px-3.5">
      <div className="flex items-center gap-1.5 text-[#5f7a70]">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-[10px] font-bold uppercase tracking-[0.12em]">{label}</p>
      </div>
      <p className="mt-1.5 text-base font-black text-[#102d26] sm:text-lg">{value}</p>
      <p className="mt-0.5 text-[10px] leading-4 text-[#5f7a70] sm:text-[11px]">{hint}</p>
    </div>
  )
}
