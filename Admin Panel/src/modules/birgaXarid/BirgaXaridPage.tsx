import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { NavLink, Navigate, Outlet } from 'react-router-dom'
import {
  AlertTriangle,
  FolderTree,
  ImagePlus,
  Layers3,
  LoaderCircle,
  Lock,
  Package,
  Pencil,
  Plus,
  Search,
  ShieldOff,
  ShoppingBasket,
  Trash2,
  Users,
  ClipboardList,
  Wallet,
  X,
} from 'lucide-react'
import { api, getErrorField, getErrorMessage } from '../../shared/api'
import { CustomSelect } from '../../shared/CustomSelect'
import { formatDateTime } from '../../shared/date'
import { formatMoney, formatMoneyInput, parseMoneyInput } from '../../shared/order'
import { PhoneInput, toFullPhone } from '../../shared/PhoneInput'
import { useSnackbar } from '../../shared/Snackbar'
import { useAuth } from '../auth/AuthContext'
import type {
  BirgaCategory,
  BirgaCustomer,
  BirgaGroupBuy,
  BirgaGroupBuyKind,
  BirgaGroupBuyStatus,
  BirgaOrder,
  BirgaOrderStatus,
  BirgaProduct,
  BirgaSubcategory,
} from '../../shared/types'
import { BirgaIcon, IconPicker } from './IconPicker'

type TabId = 'kategoriyalar' | 'mahsulotlar' | 'yigimlar' | 'buyurtmalar' | 'mijozlar' | 'moliya'

const BASE_TABS: { id: TabId; label: string; icon: typeof FolderTree }[] = [
  { id: 'kategoriyalar', label: 'Kategoriya', icon: FolderTree },
  { id: 'mahsulotlar', label: 'Mahsulotlar', icon: Package },
  { id: 'yigimlar', label: 'Yig‘im', icon: ShoppingBasket },
  { id: 'buyurtmalar', label: 'Buyurtmalar', icon: ClipboardList },
  { id: 'mijozlar', label: 'Mijozlar', icon: Users },
]

const STATUS_LABEL: Record<BirgaGroupBuyStatus, string> = {
  open: 'Ochiq',
  closed: 'Yopiq',
  in_fulfillment: 'Yetkazilmoqda',
  completed: 'Yakunlangan',
  cancelled: 'Bekor',
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  collecting: 'Yig‘ilmoqda',
  awaiting_courier: 'Kuryer kutmoqda',
  with_courier: 'Kuryerda',
  issued: 'Berildi',
  cancelled: 'Bekor',
}

const PRODUCT_UNITS = [
  { value: 'dona', label: 'Dona' },
  { value: 'kg', label: 'Kg' },
  { value: 'litr', label: 'Litr' },
] as const

