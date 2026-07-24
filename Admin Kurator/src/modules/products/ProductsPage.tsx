import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Package,
  Pencil,
  Search,
  X,
} from 'lucide-react'
import { api, getErrorMessage } from '../../shared/api'
import { CustomSelect } from '../../shared/CustomSelect'
import { formatDateTime } from '../../shared/date'
import { formatPrice, paymentTermLabel } from '../../shared/order'
import { useSnackbar } from '../../shared/Snackbar'
import type { PaymentTerm, Product, ProductStatus } from '../../shared/types'

type StatusFilter = ProductStatus | 'all'

const productStatusLabel: Record<ProductStatus, string> = {
  pending: 'Kutilmoqda',
  approved: 'Tasdiqlangan',
  rejected: 'Bekor qilingan',
}

const productStatusStyle: Record<ProductStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-600',
}

const PAYMENT_TERM_OPTIONS: { value: PaymentTerm; label: string }[] = [
  { value: 'prepay_100', label: paymentTermLabel.prepay_100 },
  { value: 'deferred', label: paymentTermLabel.deferred },
  { value: 'pod_zakaz_50_50', label: paymentTermLabel.pod_zakaz_50_50 },
]

export function ProductsPage() {
  const { showSnackbar } = useSnackbar()
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [offset, setOffset] = useState(0)
  const [editing, setEditing] = useState<Product | null>(null)
  const limit = 20

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(
        await api.products({
          status: status === 'all' ? undefined : status,
          limit,
          offset,
        }),
      )
    } catch (loadError) {
      const message = getErrorMessage(loadError)
      setError(message)
      showSnackbar(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [offset, showSnackbar, status])

  useEffect(() => {
    const task = window.setTimeout(() => void loadItems(), 0)
    return () => window.clearTimeout(task)
  }, [loadItems])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return items
    return items.filter((item) => `${item.name} ${item.code}`.toLocaleLowerCase().includes(query))
  }, [items, search])

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Mahsulotlar</h2>
          <p className="mt-1 text-xs text-slate-400">
            Narx, soni, MOQ va to‘lov shartlarini tezkor tahrirlash
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom yoki kod"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm outline-none transition focus:border-[#397461] focus:bg-white"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {([
              ['all', 'Barchasi'],
              ['pending', 'Kutilmoqda'],
              ['approved', 'Tasdiqlangan'],
              ['rejected', 'Bekor qilingan'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => {
                  setOffset(0)
                  setStatus(value)
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  status === value
                    ? 'bg-[#173c32] text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
            <p className="ml-auto text-xs text-slate-400 lg:ml-2">
              Jami: <span className="font-bold text-slate-700">{items.length}</span>
            </p>
          </div>
        </div>

        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="grid min-h-72 place-items-center p-6 text-center">
            <div>
              <AlertTriangle className="mx-auto mb-3 text-red-400" />
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button onClick={() => void loadItems()} className="mt-4 text-xs font-bold text-[#397461]">
                Qayta urinish
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead>
                  <tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Mahsulot</th>
                    <th className="px-4 py-4">Narx</th>
                    <th className="px-4 py-4">Soni</th>
                    <th className="px-4 py-4">MOQ</th>
                    <th className="px-4 py-4">To‘lov sharti</th>
                    <th className="px-4 py-4">Holat</th>
                    <th className="px-4 py-4">Yaratilgan</th>
                    <th className="px-6 py-4 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.025 }}
                      className="group hover:bg-slate-50/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                            {item.images[0] ? (
                              <img src={item.images[0]} alt="" className="size-full object-cover" />
                            ) : (
                              <div className="grid size-full place-items-center text-slate-300">
                                <Package size={18} />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{item.name}</p>
                            <p className="mt-0.5 font-mono text-xs text-slate-400">{item.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-700">{formatPrice(item.price)}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{item.quantity}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{item.moq}</td>
                      <td className="px-4 py-4 text-xs text-slate-500">{paymentTermLabel[item.payment_term]}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${productStatusStyle[item.status]}`}>
                          {productStatusLabel[item.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500">{formatDateTime(item.created_at)}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setEditing(item)}
                            className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                            title="Tezkor tahrirlash"
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-16 text-center text-sm text-slate-400">Mahsulot topilmadi</div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-400">
                {items.length === 0 ? '0' : `${offset + 1}–${offset + items.length}`} ko‘rsatilmoqda
              </p>
              <div className="flex gap-2">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset((current) => Math.max(0, current - limit))}
                  className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={items.length < limit}
                  onClick={() => setOffset((current) => current + limit)}
                  className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <AnimatePresence>
        {editing && (
          <QuickEditModal
            product={editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null)
              void loadItems()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function QuickEditModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product
  onClose: () => void
  onSaved: () => void
}) {
  const { showSnackbar } = useSnackbar()
  const [saving, setSaving] = useState(false)
  const [errorField, setErrorField] = useState<string>()
  const [price, setPrice] = useState(String(product.price))
  const [quantity, setQuantity] = useState(String(product.quantity))
  const [moq, setMoq] = useState(String(product.moq))
  const [paymentTerm, setPaymentTerm] = useState<PaymentTerm>(product.payment_term)
  const [paymentDays, setPaymentDays] = useState(String(product.payment_days || 0))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorField(undefined)

    const parsedMoq = Number(moq)
    if (!Number.isFinite(parsedMoq) || parsedMoq < 1) {
      setErrorField('moq')
      showSnackbar('MOQ kamida 1 bo‘lishi kerak', 'error')
      setSaving(false)
      return
    }

    const parsedDays = paymentTerm === 'deferred' ? Number(paymentDays) : 0
    if (paymentTerm === 'deferred' && (!Number.isFinite(parsedDays) || parsedDays < 1 || parsedDays > 30)) {
      setErrorField('payment_days')
      showSnackbar('Kechiktirilgan to‘lovda kunlar soni 1–30 oralig‘ida bo‘lishi kerak', 'error')
      setSaving(false)
      return
    }

    try {
      await api.updateProduct(product.id, {
        name: product.name,
        description: product.description,
        category_id: product.category_id,
        subcategory_id: product.subcategory_id,
        specs: product.specs,
        price: Number(price),
        quantity: Number(quantity),
        moq: parsedMoq,
        payment_term: paymentTerm,
        payment_days: parsedDays,
      })
      showSnackbar('Mahsulot yangilandi')
      onSaved()
    } catch (saveError) {
      showSnackbar(getErrorMessage(saveError), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="font-bold">Tezkor tahrirlash</h3>
            <p className="mt-1 text-xs text-slate-400">{product.name} · {product.code}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-5 px-6 py-5 sm:grid-cols-2">
          <Field
            name="price"
            label="Narx"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={setPrice}
            invalid={errorField === 'price'}
          />
          <Field
            name="quantity"
            label="Soni"
            type="number"
            min="0"
            step="1"
            value={quantity}
            onChange={setQuantity}
            invalid={errorField === 'quantity'}
          />
          <Field
            name="moq"
            label="MOQ (min. buyurtma)"
            type="number"
            min="1"
            step="1"
            value={moq}
            onChange={setMoq}
            invalid={errorField === 'moq'}
          />
          <CustomSelect
            label="To‘lov sharti"
            value={paymentTerm}
            options={PAYMENT_TERM_OPTIONS}
            onChange={(next) => setPaymentTerm(next as PaymentTerm)}
          />
          {paymentTerm === 'deferred' && (
            <Field
              name="payment_days"
              label="Kechiktirish (kun, 1–30)"
              type="number"
              min="1"
              step="1"
              value={paymentDays}
              onChange={setPaymentDays}
              invalid={errorField === 'payment_days'}
              className="sm:col-span-2"
            />
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl px-4 text-sm font-bold text-slate-500 hover:bg-slate-100"
          >
            Bekor qilish
          </button>
          <button
            disabled={saving}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#173c32] px-4 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? <LoaderCircle className="animate-spin" size={16} /> : null}
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

function ModalShell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <button aria-label="Yopish" onClick={onClose} className="absolute inset-0 cursor-default" />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

function Field({
  name,
  label,
  value,
  onChange,
  type = 'text',
  min,
  step,
  invalid = false,
  className = '',
}: {
  name: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  min?: string
  step?: string
  invalid?: boolean
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-bold text-slate-600">{label}</span>
      <input
        name={name}
        type={type}
        required
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-12 w-full rounded-xl border bg-slate-50/40 px-4 text-sm outline-none transition focus:bg-white focus:ring-4 ${
          invalid
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-slate-200 focus:border-[#397461] focus:ring-[#397461]/8'
        }`}
      />
    </label>
  )
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-5" aria-label="Mahsulotlar yuklanmoqda">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
          <div className="size-12 rounded-xl bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 rounded-full bg-slate-200" />
            <div className="h-2.5 w-24 rounded-full bg-slate-200/70" />
          </div>
          <div className="h-3 w-20 rounded-full bg-slate-200" />
          <div className="h-3 w-16 rounded-full bg-slate-200" />
        </div>
      ))}
    </div>
  )
}
