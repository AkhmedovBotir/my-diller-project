import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { EmptyState, FadeIn, PageHeader } from '../app/AppShell'
import { api, ApiRequestError } from '../shared/api'
import { useAuth } from '../shared/AuthContext'
import { formatMoney, resolveImage } from '../shared/money'
import { toast } from '../shared/Snackbar'
import type { CartItem } from '../shared/types'

export function CartPage() {
  const { customer, loading: authLoading, requireAuth, refreshCartCount } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [minOrderAmount, setMinOrderAmount] = useState(0)
  const navigate = useNavigate()

  async function load() {
    if (!customer) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [cart, settings] = await Promise.all([api.cart(), api.settings()])
      setItems(cart)
      setMinOrderAmount(settings.min_order_amount ?? 0)
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

  useEffect(() => {
    void api
      .settings()
      .then((s) => setMinOrderAmount(s.min_order_amount ?? 0))
      .catch(() => undefined)
  }, [])

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0),
    [items],
  )

  const belowMin = minOrderAmount > 0 && total < minOrderAmount

  async function setQty(item: CartItem, quantity: number) {
    try {
      if (quantity < 1) {
        setItems(await api.removeCartItem(item.group_buy_id))
      } else {
        setItems(await api.upsertCart({ group_buy_id: item.group_buy_id, quantity }))
      }
      await refreshCartCount()
    } catch (error) {
      toast(error instanceof ApiRequestError ? error.message : 'Xatolik', 'err')
    }
  }

  function checkout() {
    if (belowMin) {
      toast(`Minimal buyurtma: ${formatMoney(minOrderAmount)}`, 'err')
      return
    }
    requireAuth(async () => {
      setBusy(true)
      try {
        await api.checkout()
        await refreshCartCount()
        setItems([])
        toast('Buyurtma yaratildi')
        navigate('/buyurtmalar')
      } catch (error) {
        toast(error instanceof ApiRequestError ? error.message : 'Checkout xatosi', 'err')
      } finally {
        setBusy(false)
      }
    })
  }

  if (authLoading) {
    return (
      <div>
        <PageHeader title="Savat" subtitle="Tanlangan yig‘imlaringiz shu yerda." />
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
        <PageHeader title="Savat" subtitle="Buyurtma berish uchun avval kiring." />
        <EmptyState
          title="Kirish kerak"
          text="Telefon orqali kirish oynasi ochiladi — kirgach savat shu yerda chiqadi."
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Savat" subtitle="Tanlangan yig‘imlaringiz shu yerda." />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-[24px] bg-white/70" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Savat bo‘sh"
          text="Yig‘imlardan mahsulot qo‘shing — bu yerda ko‘rinadi."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {items.map((item, index) => {
              const photo = resolveImage(item.photo_url)
              return (
                <FadeIn key={item.group_buy_id} delay={index * 0.04}>
                  <div className="flex gap-3 rounded-[24px] bg-white p-3 ring-1 ring-[#102d26]/6 sm:gap-4 sm:p-4">
                    <Link
                      to={`/yigimlar/${item.group_buy_id}`}
                      className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#102d26]/5 sm:h-28 sm:w-28"
                    >
                      {photo ? (
                        <img src={photo} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <Link
                        to={`/yigimlar/${item.group_buy_id}`}
                        className="line-clamp-2 font-bold leading-snug"
                      >
                        {item.title}
                      </Link>
                      <p className="mt-1 text-sm font-black">{formatMoney(item.price)}</p>
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <div className="flex h-10 items-center rounded-xl border border-[#102d26]/12">
                          <button
                            type="button"
                            className="grid h-10 w-10 place-items-center"
                            onClick={() => void setQty(item, item.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="min-w-6 text-center text-sm font-bold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="grid h-10 w-10 place-items-center"
                            onClick={() =>
                              void setQty(
                                item,
                                Math.min(item.max_quantity ?? item.quantity + 1, item.quantity + 1),
                              )
                            }
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => void setQty(item, 0)}
                          className="grid h-10 w-10 place-items-center rounded-xl text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              )
            })}
          </div>

          <div className="h-fit rounded-[28px] bg-[#102d26] p-5 text-[#c9f560] sm:sticky sm:top-24">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c9f560]/70">
              Jami
            </p>
            <p className="mt-2 text-3xl font-black text-white">{formatMoney(total)}</p>
            <p className="mt-2 text-sm text-[#c9f560]/80">{items.length} ta yig‘im</p>
            {minOrderAmount > 0 ? (
              <p
                className={`mt-3 rounded-xl px-3 py-2 text-xs leading-5 ${
                  belowMin ? 'bg-red-500/20 text-red-100' : 'bg-white/10 text-[#c9f560]/85'
                }`}
              >
                Minimal buyurtma: {formatMoney(minOrderAmount)}
                {belowMin
                  ? ` — yana ${formatMoney(minOrderAmount - total)} qo‘shing`
                  : ' — yetarli'}
              </p>
            ) : null}
            <button
              type="button"
              disabled={busy || belowMin}
              onClick={checkout}
              className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-[#c9f560] text-sm font-bold text-[#102d26] disabled:opacity-60"
            >
              {busy ? 'Yuborilmoqda...' : 'Buyurtma berish'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