export function BirgaXaridPage() {
  const { admin } = useAuth()
  const showMoliya = admin?.type === 'general' || admin?.type === 'admin'
  const tabs = useMemo(
    () =>
      showMoliya
        ? [...BASE_TABS, { id: 'moliya' as const, label: 'Moliya', icon: Wallet }]
        : BASE_TABS,
    [showMoliya],
  )

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] bg-[#173c32] px-6 py-7 text-white sm:px-8">
        <div className="absolute -right-10 -top-16 size-56 rounded-full border border-white/10" />
        <div className="absolute bottom-0 right-1/4 h-1/2 w-1/3 bg-[#c9f560]/10 blur-3xl" />
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-[#c9f560]">
            <Layers3 size={14} />
            Modul ichida modul
          </div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Birga Xarid</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/60">
            Jamoaviy xarid katalogi, yig‘imlar va mijozlar. Ma’lumotlar alohida bazada saqlanadi;
            admin va kuryer My Diller orqali ishlaydi.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white p-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <NavLink
            key={id}
            to={id}
            className={({ isActive }) =>
              `relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                isActive ? 'text-[#173c32]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="birga-tab"
                    className="absolute inset-0 rounded-xl bg-[#c9f560]/70"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <Icon size={16} />
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  )
}

export function BirgaCategoriesPage() {
  return <CategoriesTab />
}

export function BirgaProductsPage() {
  return <ProductsTab />
}

export function BirgaCollectionsPage() {
  return <CollectionsTab />
}

export function BirgaOrdersPage() {
  return <OrdersTab />
}

export function BirgaCustomersPage() {
  return <CustomersTab />
}

export function BirgaXaridIndexRedirect() {
  return <Navigate to="kategoriyalar" replace />
}

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="grid min-h-48 place-items-center p-8 text-center text-sm text-slate-400">{text}</div>
  )
}

function LoadingBlock() {
  return (
    <div className="grid min-h-48 place-items-center p-8">
      <LoaderCircle className="animate-spin text-[#397461]" size={28} />
    </div>
  )
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#102d26]/45 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`w-full overflow-hidden rounded-[28px] bg-white shadow-2xl ${wide ? 'max-w-xl' : 'max-w-lg'}`}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-2">
          <div>
            <h4 className="text-lg font-bold tracking-tight text-slate-900">{title}</h4>
            {subtitle ? <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto px-6 pb-6 pt-2">{children}</div>
      </motion.div>
    </div>
  )
}

function creamFieldClass(invalid?: boolean) {
  return `h-12 w-full rounded-2xl border px-4 text-sm outline-none transition ${
    invalid
      ? 'border-red-300 bg-red-50/40 focus:border-red-400'
      : 'border-[#ebe4d8] bg-[#f7f3eb] text-slate-800 placeholder:text-slate-400 focus:border-[#397461] focus:bg-white'
  }`
}

function fieldClass(invalid?: boolean) {
  return `h-11 w-full rounded-xl border px-3.5 text-sm outline-none transition ${
    invalid
      ? 'border-red-300 bg-red-50/40 focus:border-red-400'
      : 'border-slate-200 bg-slate-50/50 focus:border-[#397461] focus:bg-white'
  }`
}

function CategoriesTab() {
  const { showSnackbar } = useSnackbar()
  const [categories, setCategories] = useState<BirgaCategory[]>([])
  const [subs, setSubs] = useState<BirgaSubcategory[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [catModal, setCatModal] = useState<BirgaCategory | 'new' | null>(null)
  const [subModal, setSubModal] = useState<BirgaSubcategory | 'new' | null>(null)
  const [deletingCat, setDeletingCat] = useState<BirgaCategory | null>(null)
  const [deletingSub, setDeletingSub] = useState<BirgaSubcategory | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await api.birgaCategories()
      setCategories(list)
      setSelectedId((cur) => (cur && list.some((c) => c.id === cur) ? cur : list[0]?.id ?? null))
    } catch (e) {
      showSnackbar(getErrorMessage(e), 'error')
    } finally {
      setLoading(false)
    }
  }, [showSnackbar])

  const loadSubs = useCallback(
    async (categoryId: number) => {
      try {
        setSubs(await api.birgaSubcategories({ category_id: categoryId }))
      } catch (e) {
        showSnackbar(getErrorMessage(e), 'error')
        setSubs([])
      }
    },
    [showSnackbar],
  )

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (selectedId == null) {
      setSubs([])
      return
    }
    void loadSubs(selectedId)
  }, [selectedId, loadSubs])

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel
        title="Kategoriyalar"
        subtitle="Birga Xarid katalogi"
        action={
          <button
            type="button"
            onClick={() => setCatModal('new')}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#173c32] px-4 text-sm font-bold text-white"
          >
            <Plus size={16} /> Qo‘shish
          </button>
        }
      >
        {loading ? (
          <LoadingBlock />
        ) : categories.length === 0 ? (
          <EmptyState text="Hali kategoriya yo‘q" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {categories.map((item) => (
              <li
                key={item.id}
                className={`flex items-center justify-between gap-3 px-5 py-3.5 ${
                  selectedId === item.id ? 'bg-[#eff8f3]' : 'hover:bg-slate-50/80'
                }`}
              >
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelectedId(item.id)}>
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]">
                      <BirgaIcon name={item.icon || 'Package'} size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{item.name}</p>
                      <p className="truncate text-xs text-slate-400">{item.description || '—'}</p>
                    </div>
                  </div>
                </button>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setCatModal(item)}
                    className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingCat(item)}
                    className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Subkategoriyalar"
        subtitle={
          selectedId
            ? categories.find((c) => c.id === selectedId)?.name ?? 'Tanlangan kategoriya'
            : 'Avval kategoriya tanlang'
        }
        action={
          <button
            type="button"
            disabled={selectedId == null}
            onClick={() => setSubModal('new')}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#173c32] px-4 text-sm font-bold text-white disabled:opacity-40"
          >
            <Plus size={16} /> Qo‘shish
          </button>
        }
      >
        {selectedId == null ? (
          <EmptyState text="Kategoriya tanlang" />
        ) : subs.length === 0 ? (
          <EmptyState text="Subkategoriya yo‘q" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {subs.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{item.name}</p>
                  <p className="truncate text-xs text-slate-400">{item.description || '—'}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setSubModal(item)}
                    className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingSub(item)}
                    className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <AnimatePresence>
        {catModal && (
          <CategoryFormModal
            initial={catModal === 'new' ? null : catModal}
            onClose={() => setCatModal(null)}
            onSaved={async () => {
              setCatModal(null)
              await load()
            }}
          />
        )}
        {subModal && selectedId != null && (
          <SubcategoryFormModal
            categoryId={selectedId}
            initial={subModal === 'new' ? null : subModal}
            onClose={() => setSubModal(null)}
            onSaved={async () => {
              setSubModal(null)
              await loadSubs(selectedId)
            }}
          />
        )}
        {deletingCat && (
          <ConfirmDelete
            title="Kategoriyani o‘chirish"
            text={`«${deletingCat.name}» va bog‘liq subkategoriyalar o‘chiriladi.`}
            onClose={() => setDeletingCat(null)}
            onConfirm={async () => {
              await api.deleteBirgaCategory(deletingCat.id)
              showSnackbar('Kategoriya o‘chirildi')
              setDeletingCat(null)
              await load()
            }}
          />
        )}
        {deletingSub && (
          <ConfirmDelete
            title="Subkategoriyani o‘chirish"
            text={`«${deletingSub.name}» o‘chiriladi.`}
            onClose={() => setDeletingSub(null)}
            onConfirm={async () => {
              await api.deleteBirgaSubcategory(deletingSub.id)
              showSnackbar('Subkategoriya o‘chirildi')
              setDeletingSub(null)
              if (selectedId) await loadSubs(selectedId)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function CategoryFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: BirgaCategory | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { showSnackbar } = useSnackbar()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [icon, setIcon] = useState(initial?.icon || 'Package')
  const [field, setField] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setField('')
    try {
      const input = { name: name.trim(), description: description.trim(), icon }
      if (initial) await api.updateBirgaCategory(initial.id, input)
      else await api.createBirgaCategory(input)
      showSnackbar(initial ? 'Kategoriya yangilandi' : 'Kategoriya yaratildi')
      await onSaved()
    } catch (err) {
      setField(getErrorField(err) ?? '')
      showSnackbar(getErrorMessage(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title={initial ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'} onClose={onClose} wide>
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-500">Nomi</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass(field === 'name')} required />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-500">Tavsif</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none focus:border-[#397461] focus:bg-white"
          />
        </label>
        <div className={field === 'icon' ? 'rounded-xl ring-2 ring-red-300' : ''}>
          <IconPicker value={icon} onChange={setIcon} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-sm font-semibold text-slate-500">
            Bekor
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#173c32] px-5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving && <LoaderCircle size={16} className="animate-spin" />}
            Saqlash
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

function SubcategoryFormModal({
  categoryId,
  initial,
  onClose,
  onSaved,
}: {
  categoryId: number
  initial: BirgaSubcategory | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { showSnackbar } = useSnackbar()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const input = { category_id: categoryId, name: name.trim(), description: description.trim() }
      if (initial) await api.updateBirgaSubcategory(initial.id, input)
      else await api.createBirgaSubcategory(input)
      showSnackbar(initial ? 'Subkategoriya yangilandi' : 'Subkategoriya yaratildi')
      await onSaved()
    } catch (err) {
      showSnackbar(getErrorMessage(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title={initial ? 'Subkategoriyani tahrirlash' : 'Yangi subkategoriya'} onClose={onClose}>
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-500">Nomi</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass()} required />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-500">Tavsif</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none focus:border-[#397461]"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-sm font-semibold text-slate-500">
            Bekor
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#173c32] px-5 text-sm font-bold text-white"
          >
            {saving && <LoaderCircle size={16} className="animate-spin" />}
            Saqlash
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

function ProductsTab() {
  const { showSnackbar } = useSnackbar()
  const [items, setItems] = useState<BirgaProduct[]>([])
  const [categories, setCategories] = useState<BirgaCategory[]>([])
  const [subcategories, setSubcategories] = useState<BirgaSubcategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<BirgaProduct | 'new' | null>(null)
  const [deleting, setDeleting] = useState<BirgaProduct | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [products, cats, subs] = await Promise.all([
        api.birgaProducts(),
        api.birgaCategories(),
        api.birgaSubcategories({ limit: 500 }),
      ])
      setItems(products)
      setCategories(cats)
      setSubcategories(subs)
    } catch (e) {
      showSnackbar(getErrorMessage(e), 'error')
    } finally {
      setLoading(false)
    }
  }, [showSnackbar])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase()
    if (!q) return items
    return items.filter((p) => `${p.name} ${p.description}`.toLocaleLowerCase().includes(q))
  }, [items, search])

  const catName = (id: number) => categories.find((c) => c.id === id)?.name ?? `#${id}`
  const subName = (id?: number | null) =>
    id ? subcategories.find((s) => s.id === id)?.name ?? `#${id}` : '—'

  return (
    <Panel
      title="Mahsulotlar"
      subtitle="Ombor va narxlar"
      action={
        <button
          type="button"
          onClick={() => setModal('new')}
          className="flex h-10 items-center gap-2 rounded-xl bg-[#173c32] px-4 text-sm font-bold text-white"
        >
          <Plus size={16} /> Yangi mahsulot
        </button>
      }
    >
      <div className="border-b border-slate-100 px-5 py-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Qidirish..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-sm outline-none focus:border-[#397461]"
          />
        </div>
      </div>
      {loading ? (
        <LoadingBlock />
      ) : filtered.length === 0 ? (
        <EmptyState text="Mahsulot topilmadi" />
      ) : (
        <div className="overflow-x-auto">
<table className="w-full min-w-[860px] text-left">
          <thead>
            <tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Mahsulot</th>
                <th className="px-3 py-3">Kategoriya</th>
                <th className="px-3 py-3">Subkategoriya</th>
                <th className="px-3 py-3">Narx</th>
                <th className="px-3 py-3">Ombor</th>
                <th className="px-3 py-3">Holat</th>
                <th className="px-5 py-3 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {item.photo_url ? (
                        <img
                          src={item.photo_url}
                          alt=""
                          className="size-10 rounded-xl object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-400">
                          <Package size={16} />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.unit}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-sm text-slate-600">{catName(item.category_id)}</td>
                  <td className="px-3 py-3.5 text-sm text-slate-600">{subName(item.subcategory_id)}</td>
                  <td className="px-3 py-3.5 text-sm font-semibold text-slate-800">{formatMoney(item.price)}</td>
                  <td className="px-3 py-3.5 text-sm text-slate-600">{item.stock}</td>
                  <td className="px-3 py-3.5">
                    {item.is_active ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                        Faol
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                        O‘chirilgan
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setModal(item)}
                        className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(item)}
                        className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <ProductFormModal
            categories={categories}
            initial={modal === 'new' ? null : modal}
            onClose={() => setModal(null)}
            onSaved={async () => {
              setModal(null)
              await load()
            }}
          />
        )}
        {deleting && (
          <ConfirmDelete
            title="Mahsulotni o‘chirish"
            text={`«${deleting.name}» o‘chiriladi.`}
            onClose={() => setDeleting(null)}
            onConfirm={async () => {
              await api.deleteBirgaProduct(deleting.id)
              showSnackbar('Mahsulot o‘chirildi')
              setDeleting(null)
              await load()
            }}
          />
        )}
      </AnimatePresence>
    </Panel>
  )
}

