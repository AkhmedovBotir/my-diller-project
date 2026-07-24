import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  ImagePlus,
  LoaderCircle,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { api, getErrorField, getErrorMessage } from '../../shared/api'
import { CustomSelect } from '../../shared/CustomSelect'
import { formatDateTime } from '../../shared/date'
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  SPEC_FIELDS,
  formatPrice,
  isDeltaEmpty,
  normalizeDelta,
  paymentTermLabel,
  productStatusLabel,
  productStatusStyle,
} from '../../shared/product'
import { QuillEditor, QuillViewer } from '../../shared/QuillEditor'
import { useSnackbar } from '../../shared/Snackbar'
import type { Category, PaymentTerm, Product, ProductStatus, QuillDelta, Subcategory } from '../../shared/types'

type StatusFilter = ProductStatus | 'all'

export function ProductsPage() {
  const { showSnackbar } = useSnackbar()
  const [items, setItems] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [offset, setOffset] = useState(0)
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [viewing, setViewing] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [resubmittingId, setResubmittingId] = useState<number | null>(null)
  const limit = 20

  const loadCatalog = useCallback(async () => {
    try {
      const [cats, subs] = await Promise.all([
        api.categories(100, 0),
        api.subcategories({ limit: 100, offset: 0 }),
      ])
      setCategories(cats)
      setSubcategories(subs)
    } catch (catalogError) {
      showSnackbar(getErrorMessage(catalogError), 'error')
    }
  }, [showSnackbar])

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
    const task = window.setTimeout(() => {
      void loadCatalog()
      void loadItems()
    }, 0)
    return () => window.clearTimeout(task)
  }, [loadCatalog, loadItems])

  const categoryName = useCallback(
    (id: number) => categories.find((item) => item.id === id)?.name ?? `#${id}`,
    [categories],
  )

  const subcategoryName = useCallback(
    (id: number) => subcategories.find((item) => item.id === id)?.name ?? `#${id}`,
    [subcategories],
  )

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return items
    return items.filter((item) =>
      `${item.name} ${item.code} ${categoryName(item.category_id)} ${subcategoryName(item.subcategory_id)}`
        .toLocaleLowerCase()
        .includes(query),
    )
  }, [categoryName, items, search, subcategoryName])

  async function handleResubmit(product: Product) {
    setResubmittingId(product.id)
    try {
      await api.resubmitProduct(product.id)
      showSnackbar('Mahsulot qayta yuborildi')
      void loadItems()
    } catch (resubmitError) {
      showSnackbar(getErrorMessage(resubmitError), 'error')
    } finally {
      setResubmittingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Mahsulotlar</h2>
          <p className="mt-1 text-xs text-slate-400">
            Yangi mahsulotlar pending holatida yaratiladi va admin tasdig‘ini kutadi
          </p>
        </div>
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setEditing('new')}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#173c32] px-5 text-sm font-bold text-white shadow-lg shadow-[#173c32]/10"
        >
          <Plus size={18} />
          Yangi mahsulot
        </motion.button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom, kod yoki kategoriya"
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
                    <th className="px-4 py-4">Kategoriya</th>
                    <th className="px-4 py-4">Narx</th>
                    <th className="px-4 py-4">Soni</th>
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
                      <td className="px-4 py-4 text-sm text-slate-600">
                        <p className="font-medium text-slate-700">{categoryName(item.category_id)}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{subcategoryName(item.subcategory_id)}</p>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-700">{formatPrice(item.price)}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{item.quantity}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${productStatusStyle[item.status]}`}>
                          {productStatusLabel[item.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500">{formatDateTime(item.created_at)}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setViewing(item)}
                            className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                            title="Ko‘rish"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => setEditing(item)}
                            className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                            title="Tahrirlash"
                          >
                            <Pencil size={16} />
                          </button>
                          {item.status === 'rejected' && (
                            <button
                              onClick={() => void handleResubmit(item)}
                              disabled={resubmittingId === item.id}
                              className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
                              title="Qayta yuborish"
                            >
                              {resubmittingId === item.id ? (
                                <LoaderCircle className="animate-spin" size={16} />
                              ) : (
                                <RefreshCw size={16} />
                              )}
                            </button>
                          )}
                          {item.status !== 'approved' && (
                            <button
                              onClick={() => setDeleting(item)}
                              className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              title="O‘chirish"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
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
        {viewing && (
          <ViewModal
            product={viewing}
            categoryName={categoryName(viewing.category_id)}
            subcategoryName={subcategoryName(viewing.subcategory_id)}
            onClose={() => setViewing(null)}
            onEdit={() => {
              setViewing(null)
              setEditing(viewing)
            }}
            onResubmit={
              viewing.status === 'rejected'
                ? () => {
                    setViewing(null)
                    void handleResubmit(viewing)
                  }
                : undefined
            }
          />
        )}
        {editing && (
          <FormModal
            product={editing === 'new' ? undefined : editing}
            categories={categories}
            subcategories={subcategories}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null)
              void loadItems()
            }}
          />
        )}
        {deleting && (
          <DeleteModal
            product={deleting}
            onClose={() => setDeleting(null)}
            onDeleted={() => {
              setDeleting(null)
              void loadItems()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ViewModal({
  product,
  categoryName,
  subcategoryName,
  onClose,
  onEdit,
  onResubmit,
}: {
  product: Product
  categoryName: string
  subcategoryName: string
  onClose: () => void
  onEdit: () => void
  onResubmit?: () => void
}) {
  const details = [
    { label: 'Kod', value: product.code },
    { label: 'Kategoriya', value: categoryName },
    { label: 'Subkategoriya', value: subcategoryName },
    { label: 'Narx', value: formatPrice(product.price) },
    { label: 'Soni', value: String(product.quantity) },
    { label: 'Minimal buyurtma (MOQ)', value: String(product.moq) },
    { label: 'To‘lov sharti', value: paymentTermLabel[product.payment_term] },
    ...(product.payment_term === 'deferred'
      ? [{ label: 'To‘lov muddati', value: `${product.payment_days} kun` }]
      : []),
    { label: 'Yaratilgan', value: formatDateTime(product.created_at) },
    { label: 'Yangilangan', value: formatDateTime(product.updated_at) },
  ]

  const specsEntries = Object.entries(product.specs ?? {}).filter(([, value]) => value)

  return (
    <ModalShell onClose={onClose} wide>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div>
          <h3 className="font-bold">Mahsulot ma’lumotlari</h3>
          <p className="mt-1 text-xs text-slate-400">{product.name}</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-5 px-6 py-5">
        <div className="flex flex-wrap gap-2">
          {product.images.map((src) => (
            <a key={src} href={src} target="_blank" rel="noreferrer" className="size-20 overflow-hidden rounded-xl border border-slate-200">
              <img src={src} alt="" className="size-full object-cover" />
            </a>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${productStatusStyle[product.status]}`}>
            {productStatusLabel[product.status]}
          </span>
          {product.status === 'rejected' && product.rejection_note && (
            <p className="text-xs text-red-500">{product.rejection_note}</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Tavsif</p>
          <QuillViewer value={product.description} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {details.map((row) => (
            <div key={row.label} className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] text-slate-400">{row.label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{row.value}</p>
            </div>
          ))}
        </div>

        {specsEntries.length > 0 && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Xususiyatlar</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {specsEntries.map(([key, value]) => {
                const field = SPEC_FIELDS.find((item) => item.key === key)
                return (
                  <div key={key} className="rounded-lg bg-white px-3 py-2.5">
                    <p className="text-[11px] text-slate-400">{field?.label ?? key}</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-700">{value}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">
        {onResubmit && (
          <button
            onClick={onResubmit}
            className="flex h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-700"
          >
            <RefreshCw size={16} />
            Qayta yuborish
          </button>
        )}
        <button
          onClick={onEdit}
          className="flex h-10 items-center gap-2 rounded-xl bg-[#173c32] px-4 text-sm font-bold text-white"
        >
          <Pencil size={16} />
          Tahrirlash
        </button>
      </div>
    </ModalShell>
  )
}

function FormModal({
  product,
  categories,
  subcategories,
  onClose,
  onSaved,
}: {
  product?: Product
  categories: Category[]
  subcategories: Subcategory[]
  onClose: () => void
  onSaved: () => void
}) {
  const { showSnackbar } = useSnackbar()
  const [saving, setSaving] = useState(false)
  const [errorField, setErrorField] = useState<string>()
  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState<QuillDelta>(() => normalizeDelta(product?.description))
  const [categoryId, setCategoryId] = useState(String(product?.category_id ?? ''))
  const [subcategoryId, setSubcategoryId] = useState(String(product?.subcategory_id ?? ''))
  const [price, setPrice] = useState(product ? String(product.price) : '0')
  const [quantity, setQuantity] = useState(product ? String(product.quantity) : '0')
  const [moq, setMoq] = useState(product ? String(product.moq) : '1')
  const [paymentTerm, setPaymentTerm] = useState<PaymentTerm>(product?.payment_term ?? 'prepay_100')
  const [paymentDays, setPaymentDays] = useState(product ? String(product.payment_days || 14) : '14')
  const [specs, setSpecs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const field of SPEC_FIELDS) initial[field.key] = product?.specs?.[field.key] ?? ''
    return initial
  })
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])

  const paymentTermOptions = useMemo(
    () => [
      { value: 'prepay_100', label: paymentTermLabel.prepay_100 },
      { value: 'deferred', label: paymentTermLabel.deferred },
      { value: 'pod_zakaz_50_50', label: paymentTermLabel.pod_zakaz_50_50 },
    ],
    [],
  )

  useEffect(() => {
    if (!categoryId && categories[0]) setCategoryId(String(categories[0].id))
  }, [categories, categoryId])

  const categoryOptions = useMemo(
    () =>
      categories.map((item) => ({
        value: String(item.id),
        label: item.name,
        description: item.description || undefined,
      })),
    [categories],
  )

  const filteredSubs = useMemo(
    () => subcategories.filter((item) => String(item.category_id) === categoryId),
    [categoryId, subcategories],
  )

  const subcategoryOptions = useMemo(
    () =>
      filteredSubs.map((item) => ({
        value: String(item.id),
        label: item.name,
        description: item.description || undefined,
      })),
    [filteredSubs],
  )

  useEffect(() => {
    if (!filteredSubs.length) {
      setSubcategoryId('')
      return
    }
    if (!filteredSubs.some((item) => String(item.id) === subcategoryId)) {
      setSubcategoryId(String(filteredSubs[0].id))
    }
  }, [filteredSubs, subcategoryId])

  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [images])

  function handleImageChange(files: FileList | null) {
    if (!files) return
    const next: File[] = []
    for (const file of Array.from(files)) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        showSnackbar('Faqat jpeg, png, webp yoki gif yuklash mumkin', 'error')
        return
      }
      if (file.size > MAX_IMAGE_BYTES) {
        showSnackbar('Har bir rasm 5 MB dan oshmasligi kerak', 'error')
        return
      }
      next.push(file)
    }
    if (next.length > MAX_IMAGES) {
      showSnackbar('Ko‘pi bilan 5 ta rasm yuklash mumkin', 'error')
      return
    }
    setImages(next)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorField(undefined)

    if (!name.trim()) {
      setErrorField('name')
      showSnackbar('Mahsulot nomi kiritilishi shart', 'error')
      setSaving(false)
      return
    }

    if (isDeltaEmpty(description)) {
      setErrorField('description')
      showSnackbar('Tavsif kiritilishi shart', 'error')
      setSaving(false)
      return
    }

    if (!categoryId) {
      setErrorField('category_id')
      showSnackbar('Kategoriya tanlang', 'error')
      setSaving(false)
      return
    }

    if (!subcategoryId) {
      setErrorField('subcategory_id')
      showSnackbar('Subkategoriya tanlang', 'error')
      setSaving(false)
      return
    }

    if (!product && images.length === 0) {
      setErrorField('images')
      showSnackbar('Kamida 1 ta rasm yuklash shart', 'error')
      setSaving(false)
      return
    }

    try {
      const cleanedSpecs = Object.fromEntries(
        Object.entries(specs).filter(([, value]) => value.trim().length > 0),
      )
      const payload = {
        name: name.trim(),
        description: normalizeDelta(description),
        category_id: Number(categoryId),
        subcategory_id: Number(subcategoryId),
        price: Number(price),
        quantity: Number(quantity),
        moq: Math.max(1, Number(moq) || 1),
        payment_term: paymentTerm,
        payment_days: paymentTerm === 'deferred' ? Number(paymentDays) || 1 : 0,
        specs: cleanedSpecs,
        ...(images.length ? { images } : {}),
      }

      if (product) {
        await api.updateProduct(product.id, payload)
        showSnackbar('Mahsulot yangilandi va qayta ko‘rib chiqishga yuborildi')
      } else {
        await api.createProduct({ ...payload, images })
        showSnackbar('Mahsulot yaratildi')
      }
      onSaved()
    } catch (saveError) {
      showSnackbar(getErrorMessage(saveError), 'error')
      setErrorField(getErrorField(saveError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="font-bold">{product ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}</h3>
            <p className="mt-1 text-xs text-slate-400">
              {product
                ? 'Yangilashdan keyin holat yana pending bo‘ladi'
                : 'Rasmlar majburiy (1–5 ta), har biri max 5 MB'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-5 px-6 py-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-xs font-bold text-slate-600">Mahsulot nomi</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className={`h-12 w-full rounded-xl border bg-slate-50/40 px-4 text-sm outline-none transition focus:bg-white focus:ring-4 ${
                errorField === 'name'
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                  : 'border-slate-200 focus:border-[#397461] focus:ring-[#397461]/8'
              }`}
            />
          </label>

          <div className="sm:col-span-2">
            <span className="mb-2 block text-xs font-bold text-slate-600">Tavsif</span>
            <QuillEditor
              value={description}
              onChange={setDescription}
              invalid={errorField === 'description'}
              placeholder="Mahsulot haqida to‘liq tavsif yozing..."
            />
          </div>

          <CustomSelect
            label="Kategoriya"
            value={categoryId}
            options={categoryOptions}
            onChange={(next) => {
              setCategoryId(next)
              setSubcategoryId('')
            }}
            placeholder="Kategoriya tanlang"
            searchPlaceholder="Kategoriya qidirish..."
            invalid={errorField === 'category_id'}
            emptyText="Kategoriya yo‘q"
          />

          <CustomSelect
            label="Subkategoriya"
            value={subcategoryId}
            options={subcategoryOptions}
            onChange={setSubcategoryId}
            placeholder={categoryId ? 'Subkategoriya tanlang' : 'Avval kategoriya tanlang'}
            searchPlaceholder="Subkategoriya qidirish..."
            invalid={errorField === 'subcategory_id'}
            disabled={!categoryId}
            emptyText="Bu kategoriyada subkategoriya yo‘q"
          />

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
            label="Minimal buyurtma miqdori (MOQ)"
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
            options={paymentTermOptions}
            onChange={(next) => setPaymentTerm(next as PaymentTerm)}
            invalid={errorField === 'payment_term'}
          />

          {paymentTerm === 'deferred' && (
            <Field
              name="payment_days"
              label="To‘lov muddati (kun)"
              type="number"
              min="1"
              step="1"
              value={paymentDays}
              onChange={setPaymentDays}
              invalid={errorField === 'payment_days'}
            />
          )}

          <div className="sm:col-span-2">
            <span className="mb-2 block text-xs font-bold text-slate-600">
              Xususiyatlar <span className="font-medium text-slate-400">(ixtiyoriy)</span>
            </span>
            <div className="grid gap-3 sm:grid-cols-2">
              {SPEC_FIELDS.map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold text-slate-500">{field.label}</span>
                  <input
                    value={specs[field.key] ?? ''}
                    onChange={(event) =>
                      setSpecs((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 text-sm outline-none transition focus:border-[#397461] focus:bg-white focus:ring-4 focus:ring-[#397461]/8"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <span className="mb-2 block text-xs font-bold text-slate-600">
              Rasmlar {product ? '(ixtiyoriy — yuborilmasa eski rasmlar saqlanadi)' : '(1–5 ta)'}
            </span>
            <label
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 transition hover:bg-slate-50 ${
                errorField === 'images' ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-slate-50/40'
              }`}
            >
              <ImagePlus className="text-slate-400" size={22} />
              <span className="text-sm font-semibold text-slate-600">Rasm tanlash</span>
              <span className="text-xs text-slate-400">jpeg, png, webp, gif · max 5 MB</span>
              <input
                type="file"
                accept={ALLOWED_IMAGE_TYPES.join(',')}
                multiple
                className="hidden"
                onChange={(event) => handleImageChange(event.target.files)}
              />
            </label>

            {(previews.length > 0 || (product && images.length === 0)) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {previews.length > 0
                  ? previews.map((src) => (
                      <div key={src} className="size-16 overflow-hidden rounded-xl border border-slate-200">
                        <img src={src} alt="" className="size-full object-cover" />
                      </div>
                    ))
                  : product?.images.map((src) => (
                      <div key={src} className="size-16 overflow-hidden rounded-xl border border-slate-200">
                        <img src={src} alt="" className="size-full object-cover" />
                      </div>
                    ))}
              </div>
            )}
            {images.length > 0 && (
              <button
                type="button"
                onClick={() => setImages([])}
                className="mt-2 text-xs font-bold text-slate-500 hover:text-red-500"
              >
                Tanlangan yangi rasmlarni tozalash
              </button>
            )}
          </div>
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
            {saving ? 'Saqlanmoqda...' : product ? 'Saqlash' : 'Yaratish'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

function DeleteModal({
  product,
  onClose,
  onDeleted,
}: {
  product: Product
  onClose: () => void
  onDeleted: () => void
}) {
  const { showSnackbar } = useSnackbar()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.deleteProduct(product.id)
      showSnackbar('Mahsulot o‘chirildi')
      onDeleted()
    } catch (deleteError) {
      showSnackbar(getErrorMessage(deleteError), 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="px-6 py-6 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-500">
          <Trash2 size={24} />
        </div>
        <h3 className="mt-5 text-lg font-bold">Mahsulotni o‘chirasizmi?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          <span className="font-semibold text-slate-600">{product.name}</span> ({product.code}) butunlay o‘chiriladi.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={onClose}
            className="h-10 rounded-xl px-4 text-sm font-bold text-slate-500 hover:bg-slate-100"
          >
            Bekor qilish
          </button>
          <button
            disabled={deleting}
            onClick={() => void handleDelete()}
            className="flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white disabled:opacity-60"
          >
            {deleting ? <LoaderCircle className="animate-spin" size={16} /> : null}
            O‘chirish
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

function ModalShell({
  children,
  onClose,
  wide = false,
}: {
  children: ReactNode
  onClose: () => void
  wide?: boolean
}) {
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
        className={`relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-md'
        }`}
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
