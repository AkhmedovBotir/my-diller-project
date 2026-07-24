import { useState } from 'react'
import { motion } from 'framer-motion'
import { LoaderCircle, Minus, Package, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { api, getErrorMessage } from '../../shared/api'
import { formatPrice, paymentTermFull } from '../../shared/format'
import { useSnackbar } from '../../shared/Snackbar'
import { useCart } from './CartContext'

export function CartPage() {
  const cart = useCart()
  const { showSnackbar } = useSnackbar()
  const navigate = useNavigate()
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const invalidItems = cart.items.filter(
    (item) => item.quantity < item.product.moq || item.quantity > item.product.quantity,
  )

  async function handlePlaceOrder() {
    if (cart.items.length === 0) return
    if (invalidItems.length > 0) {
      showSnackbar('Ba’zi mahsulotlar miqdori MOQ yoki mavjud sondan oshib ketgan', 'error')
      return
    }

    setSubmitting(true)
    try {
      const order = await api.createOrder({
        items: cart.items.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
        note: note.trim() || undefined,
      })
      cart.clear()
      showSnackbar(`Buyurtma #${order.number} muvaffaqiyatli yaratildi`)
      navigate(`/orders/${order.id}`)
    } catch (orderError) {
      showSnackbar(getErrorMessage(orderError), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="grid min-h-[60vh] place-items-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center">
        <div>
          <ShoppingBag className="mx-auto mb-4 text-slate-300" size={40} />
          <p className="text-lg font-bold text-slate-700">Savatingiz bo‘sh</p>
          <p className="mt-1 text-sm text-slate-400">Katalogdan mahsulot tanlab, savatga qo‘shing</p>
          <Link
            to="/catalog"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#173c32] px-5 text-sm font-bold text-white"
          >
            Katalogga o‘tish
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.5fr_.9fr]">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Savat</h2>
          <button onClick={() => cart.clear()} className="text-xs font-bold text-red-500 hover:underline">
            Savatni tozalash
          </button>
        </div>

        {cart.items.map((item, index) => {
          const belowMoq = item.quantity < item.product.moq
          const overStock = item.quantity > item.product.quantity
          return (
            <motion.article
              key={item.product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:flex-row sm:items-center"
            >
              <Link to={`/catalog/${item.product.id}`} className="size-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                {item.product.images[0] ? (
                  <img src={item.product.images[0]} alt="" className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center text-slate-300">
                    <Package size={22} />
                  </div>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <Link to={`/catalog/${item.product.id}`} className="line-clamp-1 text-sm font-bold text-slate-800 hover:underline">
                  {item.product.name}
                </Link>
                <p className="mt-0.5 font-mono text-xs text-slate-400">{item.product.code}</p>
                <p className="mt-1 text-sm font-semibold text-[#173c32]">{formatPrice(item.product.price)}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {paymentTermFull(item.product.payment_term, item.product.payment_days)} · MOQ: {item.product.moq}
                </p>
                {(belowMoq || overStock) && (
                  <p className="mt-1 text-xs font-semibold text-red-500">
                    {belowMoq
                      ? `Miqdor kamida ${item.product.moq} bo‘lishi kerak`
                      : `Omborda faqat ${item.product.quantity} dona mavjud`}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => cart.updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                  className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  <Minus size={14} />
                </button>
                <input
                  value={item.quantity}
                  onChange={(event) => {
                    const next = Number(event.target.value.replace(/\D/g, ''))
                    cart.updateQuantity(item.product.id, Number.isNaN(next) ? 1 : next)
                  }}
                  className={`h-9 w-16 rounded-lg border text-center text-sm font-bold outline-none ${
                    belowMoq || overStock ? 'border-red-300' : 'border-slate-200 focus:border-[#397461]'
                  }`}
                />
                <button
                  onClick={() => cart.updateQuantity(item.product.id, item.quantity + 1)}
                  className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
                <p className="text-sm font-bold text-slate-800">{formatPrice(item.quantity * item.product.price)}</p>
                <button
                  onClick={() => cart.removeItem(item.product.id)}
                  className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.article>
          )
        })}
      </section>

      <section className="h-fit space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6">
        <h3 className="font-bold text-slate-900">Buyurtma xulosasi</h3>
        <div className="space-y-3 border-b border-slate-100 pb-5 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Mahsulotlar soni</span>
            <span className="font-semibold text-slate-700">{cart.itemCount}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Jami summa</span>
            <span className="text-lg font-bold text-[#173c32]">{formatPrice(cart.totalAmount)}</span>
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-bold text-slate-600">Izoh (ixtiyoriy)</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Yetkazib berish bo‘yicha qo‘shimcha izoh..."
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm outline-none transition focus:border-[#397461] focus:bg-white focus:ring-4 focus:ring-[#397461]/8"
          />
        </label>

        <button
          onClick={() => void handlePlaceOrder()}
          disabled={submitting || invalidItems.length > 0}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#173c32] text-sm font-bold text-white shadow-lg shadow-[#173c32]/10 transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <LoaderCircle className="animate-spin" size={18} /> : null}
          {submitting ? 'Yuborilmoqda...' : 'Buyurtma berish'}
        </button>
        <p className="text-center text-[11px] text-slate-400">
          Buyurtma bitta ishlab chiqaruvchidan bo‘lgan mahsulotlardan tashkil topadi
        </p>
      </section>
    </div>
  )
}
