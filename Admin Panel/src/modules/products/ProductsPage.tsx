import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  ImageIcon,
  LoaderCircle,
  Package,
  Pencil,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import { api, getErrorField, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { deltaToHtml, deltaToPlainText, formatPrice, plainTextToDelta } from '../../shared/product'
import { useSnackbar } from '../../shared/Snackbar'
import type {
  Category,
  Ishlabchiqaruvchi,
  Product,
  ProductStatus,
  Subcategory,
} from '../../shared/types'

const statusTabs: Array<{ value: ProductStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Barchasi' },
  { value: 'pending', label: 'Kutilmoqda' },
  { value: 'approved', label: 'Tasdiqlangan' },
  { value: 'rejected', label: 'Bekor qilingan' },
]

const statusStyle: Record<ProductStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-600',
}

const statusLabel: Record<ProductStatus, string> = {
  pending: 'Kutilmoqda',
  approved: 'Tasdiqlangan',
  rejected: 'Bekor qilingan',
}

export function ProductsPage() {
  const { showSnackbar } = useSnackbar()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [producers, setProducers] = useState<Ishlabchiqaruvchi[]>([])
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('pending')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewing, setViewing] = useState<Product | null>(null)
  const [editing, setEditing] = useState<Product | null>(null)
  const [rejecting, setRejecting] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const limit = 20

  const loadMeta = useCallback(async () => {
    try {
      const [cats, subs, makers] = await Promise.all([
        api.categories(200, 0),
        api.subcategories({ limit: 500, offset: 0 }),
        api.ishlabchiqaruvchilar(200, 0),
      ])
      setCategories(cats)
      setSubcategories(subs)
      setProducers(makers)
    } catch {
      // Meta yuklanmasa ham mahsulotlar ko‘rsatiladi.
    }
  }, [])

  const resolveRelatedNames = useCallback(async (list: Product[]) => {
    const missingProducerIds = [...new Set(list.map((item) => item.ishlabchiqaruvchi_id))]
    const missingCategoryIds = [...new Set(list.map((item) => item.category_id))]
    const missingSubcategoryIds = [...new Set(list.map((item) => item.subcategory_id))]

    const [producerResults, categoryResults, subcategoryResults] = await Promise.all([
      Promise.all(
        missingProducerIds.map(async (id) => {
          try {
            return await api.ishlabchiqaruvchi(id)
          } catch {
            return null
          }
        }),
      ),
      Promise.all(
        missingCategoryIds.map(async (id) => {
          try {
            return await api.category(id)
          } catch {
            return null
          }
        }),
      ),
      Promise.all(
        missingSubcategoryIds.map(async (id) => {
          try {
            return await api.subcategory(id)
          } catch {
            return null
          }
        }),
      ),
    ])

    setProducers((current) => mergeById(current, producerResults.filter(Boolean) as Ishlabchiqaruvchi[]))
    setCategories((current) => mergeById(current, categoryResults.filter(Boolean) as Category[]))
    setSubcategories((current) => mergeById(current, subcategoryResults.filter(Boolean) as Subcategory[]))
  }, [])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await api.products({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit,
        offset,
      })
      setProducts(list)
      void resolveRelatedNames(list)
    } catch (loadError) {
      const message = getErrorMessage(loadError)
      setError(message)
      showSnackbar(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [offset, resolveRelatedNames, showSnackbar, statusFilter])

  useEffect(() => {
    const task = window.setTimeout(() => void loadMeta(), 0)
    return () => window.clearTimeout(task)
  }, [loadMeta])

  useEffect(() => {
    const task = window.setTimeout(() => void loadProducts(), 0)
    return () => window.clearTimeout(task)
  }, [loadProducts])

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((item) => [String(item.id), item.name])),
    [categories],
  )
  const subcategoryMap = useMemo(
    () => Object.fromEntries(subcategories.map((item) => [String(item.id), item.name])),
    [subcategories],
  )
  const producerMap = useMemo(
    () => Object.fromEntries(producers.map((item) => [String(item.id), item.company_name])),
    [producers],
  )

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return products
    return products.filter((product) =>
      `${product.name} ${product.code} ${producerMap[String(product.ishlabchiqaruvchi_id)] ?? ''}`
        .toLocaleLowerCase()
        .includes(query),
    )
  }, [products, search, producerMap])

  async function handleApprove(product: Product) {
    setApprovingId(product.id)
    try {
      await api.approveProduct(product.id)
      showSnackbar('Mahsulot tasdiqlandi')
      setViewing(null)
      await loadProducts()
    } catch (approveError) {
      showSnackbar(getErrorMessage(approveError), 'error')
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] bg-[#173c32] px-6 py-7 text-white sm:px-8">
        <div className="absolute -right-8 -top-14 size-52 rounded-full border border-white/10" />
        <div className="absolute bottom-0 right-1/4 h-1/2 w-1/3 bg-[#c9f560]/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-[#c9f560]">
              <Package size={14} />
              Moderatsiya
            </div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Mahsulotlar</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/60">
              Ishlab chiqaruvchilar yuborgan mahsulotlarni ko‘ring, tasdiqlang yoki bekor qiling.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-50/40">Joriy sahifa</p>
            <p className="mt-1 text-xl font-bold">{products.length}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex flex-wrap gap-2">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value)
                  setOffset(0)
                }}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  statusFilter === tab.value
                    ? 'bg-[#173c32] text-white'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom, kod yoki ishlab chiqaruvchi"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-sm outline-none focus:border-[#397461] focus:bg-white"
            />
          </div>
        </div>

        {loading ? (
          <ProductTableSkeleton />
        ) : error ? (
          <div className="grid min-h-72 place-items-center p-6 text-center">
            <div>
              <AlertTriangle className="mx-auto mb-3 text-red-400" />
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button onClick={() => void loadProducts()} className="mt-4 text-xs font-bold text-[#397461]">
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
                    <th className="px-5 py-3.5">Mahsulot</th>
                    <th className="px-4 py-3.5">Kod</th>
                    <th className="px-4 py-3.5">Narx</th>
                    <th className="px-4 py-3.5">Miqdor</th>
                    <th className="px-4 py-3.5">Holat</th>
                    <th className="px-4 py-3.5">Sana</th>
                    <th className="px-5 py-3.5 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((product, index) => (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-slate-50/50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <ProductThumb src={product.images[0]} alt={product.name} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-800">{product.name}</p>
                            <p className="mt-0.5 truncate text-xs text-slate-400">
                              {producerMap[String(product.ishlabchiqaruvchi_id)] ?? `ID ${product.ishlabchiqaruvchi_id}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <code className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                          {product.code}
                        </code>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-700">{formatPrice(product.price)}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{product.quantity}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyle[product.status]}`}>
                          {statusLabel[product.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500">{formatDateTime(product.created_at)}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <IconButton title="Ko‘rish" onClick={() => setViewing(product)} className="hover:bg-emerald-50 hover:text-emerald-700">
                            <Eye size={16} />
                          </IconButton>
                          {product.status === 'pending' && (
                            <>
                              <IconButton
                                title="Tasdiqlash"
                                onClick={() => void handleApprove(product)}
                                className="hover:bg-emerald-50 hover:text-emerald-700"
                                disabled={approvingId === product.id}
                              >
                                {approvingId === product.id ? <LoaderCircle className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                              </IconButton>
                              <IconButton title="Bekor qilish" onClick={() => setRejecting(product)} className="hover:bg-amber-50 hover:text-amber-700">
                                <XCircle size={16} />
                              </IconButton>
                            </>
                          )}
                          <IconButton title="O‘zgartirish" onClick={() => setEditing(product)} className="hover:bg-blue-50 hover:text-blue-600">
                            <Pencil size={16} />
                          </IconButton>
                          <IconButton title="O‘chirish" onClick={() => setDeleting(product)} className="hover:bg-red-50 hover:text-red-600">
                            <Trash2 size={16} />
                          </IconButton>
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
                {offset + 1}–{offset + products.length} ko‘rsatilmoqda
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
                  disabled={products.length < limit}
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
        {viewing && (
          <ProductViewModal
            product={viewing}
            categoryName={categoryMap[String(viewing.category_id)] ?? 'Yuklanmoqda...'}
            subcategoryName={subcategoryMap[String(viewing.subcategory_id)] ?? 'Yuklanmoqda...'}
            producerName={producerMap[String(viewing.ishlabchiqaruvchi_id)] ?? 'Yuklanmoqda...'}
            approving={approvingId === viewing.id}
            onClose={() => setViewing(null)}
            onEdit={() => {
              setViewing(null)
              setEditing(viewing)
            }}
            onApprove={() => void handleApprove(viewing)}
            onReject={() => {
              setViewing(null)
              setRejecting(viewing)
            }}
            onDelete={() => {
              setViewing(null)
              setDeleting(viewing)
            }}
          />
        )}
        {editing && (
          <ProductEditModal
            product={editing}
            categories={categories}
            subcategories={subcategories}
            onClose={() => setEditing(null)}
            onSaved={async () => {
              setEditing(null)
              await loadProducts()
            }}
          />
        )}
        {rejecting && (
          <RejectModal
            product={rejecting}
            onClose={() => setRejecting(null)}
            onRejected={async () => {
              setRejecting(null)
              await loadProducts()
            }}
          />
        )}
        {deleting && (
          <DeleteModal
            product={deleting}
            onClose={() => setDeleting(null)}
            onDeleted={async () => {
              setDeleting(null)
              await loadProducts()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ProductViewModal({
  product,
  categoryName,
  subcategoryName,
  producerName,
  approving,
  onClose,
  onEdit,
  onApprove,
  onReject,
  onDelete,
}: {
  product: Product
  categoryName: string
  subcategoryName: string
  producerName: string
  approving: boolean
  onClose: () => void
  onEdit: () => void
  onApprove: () => void
  onReject: () => void
  onDelete: () => void
}) {
  const descriptionHtml = deltaToHtml(product.description)

  return (
    <Modal onClose={onClose} wide>
      <ModalHeader icon={<Eye size={20} />} title="Mahsulot ma’lumotlari" subtitle={product.code} onClose={onClose} />
      <div className="max-h-[75vh] overflow-y-auto p-6">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyle[product.status]}`}>
            {statusLabel[product.status]}
          </span>
          <code className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{product.code}</code>
        </div>

        {product.images.length > 0 ? (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {product.images.map((src) => (
              <a key={src} href={src} target="_blank" rel="noreferrer" className="overflow-hidden rounded-2xl border border-slate-100">
                <img src={src} alt={product.name} className="aspect-square w-full object-cover" />
              </a>
            ))}
          </div>
        ) : (
          <div className="mb-6 grid h-40 place-items-center rounded-2xl bg-slate-50 text-slate-400">
            <div className="text-center">
              <ImageIcon className="mx-auto mb-2" size={28} />
              <p className="text-xs">Rasm yuklanmagan</p>
            </div>
          </div>
        )}

        <h3 className="text-xl font-bold text-slate-900">{product.name}</h3>
        {descriptionHtml ? (
          <div
            className="product-delta mt-3 text-sm leading-7 text-slate-600"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        ) : (
          <p className="mt-3 text-sm leading-6 text-slate-400">Tavsif yo‘q</p>
        )}

        {product.status === 'rejected' && product.rejection_note && (
          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide">Bekor qilish sababi</p>
            {product.rejection_note}
          </div>
        )}

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <Detail label="Ishlab chiqaruvchi" value={producerName} />
          <Detail label="Kategoriya" value={categoryName} />
          <Detail label="Subkategoriya" value={subcategoryName} />
          <Detail label="Narx" value={formatPrice(product.price)} />
          <Detail label="Miqdor" value={String(product.quantity)} />
          <Detail label="Yaratilgan" value={formatDateTime(product.created_at)} />
          <Detail label="Yangilangan" value={formatDateTime(product.updated_at)} />
          <Detail label="Ko‘rib chiqilgan" value={product.reviewed_at ? formatDateTime(product.reviewed_at) : '—'} />
        </dl>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">
        <button onClick={onClose} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600">
          Yopish
        </button>
        <button onClick={onEdit} className="flex h-10 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-700">
          <Pencil size={15} />
          O‘zgartirish
        </button>
        {product.status === 'pending' && (
          <>
            <button
              onClick={onReject}
              className="flex h-10 items-center gap-2 rounded-xl bg-amber-50 px-4 text-sm font-bold text-amber-700"
            >
              <XCircle size={15} />
              Bekor qilish
            </button>
            <button
              onClick={onApprove}
              disabled={approving}
              className="flex h-10 items-center gap-2 rounded-xl bg-[#173c32] px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {approving ? <LoaderCircle className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
              Tasdiqlash
            </button>
          </>
        )}
        <button onClick={onDelete} className="flex h-10 items-center gap-2 rounded-xl bg-red-50 px-4 text-sm font-bold text-red-600">
          <Trash2 size={15} />
          O‘chirish
        </button>
      </div>
    </Modal>
  )
}

function ProductEditModal({
  product,
  categories,
  subcategories,
  onClose,
  onSaved,
}: {
  product: Product
  categories: Category[]
  subcategories: Subcategory[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { showSnackbar } = useSnackbar()
  const [saving, setSaving] = useState(false)
  const [errorField, setErrorField] = useState<string>()
  const [categoryId, setCategoryId] = useState(product.category_id)
  const [images, setImages] = useState<File[]>([])

  const availableSubs = useMemo(
    () => subcategories.filter((item) => item.category_id === categoryId),
    [subcategories, categoryId],
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorField(undefined)
    const form = new FormData(event.currentTarget)
    try {
      await api.updateProduct(product.id, {
        name: String(form.get('name')),
        description: plainTextToDelta(String(form.get('description'))),
        category_id: Number(form.get('category_id')),
        subcategory_id: Number(form.get('subcategory_id')),
        price: Number(form.get('price')),
        quantity: Number(form.get('quantity')),
        images: images.length ? images : undefined,
      })
      showSnackbar('Mahsulot yangilandi va tasdiqlandi')
      await onSaved()
    } catch (saveError) {
      showSnackbar(getErrorMessage(saveError), 'error')
      setErrorField(getErrorField(saveError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} wide>
      <ModalHeader
        icon={<Pencil size={20} />}
        title="Mahsulotni tahrirlash"
        subtitle="Saqlangandan keyin status approved bo‘ladi"
        onClose={onClose}
      />
      <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-4 overflow-y-auto p-6">
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Kod: <span className="font-bold text-slate-700">{product.code}</span> (o‘zgartirilmaydi)
        </div>
        <Field name="name" label="Nomi" defaultValue={product.name} invalid={errorField === 'name'} />
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-slate-600">Tavsif</span>
          <textarea
            name="description"
            rows={4}
            defaultValue={deltaToPlainText(product.description)}
            className={`w-full resize-none rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-4 ${
              errorField === 'description'
                ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                : 'border-slate-200 focus:border-[#397461] focus:ring-[#397461]/8'
            }`}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-600">Kategoriya</span>
            <select
              name="category_id"
              value={categoryId}
              onChange={(event) => setCategoryId(Number(event.target.value))}
              className={`h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ${
                errorField === 'category_id' ? 'border-red-300' : 'border-slate-200 focus:border-[#397461]'
              }`}
            >
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-600">Subkategoriya</span>
            <select
              name="subcategory_id"
              defaultValue={product.subcategory_id}
              key={categoryId}
              className={`h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ${
                errorField === 'subcategory_id' ? 'border-red-300' : 'border-slate-200 focus:border-[#397461]'
              }`}
            >
              {availableSubs.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <Field name="price" label="Narx" type="number" defaultValue={String(product.price)} invalid={errorField === 'price'} />
          <Field name="quantity" label="Miqdor" type="number" defaultValue={String(product.quantity)} invalid={errorField === 'quantity'} />
        </div>
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-slate-600">
            Yangi rasmlar <span className="font-medium text-slate-400">(ixtiyoriy, 1–5 ta)</span>
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []).slice(0, 5)
              setImages(files)
            }}
            className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[#eff8f3] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#397461]"
          />
          {images.length > 0 && (
            <p className="mt-2 text-xs text-slate-400">{images.length} ta yangi rasm tanlandi</p>
          )}
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600">
            Bekor qilish
          </button>
          <button
            disabled={saving}
            className="flex h-11 items-center gap-2 rounded-xl bg-[#173c32] px-5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving && <LoaderCircle className="animate-spin" size={17} />}
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function RejectModal({
  product,
  onClose,
  onRejected,
}: {
  product: Product
  onClose: () => void
  onRejected: () => Promise<void>
}) {
  const { showSnackbar } = useSnackbar()
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!note.trim()) {
      showSnackbar('Bekor qilish sababi majburiy', 'error')
      return
    }
    setLoading(true)
    try {
      await api.rejectProduct(product.id, note.trim())
      showSnackbar('Mahsulot bekor qilindi')
      await onRejected()
    } catch (rejectError) {
      showSnackbar(getErrorMessage(rejectError), 'error')
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader icon={<XCircle size={20} />} title="Mahsulotni bekor qilish" subtitle={product.name} onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-slate-600">Sabab (majburiy)</span>
          <textarea
            required
            rows={4}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Masalan: Rasmlar sifati past, qayta yuklang"
            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#397461] focus:ring-4 focus:ring-[#397461]/8"
          />
        </label>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600">
            Yopish
          </button>
          <button
            disabled={loading}
            className="flex h-11 items-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-bold text-white disabled:opacity-60"
          >
            {loading && <LoaderCircle className="animate-spin" size={17} />}
            {loading ? 'Yuborilmoqda...' : 'Bekor qilish'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function DeleteModal({
  product,
  onClose,
  onDeleted,
}: {
  product: Product
  onClose: () => void
  onDeleted: () => Promise<void>
}) {
  const { showSnackbar } = useSnackbar()
  const [loading, setLoading] = useState(false)

  async function remove() {
    setLoading(true)
    try {
      await api.deleteProduct(product.id)
      showSnackbar('Mahsulot o‘chirildi')
      await onDeleted()
    } catch (deleteError) {
      showSnackbar(getErrorMessage(deleteError), 'error')
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose} narrow>
      <div className="p-6 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-500">
          <Trash2 size={24} />
        </div>
        <h3 className="mt-5 text-lg font-bold">Mahsulotni o‘chirasizmi?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          <span className="font-semibold text-slate-600">{product.name}</span> ({product.code}) butunlay o‘chiriladi.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={onClose} className="h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">
            Bekor qilish
          </button>
          <button
            onClick={() => void remove()}
            disabled={loading}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-red-500 text-sm font-bold text-white disabled:opacity-60"
          >
            {loading && <LoaderCircle className="animate-spin" size={17} />}
            {loading ? 'O‘chirilmoqda...' : 'Ha, o‘chirish'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Modal({
  children,
  onClose,
  narrow = false,
  wide = false,
}: {
  children: ReactNode
  onClose: () => void
  narrow?: boolean
  wide?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className={`w-full overflow-hidden rounded-2xl bg-white shadow-2xl ${
          narrow ? 'max-w-md' : wide ? 'max-w-3xl' : 'max-w-xl'
        }`}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

function ModalHeader({
  icon,
  title,
  subtitle,
  onClose,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  onClose: () => void
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]">{icon}</div>
        <div>
          <h3 className="font-bold">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
        <X size={19} />
      </button>
    </div>
  )
}

function Field({
  name,
  label,
  defaultValue,
  type = 'text',
  invalid = false,
}: {
  name: string
  label: string
  defaultValue?: string
  type?: string
  invalid?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-slate-600">{label}</span>
      <input
        name={name}
        type={type}
        required
        min={type === 'number' ? 0 : undefined}
        defaultValue={defaultValue}
        className={`h-11 w-full rounded-xl border px-3 text-sm outline-none transition focus:ring-4 ${
          invalid
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-slate-200 focus:border-[#397461] focus:ring-[#397461]/8'
        }`}
      />
    </label>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 px-3 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-700">{value}</dd>
    </div>
  )
}

function ProductThumb({ src, alt }: { src?: string; alt: string }) {
  if (!src) {
    return (
      <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-400">
        <Package size={18} />
      </div>
    )
  }
  return <img src={src} alt={alt} className="size-12 shrink-0 rounded-xl object-cover" />
}

function IconButton({
  children,
  onClick,
  title,
  className,
  disabled = false,
}: {
  children: ReactNode
  onClick: () => void
  title: string
  className: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-9 place-items-center rounded-lg text-slate-400 transition disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}

function ProductTableSkeleton() {
  return (
    <div className="animate-pulse p-5">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="mb-4 flex items-center gap-4">
          <div className="size-12 rounded-xl bg-slate-200" />
          <div className="h-3 w-40 rounded-full bg-slate-200" />
          <div className="h-3 w-20 rounded-full bg-slate-100" />
          <div className="h-3 w-24 rounded-full bg-slate-200" />
          <div className="ml-auto h-8 w-36 rounded-lg bg-slate-200" />
        </div>
      ))}
    </div>
  )
}

function mergeById<T extends { id: number }>(current: T[], incoming: T[]) {
  const map = new Map(current.map((item) => [item.id, item]))
  for (const item of incoming) map.set(item.id, item)
  return [...map.values()]
}