function ProductFormModal({
  categories,
  initial,
  onClose,
  onSaved,
}: {
  categories: BirgaCategory[]
  initial: BirgaProduct | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { showSnackbar } = useSnackbar()
  const [categoryId, setCategoryId] = useState(String(initial?.category_id ?? categories[0]?.id ?? ''))
  const [subcategoryId, setSubcategoryId] = useState(String(initial?.subcategory_id ?? ''))
  const [subs, setSubs] = useState<BirgaSubcategory[]>([])
  const [subsLoading, setSubsLoading] = useState(false)
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const initialUnit = PRODUCT_UNITS.some((u) => u.value === initial?.unit)
    ? (initial?.unit as (typeof PRODUCT_UNITS)[number]['value'])
    : 'dona'
  const [unit, setUnit] = useState<(typeof PRODUCT_UNITS)[number]['value']>(initialUnit)
  const [price, setPrice] = useState(
    initial?.price != null ? formatMoneyInput(String(initial.price)) : '',
  )
  const [stock, setStock] = useState(String(initial?.stock ?? '0'))
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState(initial?.photo_url ?? '')
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const catId = Number(categoryId)
    if (!catId) {
      setSubs([])
      setSubcategoryId('')
      return
    }
    let cancelled = false
    setSubsLoading(true)
    void api
      .birgaSubcategories({ category_id: catId })
      .then((list) => {
        if (cancelled) return
        setSubs(list)
        setSubcategoryId((prev) => {
          if (prev && list.some((s) => String(s.id) === prev)) return prev
          if (initial?.subcategory_id && list.some((s) => s.id === initial.subcategory_id)) {
            return String(initial.subcategory_id)
          }
          return list[0] ? String(list[0].id) : ''
        })
      })
      .catch((e) => {
        if (!cancelled) showSnackbar(getErrorMessage(e), 'error')
      })
      .finally(() => {
        if (!cancelled) setSubsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [categoryId, initial?.subcategory_id, showSnackbar])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!categoryId) {
      showSnackbar('Kategoriya tanlang', 'error')
      return
    }
    if (!subcategoryId) {
      showSnackbar('Subkategoriya tanlang', 'error')
      return
    }
    if (!initial && !photo) {
      showSnackbar('Mahsulot rasmini yuklang', 'error')
      return
    }
    setSaving(true)
    try {
      const input = {
        category_id: Number(categoryId),
        subcategory_id: Number(subcategoryId),
        name: name.trim(),
        description: description.trim(),
        unit,
        price: parseMoneyInput(price),
        stock: Number(stock) || 0,
        photo,
        is_active: isActive,
      }
      if (initial) await api.updateBirgaProduct(initial.id, input)
      else await api.createBirgaProduct(input)
      showSnackbar(initial ? 'Mahsulot yangilandi' : 'Mahsulot yaratildi')
      await onSaved()
    } catch (err) {
      showSnackbar(getErrorMessage(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title={initial ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'} onClose={onClose} wide>
      <form onSubmit={(e) => void submit(e)} className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-xs font-bold text-slate-500">Nomi</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass()} required />
        </label>
        <CustomSelect
          label="Kategoriya"
          value={categoryId}
          placeholder="Kategoriya tanlang"
          required
          options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
          onChange={(v) => {
            setCategoryId(v)
            setSubcategoryId('')
          }}
        />
        <CustomSelect
          label="Subkategoriya"
          value={subcategoryId}
          placeholder={
            subsLoading
              ? 'Yuklanmoqda...'
              : !categoryId
                ? 'Avval kategoriya tanlang'
                : subs.length === 0
                  ? 'Subkategoriya yo‘q'
                  : 'Subkategoriya tanlang'
          }
          required
          disabled={!categoryId || subsLoading || subs.length === 0}
          options={subs.map((s) => ({ value: String(s.id), label: s.name }))}
          onChange={setSubcategoryId}
        />
        <CustomSelect
          label="Birlik"
          value={unit}
          required
          options={PRODUCT_UNITS.map((u) => ({ value: u.value, label: u.label }))}
          onChange={(v) => setUnit(v as (typeof PRODUCT_UNITS)[number]['value'])}
        />
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-500">Narx (so‘m)</span>
          <input
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(formatMoneyInput(e.target.value))}
            className={fieldClass()}
            placeholder="1 000"
            required
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-500">Ombor</span>
          <input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} className={fieldClass()} />
        </label>
        <div className="space-y-1.5 sm:col-span-2">
          <span className="text-xs font-bold text-slate-500">
            Rasm {initial ? '(ixtiyoriy yangilash)' : '(majburiy)'}
          </span>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {(preview || photo) && (
              <img
                src={photo ? URL.createObjectURL(photo) : preview}
                alt=""
                className="size-20 rounded-xl object-cover ring-1 ring-slate-200"
              />
            )}
            <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-600 hover:border-[#397461] hover:text-[#173c32]">
              Fayl tanlash
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  setPhoto(file)
                  if (file) setPreview(URL.createObjectURL(file))
                }}
              />
            </label>
          </div>
          {photo && <p className="text-xs text-slate-400">{photo.name}</p>}
        </div>
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-xs font-bold text-slate-500">Tavsif</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#397461]"
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Faol
        </label>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-sm font-semibold text-slate-500">
            Bekor
          </button>
          <button type="submit" disabled={saving} className="flex h-10 items-center gap-2 rounded-xl bg-[#173c32] px-5 text-sm font-bold text-white">
            {saving && <LoaderCircle size={16} className="animate-spin" />}
            Saqlash
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

function CollectionsTab() {
  const { showSnackbar } = useSnackbar()
  const [items, setItems] = useState<BirgaGroupBuy[]>([])
  const [products, setProducts] = useState<BirgaProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<BirgaGroupBuyStatus | ''>('')
  const [modal, setModal] = useState<BirgaGroupBuy | 'new' | null>(null)
  const [deleting, setDeleting] = useState<BirgaGroupBuy | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, prods] = await Promise.all([
        api.birgaGroupBuys({ status: statusFilter || undefined }),
        api.birgaProducts(),
      ])
      setItems(list)
      setProducts(prods)
    } catch (e) {
      showSnackbar(getErrorMessage(e), 'error')
    } finally {
      setLoading(false)
    }
  }, [showSnackbar, statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  async function setStatus(item: BirgaGroupBuy, status: BirgaGroupBuyStatus) {
    try {
      await api.setBirgaGroupBuyStatus(item.id, status)
      showSnackbar(`Status: ${STATUS_LABEL[status]}`)
      await load()
    } catch (e) {
      showSnackbar(getErrorMessage(e), 'error')
    }
  }

  return (
    <Panel
      title="Yig‘imlar"
      subtitle="Ochiq / yopiq jamoaviy xaridlar"
      action={
        <button
          type="button"
          onClick={() => setModal('new')}
          className="flex h-10 items-center gap-2 rounded-xl bg-[#173c32] px-4 text-sm font-bold text-white"
        >
          <Plus size={16} /> Yangi yig‘im
        </button>
      }
    >
      <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
        {(['', 'open', 'closed', 'in_fulfillment', 'completed', 'cancelled'] as const).map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
              statusFilter === s ? 'bg-[#173c32] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {s ? STATUS_LABEL[s] : 'Hammasi'}
          </button>
        ))}
      </div>
      {loading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState text="Yig‘im yo‘q" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead>
              <tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Yig‘im</th>
                <th className="px-3 py-3">Tur</th>
                <th className="px-3 py-3">Narx</th>
                <th className="px-3 py-3">Hajm</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-5 py-3 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-bold text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
                  </td>
                  <td className="px-3 py-3.5 text-sm text-slate-600">{item.kind === 'combo' ? 'Combo' : 'Mahsulot'}</td>
                  <td className="px-3 py-3.5 text-sm font-semibold">{formatMoney(item.price)}</td>
                  <td className="px-3 py-3.5 text-sm text-slate-600">
                    {item.current_volume} / {item.min_volume} (ombor {item.stock})
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      {STATUS_LABEL[item.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap justify-end gap-1">
                      {item.status === 'open' && (
                        <button
                          type="button"
                          onClick={() => void setStatus(item, 'closed')}
                          className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-700"
                        >
                          Yopish
                        </button>
                      )}
                      {item.status === 'closed' && (
                        <button
                          type="button"
                          onClick={() => void setStatus(item, 'cancelled')}
                          className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-600"
                        >
                          Bekor
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setModal(item)}
                        className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(item)}
                        className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <GroupBuyFormModal
            products={products}
            initial={modal === 'new' ? null : modal}
            onClose={() => setModal(null)}
            onSaved={async () => {
              setModal(null)
              await load()
            }}
          />
        )}
        {deleting && (
          <ConfirmDelete
            title="Yig‘imni o‘chirish"
            text={`«${deleting.title}» o‘chiriladi.`}
            onClose={() => setDeleting(null)}
            onConfirm={async () => {
              await api.deleteBirgaGroupBuy(deleting.id)
              showSnackbar('Yig‘im o‘chirildi')
              setDeleting(null)
              await load()
            }}
          />
        )}
      </AnimatePresence>
    </Panel>
  )
}

