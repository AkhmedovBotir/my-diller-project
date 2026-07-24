import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../../shared/api'
import { CustomSelect } from '../../shared/CustomSelect'
import { formatPrice, paymentTermFull } from '../../shared/format'
import { useSnackbar } from '../../shared/Snackbar'
import type { Category, Product, Subcategory } from '../../shared/types'
import { useCart } from '../cart/CartContext'
import { CartConflictModal } from '../cart/CartConflictModal'

const LIMIT = 20

export function CatalogPage() {
  const { showSnackbar } = useSnackbar()
  const cart = useCart()
  const [items, setItems] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [categoriesAvailable, setCategoriesAvailable] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [offset, setOffset] = useState(0)
  const [conflictProduct, setConflictProduct] = useState<Product | null>(null)
  const [conflictQuantity, setConflictQuantity] = useState(1)

  useEffect(() => {
    const task = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(task)
  }, [searchInput])

  useEffect(() => {
    api.categories()
      .then((cats) => {
        setCategories(cats)
        setCategoriesAvailable(true)
      })
      .catch(() => setCategoriesAvailable(false))
  }, [])

  useEffect(() => {
    const task = window.setTimeout(() => {
      if (!categoriesAvailable || !categoryId) {
        setSubcategories([])
        return
      }
      api.subcategories(Number(categoryId))
        .then(setSubcategories)
        .catch(() => setSubcategories([]))
    }, 0)
    return () => window.clearTimeout(task)
  }, [categoryId, categoriesAvailable])

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const products = await api.catalogProducts({
        category_id: categoryId ? Number(categoryId) : undefined,
        subcategory_id: subcategoryId ? Number(subcategoryId) : undefined,
        search: search || undefined,
        limit: LIMIT,
        offset,
      })
      setItems(products)
    } catch (loadError) {
      const message = getErrorMessage(loadError)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [categoryId, subcategoryId, search, offset])

  useEffect(() => {
    const task = window.setTimeout(() => void loadItems(), 0)
    return () => window.clearTimeout(task)
  }, [loadItems])

  const categoryOptions = useMemo(
    () => categories.map((item) => ({ value: String(item.id), label: item.name })),
    [categories],
  )
  const subcategoryOptions = useMemo(
    () => subcategories.map((item) => ({ value: String(item.id), label: item.name })),
    [subcategories],
  )

  function handleAddToCart(product: Product, quantity: number) {
    if (cart.hasConflict(product)) {
      setConflictProduct(product)
      setConflictQuantity(quantity)
      return
    }
    cart.addItem(product, quantity)
    showSnackbar(`${product.name} savatga qo‘shildi`)
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Katalog</h2>
          <p className="mt-1 text-xs text-slate-400">Tasdiqlangan mahsulotlar orasidan tanlang</p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            value={searchInput}
            onChange={(event) => {
              setOffset(0)
              setSearchInput(event.target.value)
            }}
            placeholder="Nom yoki kod bo‘yicha qidirish"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm outline-none transition focus:border-[#397461] focus:bg-white"
          />
        </div>
      </section>

      {categoriesAvailable && categories.length > 0 && (
        <section className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 sm:grid-cols-2">
          <CustomSelect
            label="Kategoriya"
            value={categoryId}
            options={categoryOptions}
            onChange={(next) => {
              setOffset(0)
              setCategoryId(next)
              setSubcategoryId('')
            }}
            placeholder="Barcha kategoriyalar"
            emptyText="Kategoriya topilmadi"
          />
          <CustomSelect
            label="Subkategoriya"
            value={subcategoryId}
            options={subcategoryOptions}
            onChange={(next) => {
              setOffset(0)
              setSubcategoryId(next)
            }}
            placeholder={categoryId ? 'Barcha subkategoriyalar' : 'Avval kategoriya tanlang'}
            disabled={!categoryId}
            emptyText="Subkategoriya topilmadi"
          />
        </section>
      )}

      <section>
        {loading ? (
          <GridSkeleton />
        ) : error ? (
          <div className="grid min-h-72 place-items-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center">
            <div>
              <AlertTriangle className="mx-auto mb-3 text-red-400" />
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button onClick={() => void loadItems()} className="mt-4 text-xs font-bold text-[#397461]">
                Qayta urinish
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="grid min-h-72 place-items-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center">
            <div>
              <Package className="mx-auto mb-3 text-slate-300" size={28} />
              <p className="text-sm font-semibold text-slate-500">Mahsulot topilmadi</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                onAdd={(quantity) => handleAddToCart(product, quantity)}
              />
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-5 py-4">
          <p className="text-xs text-slate-400">
            {items.length === 0 ? '0' : `${offset + 1}–${offset + items.length}`} ko‘rsatilmoqda
          </p>
          <div className="flex gap-2">
            <button
              disabled={offset === 0}
              onClick={() => setOffset((current) => Math.max(0, current - LIMIT))}
              className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={items.length < LIMIT}
              onClick={() => setOffset((current) => current + LIMIT)}
              className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <CartConflictModal
        product={conflictProduct}
        onClose={() => setConflictProduct(null)}
        onConfirm={() => {
          if (!conflictProduct) return
          cart.replaceCart(conflictProduct, conflictQuantity)
          showSnackbar(`Savat tozalandi, ${conflictProduct.name} qo‘shildi`)
          setConflictProduct(null)
        }}
      />
    </div>
  )
}

function ProductCard({
  product,
  index,
  onAdd,
}: {
  product: Product
  index: number
  onAdd: (quantity: number) => void
}) {
  const [quantity, setQuantity] = useState(product.moq)

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white"
    >
      <Link to={`/catalog/${product.id}`} className="block aspect-[4/3] overflow-hidden bg-slate-100">
        {product.images[0] ? (
          <img src={product.images[0]} alt={product.name} className="size-full object-cover transition hover:scale-105" />
        ) : (
          <div className="grid size-full place-items-center text-slate-300">
            <Package size={28} />
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link to={`/catalog/${product.id}`}>
          <p className="line-clamp-2 text-sm font-bold text-slate-800">{product.name}</p>
        </Link>
        <p className="mt-1 font-mono text-xs text-slate-400">{product.code}</p>
        <p className="mt-2 text-lg font-bold tracking-tight text-[#173c32]">{formatPrice(product.price)}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
            MOQ: {product.moq}
          </span>
          <span className="rounded-full bg-[#eff8f3] px-2 py-1 text-[10px] font-bold text-[#397461]">
            {paymentTermFull(product.payment_term, product.payment_days)}
          </span>
        </div>

        <div className="mt-auto pt-4">
          <div className="mb-2 flex items-center justify-center gap-2">
            <button
              onClick={() => setQuantity((current) => Math.max(product.moq, current - 1))}
              className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <Minus size={14} />
            </button>
            <input
              value={quantity}
              onChange={(event) => {
                const next = Number(event.target.value.replace(/\D/g, ''))
                setQuantity(Number.isNaN(next) ? product.moq : next)
              }}
              className="h-8 w-14 rounded-lg border border-slate-200 text-center text-sm font-bold outline-none focus:border-[#397461]"
            />
            <button
              onClick={() => setQuantity((current) => Math.min(product.quantity, current + 1))}
              className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <Plus size={14} />
            </button>
          </div>
          <button
            onClick={() => onAdd(Math.max(product.moq, Math.min(quantity, product.quantity)))}
            disabled={product.quantity < product.moq}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#173c32] text-sm font-bold text-white transition hover:bg-[#0f2721] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShoppingCart size={16} />
            Savatga qo‘shish
          </button>
        </div>
      </div>
    </motion.article>
  )
}

function GridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Mahsulotlar yuklanmoqda">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="animate-pulse overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <div className="aspect-[4/3] bg-slate-200" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-3/4 rounded-full bg-slate-200" />
            <div className="h-3 w-1/2 rounded-full bg-slate-200/70" />
            <div className="h-8 rounded-lg bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  )
}
