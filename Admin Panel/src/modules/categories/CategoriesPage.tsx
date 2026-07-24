import { useCallback, useEffect, useMemo, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Eye,
  FolderOpen,
  FolderTree,
  Layers3,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { api, getErrorField, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { useSnackbar } from '../../shared/Snackbar'
import type { Category, CategoryInput, Subcategory, SubcategoryInput } from '../../shared/types'

export function CategoriesPage() {
  const { showSnackbar } = useSnackbar()
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingSubs, setLoadingSubs] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const [subSearch, setSubSearch] = useState('')
  const [categoryModal, setCategoryModal] = useState<Category | 'new' | null>(null)
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [subModal, setSubModal] = useState<Subcategory | 'new' | null>(null)
  const [viewingSub, setViewingSub] = useState<Subcategory | null>(null)
  const [deletingSub, setDeletingSub] = useState<Subcategory | null>(null)

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === selectedId) ?? null,
    [categories, selectedId],
  )

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true)
    try {
      const list = await api.categories(100, 0)
      setCategories(list)
      setSelectedId((current) => {
        if (current && list.some((item) => item.id === current)) return current
        return list[0]?.id ?? null
      })
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
    } finally {
      setLoadingCategories(false)
    }
  }, [showSnackbar])

  const loadSubcategories = useCallback(async (categoryId: number) => {
    setLoadingSubs(true)
    try {
      setSubcategories(await api.subcategories({ category_id: categoryId, limit: 100, offset: 0 }))
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
      setSubcategories([])
    } finally {
      setLoadingSubs(false)
    }
  }, [showSnackbar])

  useEffect(() => {
    const task = window.setTimeout(() => void loadCategories(), 0)
    return () => window.clearTimeout(task)
  }, [loadCategories])

  useEffect(() => {
    if (selectedId == null) {
      const task = window.setTimeout(() => setSubcategories([]), 0)
      return () => window.clearTimeout(task)
    }
    const task = window.setTimeout(() => void loadSubcategories(selectedId), 0)
    return () => window.clearTimeout(task)
  }, [selectedId, loadSubcategories])

  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLocaleLowerCase()
    if (!query) return categories
    return categories.filter((item) =>
      `${item.name} ${item.description}`.toLocaleLowerCase().includes(query),
    )
  }, [categories, categorySearch])

  const filteredSubs = useMemo(() => {
    const query = subSearch.trim().toLocaleLowerCase()
    if (!query) return subcategories
    return subcategories.filter((item) =>
      `${item.name} ${item.description}`.toLocaleLowerCase().includes(query),
    )
  }, [subcategories, subSearch])

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] bg-[#173c32] px-6 py-7 text-white sm:px-8">
        <div className="absolute -right-10 -top-16 size-56 rounded-full border border-white/10" />
        <div className="absolute bottom-0 right-1/4 h-1/2 w-1/3 bg-[#c9f560]/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-[#c9f560]">
              <FolderTree size={14} />
              Katalog tuzilmasi
            </div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Kategoriya va subkategoriyalar</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/60">
              Mahsulot katalogini ierarxik tarzda boshqaring. Kategoriya o‘chirilsa, bog‘langan subkategoriyalar ham o‘chadi.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-50/40">Kategoriyalar</p>
              <p className="mt-1 text-xl font-bold">{categories.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-50/40">Subkategoriyalar</p>
              <p className="mt-1 text-xl font-bold">{subcategories.length}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div className="flex items-center gap-2">
              <div className="grid size-9 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]">
                <FolderOpen size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Kategoriyalar</h3>
                <p className="text-[11px] text-slate-400">Asosiy bo‘limlar</p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setCategoryModal('new')}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-[#173c32] px-3 text-xs font-bold text-white"
            >
              <Plus size={15} />
              Qo‘shish
            </motion.button>
          </div>

          <div className="border-b border-slate-100 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                placeholder="Kategoriya qidirish"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-sm outline-none focus:border-[#397461] focus:bg-white"
              />
            </div>
          </div>

          <div className="max-h-[620px] overflow-y-auto p-2">
            {loadingCategories ? (
              <CategoryListSkeleton />
            ) : filteredCategories.length === 0 ? (
              <EmptyState text="Kategoriya topilmadi" />
            ) : (
              filteredCategories.map((category) => {
                const active = category.id === selectedId
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedId(category.id)}
                    className={`mb-1 w-full rounded-2xl px-3 py-3 text-left transition ${
                      active
                        ? 'bg-[#eff8f3] ring-1 ring-[#397461]/15'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${
                          active ? 'bg-[#173c32] text-[#c9f560]' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <Layers3 size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`truncate text-sm font-bold ${active ? 'text-[#173c32]' : 'text-slate-800'}`}>
                            {category.name}
                          </p>
                          <div className="flex shrink-0 gap-0.5">
                            <ActionIcon
                              title="Ko‘rish"
                              onClick={(event) => {
                                event.stopPropagation()
                                setViewingCategory(category)
                              }}
                              className="hover:bg-emerald-50 hover:text-emerald-700"
                            >
                              <Eye size={14} />
                            </ActionIcon>
                            <ActionIcon
                              title="O‘zgartirish"
                              onClick={(event) => {
                                event.stopPropagation()
                                setCategoryModal(category)
                              }}
                              className="hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Pencil size={14} />
                            </ActionIcon>
                            <ActionIcon
                              title="O‘chirish"
                              onClick={(event) => {
                                event.stopPropagation()
                                setDeletingCategory(category)
                              }}
                              className="hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={14} />
                            </ActionIcon>
                          </div>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                          {category.description || 'Tavsif kiritilmagan'}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {selectedCategory ? selectedCategory.name : 'Subkategoriyalar'}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {selectedCategory
                  ? 'Tanlangan kategoriyaga tegishli subkategoriyalar'
                  : 'Avval chapdan kategoriya tanlang'}
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={!selectedCategory}
              onClick={() => setSubModal('new')}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#173c32] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={16} />
              Subkategoriya
            </motion.button>
          </div>

          <div className="border-b border-slate-100 p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={subSearch}
                onChange={(event) => setSubSearch(event.target.value)}
                disabled={!selectedCategory}
                placeholder="Subkategoriya qidirish"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-sm outline-none focus:border-[#397461] focus:bg-white disabled:opacity-50"
              />
            </div>
          </div>

          {!selectedCategory ? (
            <div className="grid min-h-80 place-items-center p-8 text-center">
              <div>
                <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                  <FolderTree size={24} />
                </div>
                <p className="text-sm font-semibold text-slate-600">Kategoriya tanlanmagan</p>
                <p className="mt-1 text-xs text-slate-400">Subkategoriyalarni ko‘rish uchun chapdan tanlang</p>
              </div>
            </div>
          ) : loadingSubs ? (
            <SubTableSkeleton />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
                  <thead>
                    <tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3.5">Nomi</th>
                      <th className="px-4 py-3.5">Tavsif</th>
                      <th className="px-4 py-3.5">Yaratilgan</th>
                      <th className="px-5 py-3.5 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubs.map((item, index) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-slate-50/50"
                      >
                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-slate-800">{item.name}</p>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-500">
                          <span className="line-clamp-2 max-w-xs">{item.description || '—'}</span>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-500">{formatDateTime(item.created_at)}</td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setViewingSub(item)}
                              className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                              title="Ko‘rish"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => setSubModal(item)}
                              className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                              title="O‘zgartirish"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setDeletingSub(item)}
                              className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              title="O‘chirish"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                {filteredSubs.length === 0 && (
                  <div className="py-16 text-center text-sm text-slate-400">Subkategoriya topilmadi</div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <AnimatePresence>
        {viewingCategory && (
          <CategoryViewModal
            category={viewingCategory}
            onClose={() => setViewingCategory(null)}
            onEdit={() => {
              setViewingCategory(null)
              setCategoryModal(viewingCategory)
            }}
          />
        )}
        {categoryModal && (
          <CategoryFormModal
            category={categoryModal === 'new' ? undefined : categoryModal}
            onClose={() => setCategoryModal(null)}
            onSaved={async () => {
              setCategoryModal(null)
              await loadCategories()
            }}
          />
        )}
        {deletingCategory && (
          <DeleteConfirmModal
            title="Kategoriyani o‘chirasizmi?"
            description={`${deletingCategory.name} o‘chirilsa, unga bog‘langan barcha subkategoriyalar ham o‘chadi.`}
            onClose={() => setDeletingCategory(null)}
            onConfirm={async () => {
              await api.deleteCategory(deletingCategory.id)
              showSnackbar('Kategoriya o‘chirildi')
              setDeletingCategory(null)
              if (selectedId === deletingCategory.id) setSelectedId(null)
              await loadCategories()
            }}
          />
        )}
        {viewingSub && selectedCategory && (
          <SubViewModal
            subcategory={viewingSub}
            categoryName={selectedCategory.name}
            onClose={() => setViewingSub(null)}
            onEdit={() => {
              setViewingSub(null)
              setSubModal(viewingSub)
            }}
          />
        )}
        {subModal && selectedCategory && (
          <SubFormModal
            subcategory={subModal === 'new' ? undefined : subModal}
            categories={categories}
            defaultCategoryId={selectedCategory.id}
            onClose={() => setSubModal(null)}
            onSaved={async (categoryId) => {
              setSubModal(null)
              setSelectedId(categoryId)
              await loadSubcategories(categoryId)
            }}
          />
        )}
        {deletingSub && (
          <DeleteConfirmModal
            title="Subkategoriyani o‘chirasizmi?"
            description={`${deletingSub.name} tizimdan butunlay o‘chiriladi.`}
            onClose={() => setDeletingSub(null)}
            onConfirm={async () => {
              await api.deleteSubcategory(deletingSub.id)
              showSnackbar('Subkategoriya o‘chirildi')
              setDeletingSub(null)
              if (selectedId != null) await loadSubcategories(selectedId)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function CategoryFormModal({
  category,
  onClose,
  onSaved,
}: {
  category?: Category
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { showSnackbar } = useSnackbar()
  const [saving, setSaving] = useState(false)
  const [errorField, setErrorField] = useState<string>()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorField(undefined)
    const form = new FormData(event.currentTarget)
    const input: CategoryInput = {
      name: String(form.get('name')).trim(),
      description: String(form.get('description')),
    }
    try {
      if (category) await api.updateCategory(category.id, input)
      else await api.createCategory(input)
      showSnackbar(category ? 'Kategoriya yangilandi' : 'Kategoriya yaratildi')
      await onSaved()
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
      setErrorField(getErrorField(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader
        icon={<FolderOpen size={20} />}
        title={category ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}
        subtitle="Nom majburiy, tavsif ixtiyoriy"
        onClose={onClose}
      />
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <Field name="name" label="Nomi" defaultValue={category?.name} invalid={errorField === 'name'} />
        <TextArea
          name="description"
          label="Tavsif"
          defaultValue={category?.description}
          invalid={errorField === 'description'}
          optional
        />
        <ModalActions onClose={onClose} saving={saving} saveLabel={category ? 'Saqlash' : 'Yaratish'} />
      </form>
    </Modal>
  )
}

function SubFormModal({
  subcategory,
  categories,
  defaultCategoryId,
  onClose,
  onSaved,
}: {
  subcategory?: Subcategory
  categories: Category[]
  defaultCategoryId: number
  onClose: () => void
  onSaved: (categoryId: number) => Promise<void>
}) {
  const { showSnackbar } = useSnackbar()
  const [saving, setSaving] = useState(false)
  const [errorField, setErrorField] = useState<string>()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorField(undefined)
    const form = new FormData(event.currentTarget)
    const input: SubcategoryInput = {
      category_id: Number(form.get('category_id')),
      name: String(form.get('name')).trim(),
      description: String(form.get('description')),
    }
    try {
      if (subcategory) await api.updateSubcategory(subcategory.id, input)
      else await api.createSubcategory(input)
      showSnackbar(subcategory ? 'Subkategoriya yangilandi' : 'Subkategoriya yaratildi')
      await onSaved(input.category_id)
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
      setErrorField(getErrorField(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader
        icon={<Layers3 size={20} />}
        title={subcategory ? 'Subkategoriyani tahrirlash' : 'Yangi subkategoriya'}
        subtitle="Kerakli kategoriyaga biriktirib saqlang"
        onClose={onClose}
      />
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-slate-600">Kategoriya</span>
          <select
            name="category_id"
            defaultValue={subcategory?.category_id ?? defaultCategoryId}
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
        <Field name="name" label="Nomi" defaultValue={subcategory?.name} invalid={errorField === 'name'} />
        <TextArea
          name="description"
          label="Tavsif"
          defaultValue={subcategory?.description}
          invalid={errorField === 'description'}
          optional
        />
        <ModalActions onClose={onClose} saving={saving} saveLabel={subcategory ? 'Saqlash' : 'Yaratish'} />
      </form>
    </Modal>
  )
}

function CategoryViewModal({
  category,
  onClose,
  onEdit,
}: {
  category: Category
  onClose: () => void
  onEdit: () => void
}) {
  return (
    <Modal onClose={onClose}>
      <ModalHeader icon={<Eye size={20} />} title="Kategoriya ma’lumotlari" subtitle="To‘liq ko‘rinish" onClose={onClose} />
      <div className="p-6">
        <div className="mb-6 rounded-2xl bg-slate-50 p-4">
          <p className="text-lg font-bold text-slate-900">{category.name}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{category.description || 'Tavsif kiritilmagan'}</p>
        </div>
        <DetailGrid
          items={[
            { label: 'Yaratilgan', value: formatDateTime(category.created_at) },
            { label: 'Yangilangan', value: formatDateTime(category.updated_at) },
          ]}
        />
        <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button onClick={onClose} className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600">
            Yopish
          </button>
          <button onClick={onEdit} className="flex h-11 items-center gap-2 rounded-xl bg-[#173c32] px-5 text-sm font-bold text-white">
            <Pencil size={16} />
            O‘zgartirish
          </button>
        </div>
      </div>
    </Modal>
  )
}

function SubViewModal({
  subcategory,
  categoryName,
  onClose,
  onEdit,
}: {
  subcategory: Subcategory
  categoryName: string
  onClose: () => void
  onEdit: () => void
}) {
  return (
    <Modal onClose={onClose}>
      <ModalHeader icon={<Eye size={20} />} title="Subkategoriya ma’lumotlari" subtitle="To‘liq ko‘rinish" onClose={onClose} />
      <div className="p-6">
        <div className="mb-6 rounded-2xl bg-slate-50 p-4">
          <p className="text-lg font-bold text-slate-900">{subcategory.name}</p>
          <p className="mt-1 text-xs font-semibold text-[#397461]">{categoryName}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{subcategory.description || 'Tavsif kiritilmagan'}</p>
        </div>
        <DetailGrid
          items={[
            { label: 'Yaratilgan', value: formatDateTime(subcategory.created_at) },
            { label: 'Yangilangan', value: formatDateTime(subcategory.updated_at) },
          ]}
        />
        <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button onClick={onClose} className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600">
            Yopish
          </button>
          <button onClick={onEdit} className="flex h-11 items-center gap-2 rounded-xl bg-[#173c32] px-5 text-sm font-bold text-white">
            <Pencil size={16} />
            O‘zgartirish
          </button>
        </div>
      </div>
    </Modal>
  )
}

function DeleteConfirmModal({
  title,
  description,
  onClose,
  onConfirm,
}: {
  title: string
  description: string
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const { showSnackbar } = useSnackbar()
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose} narrow>
      <div className="p-6 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-500">
          <AlertTriangle size={24} />
        </div>
        <h3 className="mt-5 text-lg font-bold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={onClose} className="h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">
            Bekor qilish
          </button>
          <button
            onClick={() => void handleConfirm()}
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
}: {
  children: ReactNode
  onClose: () => void
  narrow?: boolean
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
        className={`w-full overflow-hidden rounded-2xl bg-white shadow-2xl ${narrow ? 'max-w-md' : 'max-w-xl'}`}
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

function ModalActions({
  onClose,
  saving,
  saveLabel,
}: {
  onClose: () => void
  saving: boolean
  saveLabel: string
}) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600">
        Bekor qilish
      </button>
      <button
        disabled={saving}
        className="flex h-11 items-center gap-2 rounded-xl bg-[#173c32] px-5 text-sm font-bold text-white disabled:opacity-60"
      >
        {saving && <LoaderCircle className="animate-spin" size={17} />}
        {saving ? 'Saqlanmoqda...' : saveLabel}
      </button>
    </div>
  )
}

function Field({
  name,
  label,
  defaultValue,
  invalid = false,
}: {
  name: string
  label: string
  defaultValue?: string
  invalid?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-slate-600">{label}</span>
      <input
        name={name}
        required
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

function TextArea({
  name,
  label,
  defaultValue,
  invalid = false,
  optional = false,
}: {
  name: string
  label: string
  defaultValue?: string
  invalid?: boolean
  optional?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-slate-600">
        {label}
        {optional && <span className="ml-1 font-medium text-slate-400">(ixtiyoriy)</span>}
      </span>
      <textarea
        name={name}
        rows={3}
        defaultValue={defaultValue}
        className={`w-full resize-none rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-4 ${
          invalid
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-slate-200 focus:border-[#397461] focus:ring-[#397461]/8'
        }`}
      />
    </label>
  )
}

function DetailGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <dl className="grid gap-5 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</dt>
          <dd className="mt-1.5 text-sm font-semibold text-slate-700">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function ActionIcon({
  children,
  onClick,
  title,
  className,
}: {
  children: ReactNode
  onClick: (event: MouseEvent) => void
  title: string
  className: string
}) {
  return (
    <span
      role="button"
      tabIndex={0}
      title={title}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick(event as unknown as MouseEvent)
        }
      }}
      className={`grid size-7 place-items-center rounded-lg text-slate-400 transition ${className}`}
    >
      {children}
    </span>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="py-16 text-center text-sm text-slate-400">{text}</div>
}

function CategoryListSkeleton() {
  return (
    <div className="animate-pulse space-y-2 p-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-2xl px-3 py-3">
          <div className="size-9 rounded-xl bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded-full bg-slate-200" />
            <div className="h-2.5 w-full rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  )
}

function SubTableSkeleton() {
  return (
    <div className="animate-pulse p-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="mb-4 flex items-center gap-4">
          <div className="h-3 w-1/4 rounded-full bg-slate-200" />
          <div className="h-3 flex-1 rounded-full bg-slate-100" />
          <div className="h-3 w-24 rounded-full bg-slate-200" />
          <div className="h-8 w-24 rounded-lg bg-slate-200" />
        </div>
      ))}
    </div>
  )
}