function GroupBuyFormModal({
  products,
  initial,
  onClose,
  onSaved,
}: {
  products: BirgaProduct[]
  initial: BirgaGroupBuy | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { showSnackbar } = useSnackbar()
  const [booting, setBooting] = useState(Boolean(initial))
  const [kind, setKind] = useState<BirgaGroupBuyKind>(initial?.kind ?? 'product')
  const [productId, setProductId] = useState(String(initial?.product_id ?? ''))
  const [minVolume, setMinVolume] = useState(String(initial?.min_volume ?? '1'))
  const [comboTitle, setComboTitle] = useState(
    initial?.kind === 'combo' ? (initial.title ?? '') : '',
  )
  const [comboA, setComboA] = useState('')
  const [comboB, setComboB] = useState('')
  const [qtyA, setQtyA] = useState('1')
  const [qtyB, setQtyB] = useState('1')
  const [comboPrice, setComboPrice] = useState(
    initial?.kind === 'combo' && initial.price != null ? formatMoneyInput(String(initial.price)) : '',
  )
  const [slots, setSlots] = useState<(File | string | null)[]>(() => {
    const next: (File | string | null)[] = [null, null, null, null, null]
    ;(initial?.photo_urls ?? []).slice(0, 5).forEach((url, i) => {
      next[i] = url
    })
    return next
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!initial) {
      setBooting(false)
      return
    }
    let cancelled = false
    setBooting(true)
    void api
      .birgaGroupBuy(initial.id)
      .then((full) => {
        if (cancelled) return
        setKind(full.kind ?? 'product')
        setProductId(String(full.product_id ?? ''))
        setMinVolume(String(full.min_volume ?? '1'))
        setComboTitle(full.kind === 'combo' ? (full.title ?? '') : '')
        setComboA(String(full.items?.[0]?.product_id ?? ''))
        setComboB(String(full.items?.[1]?.product_id ?? ''))
        setQtyA(String(full.items?.[0]?.quantity ?? 1))
        setQtyB(String(full.items?.[1]?.quantity ?? 1))
        setComboPrice(
          full.kind === 'combo' && full.price != null ? formatMoneyInput(String(full.price)) : '',
        )
        const next: (File | string | null)[] = [null, null, null, null, null]
        ;(full.photo_urls ?? []).slice(0, 5).forEach((url, i) => {
          next[i] = url
        })
        setSlots(next)
      })
      .catch((err) => {
        if (!cancelled) showSnackbar(getErrorMessage(err), 'error')
      })
      .finally(() => {
        if (!cancelled) setBooting(false)
      })
    return () => {
      cancelled = true
    }
  }, [initial, showSnackbar])

  const productOptions = products.map((p) => ({
    value: String(p.id),
    label: p.name,
    description: `${formatMoney(p.price)} · ${p.unit}`,
  }))

  const filledPhotos = slots.filter(Boolean).length

  function setSlot(index: number, value: File | string | null) {
    setSlots((current) => {
      const next = [...current]
      next[index] = value
      return next
    })
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (kind === 'product' && !productId) {
      showSnackbar('Mahsulot tanlang', 'error')
      return
    }
    if (kind === 'combo' && (!comboA || !comboB)) {
      showSnackbar('Combo uchun 2 ta mahsulot tanlang', 'error')
      return
    }
    if (kind === 'combo' && comboA === comboB) {
      showSnackbar('Combo da bir xil mahsulotni ikki marta tanlab bo‘lmaydi', 'error')
      return
    }
    if (kind === 'combo' && !comboTitle.trim()) {
      showSnackbar('Combo nomini kiriting', 'error')
      return
    }
    const parsedQtyA = Math.max(1, Number(qtyA) || 0)
    const parsedQtyB = Math.max(1, Number(qtyB) || 0)
    if (kind === 'combo' && (parsedQtyA < 1 || parsedQtyB < 1)) {
      showSnackbar('Har bir mahsulot uchun dona kamida 1 bo‘lishi kerak', 'error')
      return
    }
    if (filledPhotos < 1) {
      showSnackbar('Kamida 1 ta rasm yuklang', 'error')
      return
    }

    const selected =
      kind === 'product' ? products.find((p) => String(p.id) === productId) : null
    const productA = products.find((p) => String(p.id) === comboA)
    const productB = products.find((p) => String(p.id) === comboB)

    const title =
      kind === 'product'
        ? selected?.name ?? initial?.title ?? 'Yig‘im'
        : comboTitle.trim()

    const price =
      kind === 'product' ? selected?.price ?? initial?.price ?? 0 : parseMoneyInput(comboPrice)

    const stock =
      kind === 'product'
        ? selected?.stock ?? initial?.stock ?? 0
        : Math.min(productA?.stock ?? 0, productB?.stock ?? 0)

    setSaving(true)
    try {
      const photo_urls = slots.map((slot) => (typeof slot === 'string' ? slot : ''))
      const photos = slots.map((slot) => (slot instanceof File ? slot : null))
      const input = {
        kind,
        title,
        description: '',
        product_id: kind === 'product' ? Number(productId) : null,
        price,
        min_volume: Number(minVolume) || 1,
        stock,
        photo_urls,
        photos,
        items:
          kind === 'combo'
            ? [
                { product_id: Number(comboA), quantity: parsedQtyA },
                { product_id: Number(comboB), quantity: parsedQtyB },
              ]
            : [],
      }
      if (initial) await api.updateBirgaGroupBuy(initial.id, input)
      else await api.createBirgaGroupBuy(input)
      showSnackbar(initial ? 'Yig‘im yangilandi' : 'Yig‘im ochildi')
      await onSaved()
    } catch (err) {
      showSnackbar(getErrorMessage(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      title={initial ? 'Yig‘imni tahrirlash' : 'Yangi yig‘im'}
      subtitle="Bitta mahsulot yoki bir nechta mahsulotdan combo oching."
      onClose={onClose}
      wide
    >
      {booting ? (
        <div className="grid min-h-48 place-items-center text-sm text-slate-400">
          <LoaderCircle className="animate-spin" size={22} />
        </div>
      ) : (
      <form onSubmit={(e) => void submit(e)} className="space-y-5">
        <div className="grid grid-cols-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
          {([
            ['product', 'Mahsulot'],
            ['combo', 'Combo'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={`h-11 rounded-xl text-sm font-bold transition ${
                kind === value
                  ? 'bg-[#173c32] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {kind === 'product' ? (
          <CustomSelect
            label="Mahsulot"
            value={productId}
            required
            options={productOptions}
            onChange={setProductId}
            placeholder="Tanlang"
          />
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-600">Combo nomi</span>
              <input
                value={comboTitle}
                onChange={(e) => setComboTitle(e.target.value)}
                className={creamFieldClass()}
                placeholder="Masalan: Pepsi + chips to‘plami"
                required
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <CustomSelect
                label="1-mahsulot"
                value={comboA}
                options={productOptions.filter((o) => o.value !== comboB)}
                onChange={setComboA}
                placeholder="Tanlang"
              />
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-600">Dona (1 to‘plamda)</span>
                <input
                  type="number"
                  min={1}
                  value={qtyA}
                  onChange={(e) => setQtyA(e.target.value)}
                  className={creamFieldClass()}
                  required
                />
              </label>
              <CustomSelect
                label="2-mahsulot"
                value={comboB}
                options={productOptions.filter((o) => o.value !== comboA)}
                onChange={setComboB}
                placeholder="Tanlang"
              />
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-600">Dona (1 to‘plamda)</span>
                <input
                  type="number"
                  min={1}
                  value={qtyB}
                  onChange={(e) => setQtyB(e.target.value)}
                  className={creamFieldClass()}
                  required
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-600">Combo narxi (so‘m)</span>
              <input
                inputMode="numeric"
                value={comboPrice}
                onChange={(e) => setComboPrice(formatMoneyInput(e.target.value))}
                className={creamFieldClass()}
                placeholder="1 000"
                required
              />
            </label>
          </div>
        )}

        <label className="block">
          <span className="mb-2 block text-xs font-bold text-slate-600">Maqsad (buyurtma)</span>
          <input
            type="number"
            min={1}
            value={minVolume}
            onChange={(e) => setMinVolume(e.target.value)}
            className={creamFieldClass()}
            required
          />
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Bu ombor emas. Nechta buyurtma yig‘ilishini ko‘rsatadi. Yig‘imni yopish qo‘lda — «Yopish»
            tugmasi bilan.
          </p>
        </label>

        <div>
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-600">Rasmlar</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Kamida 1 ta, ko‘pi bilan 5 ta. Birinchisi — cover.
              </p>
            </div>
            <span
              className={`text-xs font-bold ${filledPhotos < 1 ? 'text-red-500' : 'text-emerald-600'}`}
            >
              {filledPhotos}/5
            </span>
          </div>

          <div className="grid grid-cols-[1.35fr_1fr] gap-3">
            <PhotoSlot
              label="Cover"
              large
              value={slots[0]}
              onChange={(value) => setSlot(0, value)}
            />
            <div className="grid grid-cols-2 gap-2.5">
              {[1, 2, 3, 4].map((index) => (
                <PhotoSlot
                  key={index}
                  label={`${index + 1}-rasm`}
                  value={slots[index]}
                  onChange={(value) => setSlot(index, value)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-2xl border border-slate-200 px-5 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Bekor
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex h-11 items-center gap-2 rounded-2xl bg-[#6b8f71] px-6 text-sm font-bold text-white hover:bg-[#5f8266] disabled:opacity-60"
          >
            {saving && <LoaderCircle size={16} className="animate-spin" />}
            {initial ? 'Saqlash' : 'Ochish'}
          </button>
        </div>
      </form>
      )}
    </ModalShell>
  )
}

function PhotoSlot({
  label,
  value,
  onChange,
  large,
}: {
  label: string
  value: File | string | null
  onChange: (value: File | string | null) => void
  large?: boolean
}) {
  const preview =
    value instanceof File ? URL.createObjectURL(value) : typeof value === 'string' ? value : ''

  return (
    <label
      className={`relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#ddd4c4] bg-[#f7f3eb] text-center transition hover:border-[#397461] hover:bg-[#f3eee4] ${
        large ? 'min-h-[200px] p-4' : 'aspect-square p-2'
      }`}
    >
      {preview ? (
        <>
          <img src={preview} alt="" className="absolute inset-0 size-full object-cover" />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onChange(null)
            }}
            className="absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <X size={14} />
          </button>
        </>
      ) : (
        <>
          <ImagePlus className={`text-slate-400 ${large ? 'size-8' : 'size-5'}`} />
          <span className={`mt-2 font-semibold text-slate-500 ${large ? 'text-sm' : 'text-[11px]'}`}>
            {label}
          </span>
        </>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null
          onChange(file)
          e.target.value = ''
        }}
      />
    </label>
  )
}

function CustomersTab() {
  const { showSnackbar } = useSnackbar()
  const [items, setItems] = useState<BirgaCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<BirgaCustomer | 'new' | null>(null)
  const [deleting, setDeleting] = useState<BirgaCustomer | null>(null)
  const [blocking, setBlocking] = useState<BirgaCustomer | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await api.birgaCustomers({ search: search.trim() || undefined, limit: 100 }))
    } catch (e) {
      showSnackbar(getErrorMessage(e), 'error')
    } finally {
      setLoading(false)
    }
  }, [search, showSnackbar])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 250)
    return () => window.clearTimeout(t)
  }, [load])

  async function unblock(item: BirgaCustomer) {
    try {
      await api.unblockBirgaCustomer(item.id)
      showSnackbar('Blokdan chiqarildi')
      await load()
    } catch (e) {
      showSnackbar(getErrorMessage(e), 'error')
    }
  }

  return (
    <Panel
      title="Mijozlar"
      subtitle="Birga Xarid bazasidagi alohida mijozlar"
      action={
        <button
          type="button"
          onClick={() => setModal('new')}
          className="flex h-10 items-center gap-2 rounded-xl bg-[#173c32] px-4 text-sm font-bold text-white"
        >
          <Plus size={16} /> Yangi mijoz
        </button>
      }
    >
      <div className="border-b border-slate-100 px-5 py-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Telefon yoki ism..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-sm outline-none focus:border-[#397461]"
          />
        </div>
      </div>
      {loading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState text="Mijoz yo‘q" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Mijoz</th>
                <th className="px-3 py-3">Telefon</th>
                <th className="px-3 py-3">Hudud</th>
                <th className="px-3 py-3">Holat</th>
                <th className="px-5 py-3 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-bold text-slate-800">
                      {item.first_name || item.last_name
                        ? `${item.first_name} ${item.last_name}`.trim()
                        : 'Nomsiz'}
                    </p>
                    <p className="text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
                  </td>
                  <td className="px-3 py-3.5 text-sm text-slate-600">{item.phone}</td>
                  <td className="px-3 py-3.5 text-sm text-slate-600">
                    {[item.region_name, item.city_name, item.mfy_name].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="px-3 py-3.5">
                    {item.is_blocked ? (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">
                        Bloklangan
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                        Faol
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setModal(item)}
                        className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Pencil size={15} />
                      </button>
                      {item.is_blocked ? (
                        <button
                          type="button"
                          onClick={() => void unblock(item)}
                          className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-700"
                          title="Blokdan chiqarish"
                        >
                          <ShieldOff size={15} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setBlocking(item)}
                          className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-700"
                          title="Bloklash"
                        >
                          <Lock size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeleting(item)}
                        className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <CustomerFormModal
            initial={modal === 'new' ? null : modal}
            onClose={() => setModal(null)}
            onSaved={async () => {
              setModal(null)
              await load()
            }}
          />
        )}
        {blocking && (
          <BlockModal
            customer={blocking}
            onClose={() => setBlocking(null)}
            onDone={async () => {
              setBlocking(null)
              await load()
            }}
          />
        )}
        {deleting && (
          <ConfirmDelete
            title="Mijozni o‘chirish"
            text={`${deleting.phone} o‘chiriladi.`}
            onClose={() => setDeleting(null)}
            onConfirm={async () => {
              await api.deleteBirgaCustomer(deleting.id)
              showSnackbar('Mijoz o‘chirildi')
              setDeleting(null)
              await load()
            }}
          />
        )}
      </AnimatePresence>
    </Panel>
  )
}

function CustomerFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: BirgaCustomer | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { showSnackbar } = useSnackbar()
  const [firstName, setFirstName] = useState(initial?.first_name ?? '')
  const [lastName, setLastName] = useState(initial?.last_name ?? '')
  const [regionName, setRegionName] = useState(initial?.region_name ?? '')
  const [cityName, setCityName] = useState(initial?.city_name ?? '')
  const [mfyName, setMfyName] = useState(initial?.mfy_name ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    try {
      const form = new FormData(e.currentTarget)
      const phone = initial?.phone ?? toFullPhone(String(form.get('phone') ?? ''))
      if (!phone || phone.length < 13) {
        showSnackbar('Telefon raqamini to‘liq kiriting', 'error')
        setSaving(false)
        return
      }
      const input = {
        phone,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        region_name: regionName.trim(),
        city_name: cityName.trim(),
        mfy_name: mfyName.trim(),
        address: address.trim(),
      }
      if (initial) await api.updateBirgaCustomer(initial.id, input)
      else await api.createBirgaCustomer(input)
      showSnackbar(initial ? 'Mijoz yangilandi' : 'Mijoz yaratildi')
      await onSaved()
    } catch (err) {
      showSnackbar(getErrorMessage(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title={initial ? 'Mijozni tahrirlash' : 'Yangi mijoz'} onClose={onClose} wide>
      <form onSubmit={(e) => void submit(e)} className="grid gap-4 sm:grid-cols-2">
        {initial ? (
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs font-bold text-slate-500">Telefon</span>
            <input value={initial.phone} readOnly className={`${fieldClass()} opacity-70`} />
          </label>
        ) : (
          <div className="sm:col-span-2">
            <PhoneInput name="phone" required />
          </div>
        )}
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-500">Ism</span>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={fieldClass()} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-500">Familiya</span>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={fieldClass()} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-500">Viloyat</span>
          <input value={regionName} onChange={(e) => setRegionName(e.target.value)} className={fieldClass()} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-500">Tuman / shahar</span>
          <input value={cityName} onChange={(e) => setCityName(e.target.value)} className={fieldClass()} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-500">MFY</span>
          <input value={mfyName} onChange={(e) => setMfyName(e.target.value)} className={fieldClass()} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-500">Manzil</span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={fieldClass()} />
        </label>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-sm font-semibold text-slate-500">
            Bekor
          </button>
          <button type="submit" disabled={saving} className="flex h-10 items-center gap-2 rounded-xl bg-[#173c32] px-5 text-sm font-bold text-white">
            {saving && <LoaderCircle size={16} className="animate-spin" />}
            Saqlash
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

function BlockModal({
  customer,
  onClose,
  onDone,
}: {
  customer: BirgaCustomer
  onClose: () => void
  onDone: () => Promise<void>
}) {
  const { showSnackbar } = useSnackbar()
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.blockBirgaCustomer(customer.id, reason.trim())
      showSnackbar('Mijoz bloklandi')
      await onDone()
    } catch (err) {
      showSnackbar(getErrorMessage(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title="Mijozni bloklash" onClose={onClose}>
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <p className="text-sm text-slate-500">{customer.phone}</p>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-500">Sabab</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#397461]"
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-sm font-semibold text-slate-500">
            Bekor
          </button>
          <button type="submit" disabled={saving} className="h-10 rounded-xl bg-amber-600 px-5 text-sm font-bold text-white">
            Bloklash
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

function ConfirmDelete({
  title,
  text,
  onClose,
  onConfirm,
}: {
  title: string
  text: string
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const { showSnackbar } = useSnackbar()
  const [saving, setSaving] = useState(false)

  async function run() {
    setSaving(true)
    try {
      await onConfirm()
    } catch (e) {
      showSnackbar(getErrorMessage(e), 'error')
      setSaving(false)
    }
  }

  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="shrink-0" size={18} />
          <p>{text}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-sm font-semibold text-slate-500">
            Bekor
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void run()}
            className="flex h-10 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white"
          >
            {saving && <LoaderCircle size={16} className="animate-spin" />}
            O‘chirish
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

function OrdersTab() {
  const { showSnackbar } = useSnackbar()
  const [items, setItems] = useState<BirgaOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<BirgaOrderStatus | ''>('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await api.birgaOrders({ status: statusFilter || undefined, limit: 200 }))
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [showSnackbar, statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <Panel
      title="Buyurtmalar"
      subtitle="Yig‘imdan olingan buyurtmalar. Yig‘im yopilgach kuryerga o‘tadi."
      action={
        <div className="flex flex-wrap gap-2">
          {(['', 'collecting', 'awaiting_courier', 'with_courier', 'issued', 'cancelled'] as const).map(
            (s) => (
              <button
                key={s || 'all'}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                  statusFilter === s
                    ? 'bg-[#173c32] text-[#c9f560]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s ? ORDER_STATUS_LABEL[s] : 'Hammasi'}
              </button>
            ),
          )}
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
          <LoaderCircle className="animate-spin" size={18} />
          Yuklanmoqda...
        </div>
      ) : items.length === 0 ? (
        <EmptyState text="Buyurtma yo‘q" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Yig‘im</th>
                <th className="px-5 py-3">Mijoz</th>
                <th className="px-5 py-3">Hudud</th>
                <th className="px-5 py-3">Summa</th>
                <th className="px-5 py-3">Kod</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Sana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="text-sm">
                  <td className="px-5 py-3 font-semibold text-slate-500">#{item.id}</td>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-800">{item.title_snapshot}</p>
                    <p className="text-xs text-slate-400">
                      Yig‘im #{item.group_buy_id} · {item.quantity} dona
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-semibold">{item.customer_name || '—'}</p>
                    <p className="text-xs text-slate-400">{item.customer_phone}</p>
                  </td>
                  <td className="max-w-[180px] px-5 py-3 text-xs text-slate-500">
                    {[item.region_name, item.city_name, item.mfy_name].filter(Boolean).join(', ') ||
                      '—'}
                  </td>
                  <td className="px-5 py-3 font-bold">{formatMoney(item.total_amount)}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-lg bg-[#c9f560]/40 px-2 py-1 font-mono text-xs font-bold tracking-widest text-[#173c32]">
                      {item.pickup_code || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                      {ORDER_STATUS_LABEL[item.status] ?? item.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">
                    {formatDateTime(item.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
