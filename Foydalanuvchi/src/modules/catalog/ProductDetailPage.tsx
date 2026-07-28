import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, LoaderCircle, Minus, Package, Plus, ShoppingCart } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, getErrorMessage } from '../../shared/api'
import { deltaToHtml, isDeltaEmpty } from '../../shared/delta'
import { formatPrice, paymentTermFull } from '../../shared/format'
import { useSnackbar } from '../../shared/Snackbar'
import type { Product } from '../../shared/types'
import { useCart } from '../cart/CartContext'
import { CartConflictModal } from '../cart/CartConflictModal'

export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showSnackbar } = useSnackbar()
  const cart = useCart()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeImage, setActiveImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [conflictOpen, setConflictOpen] = useState(false)

  useEffect(() => {
    const productId = Number(id)
    if (!productId) return
    const task = window.setTimeout(() => {
      setLoading(true)
      setError('')
      api.catalogProduct(productId)
        .then((item) => {
          setProduct(item)
          setQuantity(item.moq)
          setActiveImage(0)
        })
        .catch((loadError) => setError(getErrorMessage(loadError)))
        .finally(() => setLoading(false))
    }, 0)
    return () => window.clearTimeout(task)
  }, [id])

  function handleAdd() {
    if (!product) return
    const qty = Math.max(product.moq, Math.min(quantity, product.quantity))
    if (cart.hasConflict(product)) {
      setConflictOpen(true)
      return
    }
    cart.addItem(product, qty)
    showSnackbar(`${product.name} savatga qo‘shildi`)
  }

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <LoaderCircle className="animate-spin text-slate-300" size={32} />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="grid min-h-[60vh] place-items-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center">
        <div>
          <AlertTriangle className="mx-auto mb-3 text-red-400" />
          <p className="text-sm font-semibold text-red-600">{error || 'Mahsulot topilmadi'}</p>
          <Link to="/catalog" className="mt-4 inline-block text-xs font-bold text-[#397461]">
            Katalogga qaytish
          </Link>
        </div>
      </div>
    )
  }

  const specs = product.specs && typeof product.specs === 'object' ? Object.entries(product.specs) : []
  const descriptionHtml = deltaToHtml(product.description)

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={16} />
        Orqaga
      </button>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="aspect-square overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100">
            {product.images[activeImage] ? (
              <img src={product.images[activeImage]} alt={product.name} className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-slate-300">
                <Package size={40} />
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {product.images.map((src, index) => (
                <button
                  key={src}
                  onClick={() => setActiveImage(index)}
                  className={`size-16 overflow-hidden rounded-xl border-2 transition ${
                    index === activeImage ? 'border-[#397461]' : 'border-transparent'
                  }`}
                >
                  <img src={src} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-5">
          <div>
            <p className="font-mono text-xs text-slate-400">{product.code}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{product.name}</h1>
            <p className="mt-3 text-3xl font-bold tracking-tight text-[#173c32]">{formatPrice(product.price)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InfoTile label="Minimal buyurtma (MOQ)" value={String(product.moq)} />
            <InfoTile label="Omborda mavjud" value={String(product.quantity)} />
            <InfoTile label="To‘lov sharti" value={paymentTermFull(product.payment_term, product.payment_days)} />
            <InfoTile label="Mahsulot kodi" value={product.code} />
            {product.city && <InfoTile label="Shahar" value={product.city} />}
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Miqdorni tanlang</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((current) => Math.max(product.moq, current - 1))}
                className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <Minus size={16} />
              </button>
              <input
                value={quantity}
                onChange={(event) => {
                  const next = Number(event.target.value.replace(/\D/g, ''))
                  setQuantity(Number.isNaN(next) ? product.moq : next)
                }}
                className="h-10 w-20 rounded-xl border border-slate-200 text-center text-sm font-bold outline-none focus:border-[#397461]"
              />
              <button
                onClick={() => setQuantity((current) => Math.min(product.quantity, current + 1))}
                className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <Plus size={16} />
              </button>
              <p className="text-xs text-slate-400">Kamida {product.moq} dona</p>
            </div>
            <button
              onClick={handleAdd}
              disabled={product.quantity < product.moq}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#173c32] text-sm font-bold text-white transition hover:bg-[#0f2721] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShoppingCart size={18} />
              Savatga qo‘shish
            </button>
          </div>

          {specs.length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Xususiyatlari</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {specs.map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-sm">
                    <span className="text-slate-400">{key}</span>
                    <span className="font-semibold text-slate-700">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Tavsif</p>
            {isDeltaEmpty(product.description) ? (
              <p className="text-sm text-slate-400">Tavsif yo‘q</p>
            ) : (
              <div
                className="prose prose-sm max-w-none text-sm leading-6 text-slate-600"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            )}
          </div>
        </section>
      </div>

      <CartConflictModal
        product={conflictOpen ? product : null}
        onClose={() => setConflictOpen(false)}
        onConfirm={() => {
          const qty = Math.max(product.moq, Math.min(quantity, product.quantity))
          cart.replaceCart(product, qty)
          showSnackbar(`Savat tozalandi, ${product.name} qo‘shildi`)
          setConflictOpen(false)
        }}
      />
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-slate-700">{value}</p>
    </div>
  )
}
