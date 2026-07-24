import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Lock,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  ShieldOff,
  Store,
  Trash2,
  X,
} from 'lucide-react'
import { api, getErrorField, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { useSnackbar } from '../../shared/Snackbar'
import type { Xaridor, XaridorInput } from '../../shared/types'

export function XaridorlarPage() {
  const { showSnackbar } = useSnackbar()
  const [items, setItems] = useState<Xaridor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [editing, setEditing] = useState<Xaridor | 'new' | null>(null)
  const [viewing, setViewing] = useState<Xaridor | null>(null)
  const [deleting, setDeleting] = useState<Xaridor | null>(null)
  const [blocking, setBlocking] = useState<Xaridor | null>(null)
  const limit = 20

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await api.xaridorlar(limit, offset))
    } catch (loadError) {
      const message = getErrorMessage(loadError)
      setError(message)
      showSnackbar(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [offset, showSnackbar])

  useEffect(() => {
    const task = window.setTimeout(() => void loadItems(), 0)
    return () => window.clearTimeout(task)
  }, [loadItems])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return items
    return items.filter((item) =>
      `${item.shop_name} ${item.first_name} ${item.last_name} ${item.username} ${item.phone}`
        .toLocaleLowerCase()
        .includes(query),
    )
  }, [items, search])

  async function unblock(item: Xaridor) {
    try {
      await api.unblockXaridor(item.id)
      showSnackbar('Xaridor blokdan chiqarildi')
      void loadItems()
    } catch (unblockError) {
      showSnackbar(getErrorMessage(unblockError), 'error')
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Xaridorlar</h2>
          <p className="mt-1 text-xs text-slate-400">Platformadagi xaridorlarni boshqaring va bloklang</p>
        </div>
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setEditing('new')}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#173c32] px-5 text-sm font-bold text-white shadow-lg shadow-[#173c32]/10"
        >
          <Plus size={18} />
          Yangi xaridor
        </motion.button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Do‘kon, ism, login yoki telefon"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm outline-none transition focus:border-[#397461] focus:bg-white"
            />
          </div>
          <p className="text-xs text-slate-400">
            Jami: <span className="font-bold text-slate-700">{items.length}</span>
          </p>
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
              <table className="w-full min-w-[960px] text-left">
                <thead>
                  <tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Do‘kon</th>
                    <th className="px-4 py-4">Mas’ul shaxs</th>
                    <th className="px-4 py-4">Telefon</th>
                    <th className="px-4 py-4">Holat</th>
                    <th className="px-4 py-4">Yaratilgan sana</th>
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
                          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]">
                            <Store size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{item.shop_name}</p>
                            <p className="mt-0.5 text-xs text-slate-400">@{item.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-700">
                        {item.first_name} {item.last_name}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{item.phone}</td>
                      <td className="px-4 py-4">
                        {item.is_blocked ? (
                          <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600">
                            Bloklangan
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                            Faol
                          </span>
                        )}
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
                            title="O‘zgartirish"
                          >
                            <Pencil size={16} />
                          </button>
                          {item.is_blocked ? (
                            <button
                              onClick={() => void unblock(item)}
                              className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                              title="Blokdan chiqarish"
                            >
                              <ShieldOff size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={() => setBlocking(item)}
                              className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-amber-50 hover:text-amber-700"
                              title="Bloklash"
                            >
                              <Lock size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleting(item)}
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
              {filtered.length === 0 && (
                <div className="py-16 text-center text-sm text-slate-400">Xaridor topilmadi</div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-400">
                {offset + 1}–{offset + items.length} ko‘rsatilmoqda
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
            item={viewing}
            onClose={() => setViewing(null)}
            onEdit={() => {
              setViewing(null)
              setEditing(viewing)
            }}
          />
        )}
        {editing && (
          <FormModal
            item={editing === 'new' ? undefined : editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null)
              void loadItems()
            }}
          />
        )}
        {deleting && (
          <DeleteModal
            item={deleting}
            onClose={() => setDeleting(null)}
            onDeleted={() => {
              setDeleting(null)
              void loadItems()
            }}
          />
        )}
        {blocking && (
          <BlockModal
            item={blocking}
            onClose={() => setBlocking(null)}
            onBlocked={() => {
              setBlocking(null)
              void loadItems()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ViewModal({ item, onClose, onEdit }: { item: Xaridor; onClose: () => void; onEdit: () => void }) {
  const details = [
    { label: 'Do‘kon nomi', value: item.shop_name },
    { label: 'Ism', value: item.first_name },
    { label: 'Familiya', value: item.last_name },
    { label: 'Telefon', value: item.phone },
    { label: 'Foydalanuvchi nomi', value: `@${item.username}` },
    { label: 'STIR', value: item.stir || '—' },
    { label: 'Bank hisobi', value: item.bank_account || '—' },
    { label: 'Bank nomi', value: item.bank_name || '—' },
    { label: 'Manzil', value: item.address || '—' },
    { label: 'Yaratilgan', value: formatDateTime(item.created_at) },
    { label: 'Yangilangan', value: formatDateTime(item.updated_at) },
  ]

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]">
            <Eye size={20} />
          </div>
          <div>
            <h3 className="font-bold">Xaridor ma’lumotlari</h3>
            <p className="mt-0.5 text-xs text-slate-400">To‘liq profil ma’lumotlari</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
          <X size={19} />
        </button>
      </div>
      <div className="p-6">
        <div className="mb-6 flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#dff6b0] text-[#173c32]">
            <Store size={24} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-slate-900">{item.shop_name}</p>
            <p className="mt-1 text-sm text-slate-500">
              {item.first_name} {item.last_name}
            </p>
          </div>
          {item.is_blocked && (
            <span className="ml-auto inline-flex shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600">
              Bloklangan
            </span>
          )}
        </div>
        {item.is_blocked && item.blocked_reason && (
          <p className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-600">
            Bloklash sababi: {item.blocked_reason}
          </p>
        )}
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {details.map((detail) => (
            <div key={detail.label}>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{detail.label}</dt>
              <dd className="mt-1.5 text-sm font-semibold text-slate-700">{detail.value}</dd>
            </div>
          ))}
        </dl>
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

function FormModal({
  item,
  onClose,
  onSaved,
}: {
  item?: Xaridor
  onClose: () => void
  onSaved: () => void
}) {
  const { showSnackbar } = useSnackbar()
  const [saving, setSaving] = useState(false)
  const [errorField, setErrorField] = useState<string>()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorField(undefined)
    const form = new FormData(event.currentTarget)
    const input: XaridorInput = {
      shop_name: String(form.get('shop_name')),
      first_name: String(form.get('first_name')),
      last_name: String(form.get('last_name')),
      phone: String(form.get('phone')),
      username: String(form.get('username')),
      password: String(form.get('password')),
      stir: String(form.get('stir') ?? ''),
      bank_account: String(form.get('bank_account') ?? ''),
      bank_name: String(form.get('bank_name') ?? ''),
      address: String(form.get('address') ?? ''),
    }
    if (item && !input.password) delete input.password
    try {
      if (item) await api.updateXaridor(item.id, input)
      else await api.createXaridor(input)
      showSnackbar(item ? 'Xaridor yangilandi' : 'Xaridor yaratildi')
      onSaved()
    } catch (saveError) {
      showSnackbar(getErrorMessage(saveError), 'error')
      setErrorField(getErrorField(saveError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]">
            <Store size={20} />
          </div>
          <div>
            <h3 className="font-bold">{item ? 'Xaridorni tahrirlash' : 'Yangi xaridor'}</h3>
            <p className="mt-0.5 text-xs text-slate-400">Ma’lumotlarni to‘liq kiriting</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
          <X size={19} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="shop_name"
            label="Do‘kon nomi"
            defaultValue={item?.shop_name}
            invalid={errorField === 'shop_name'}
            className="sm:col-span-2"
          />
          <Field name="first_name" label="Ism" defaultValue={item?.first_name} invalid={errorField === 'first_name'} />
          <Field name="last_name" label="Familiya" defaultValue={item?.last_name} invalid={errorField === 'last_name'} />
          <Field
            name="phone"
            label="Telefon"
            type="tel"
            defaultValue={item?.phone}
            placeholder="+998 90 123 45 67"
            invalid={errorField === 'phone'}
          />
          <Field name="username" label="Login" defaultValue={item?.username} invalid={errorField === 'username'} />
          <Field
            name="password"
            label={item ? 'Yangi parol (ixtiyoriy)' : 'Parol'}
            type="password"
            required={!item}
            placeholder="Kamida 6 ta belgi"
            invalid={errorField === 'password'}
            className="sm:col-span-2"
          />
          <Field name="stir" label="STIR" required={false} defaultValue={item?.stir} invalid={errorField === 'stir'} />
          <Field
            name="bank_account"
            label="Bank hisobi"
            required={false}
            defaultValue={item?.bank_account}
            invalid={errorField === 'bank_account'}
          />
          <Field
            name="bank_name"
            label="Bank nomi"
            required={false}
            defaultValue={item?.bank_name}
            invalid={errorField === 'bank_name'}
          />
          <Field
            name="address"
            label="Manzil"
            required={false}
            defaultValue={item?.address}
            invalid={errorField === 'address'}
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600">
            Bekor qilish
          </button>
          <button
            disabled={saving}
            className="flex h-11 items-center gap-2 rounded-xl bg-[#173c32] px-5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving && <LoaderCircle className="animate-spin" size={17} />}
            {saving ? 'Saqlanmoqda...' : item ? 'Saqlash' : 'Yaratish'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function DeleteModal({
  item,
  onClose,
  onDeleted,
}: {
  item: Xaridor
  onClose: () => void
  onDeleted: () => void
}) {
  const { showSnackbar } = useSnackbar()
  const [loading, setLoading] = useState(false)

  async function remove() {
    setLoading(true)
    try {
      await api.deleteXaridor(item.id)
      showSnackbar('Xaridor o‘chirildi')
      onDeleted()
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
        <h3 className="mt-5 text-lg font-bold">O‘chirasizmi?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          <span className="font-semibold text-slate-600">{item.shop_name}</span> tizimdan butunlay o‘chiriladi.
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

function BlockModal({
  item,
  onClose,
  onBlocked,
}: {
  item: Xaridor
  onClose: () => void
  onBlocked: () => void
}) {
  const { showSnackbar } = useSnackbar()
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleBlock() {
    if (!reason.trim()) {
      showSnackbar('Bloklash sababini kiriting', 'error')
      return
    }
    setLoading(true)
    try {
      await api.blockXaridor(item.id, reason.trim())
      showSnackbar('Xaridor bloklandi')
      onBlocked()
    } catch (blockError) {
      showSnackbar(getErrorMessage(blockError), 'error')
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose} narrow>
      <div className="p-6">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-500">
          <Lock size={24} />
        </div>
        <h3 className="text-center text-lg font-bold">Xaridorni bloklash</h3>
        <p className="mt-2 text-center text-sm leading-6 text-slate-400">
          <span className="font-semibold text-slate-600">{item.shop_name}</span> bloklanadi va buyurtma bera olmaydi.
        </p>
        <label className="mt-5 block">
          <span className="mb-2 block text-xs font-bold text-slate-600">Bloklash sababi</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#397461] focus:ring-4 focus:ring-[#397461]/8"
          />
        </label>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={onClose} className="h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">
            Bekor qilish
          </button>
          <button
            onClick={() => void handleBlock()}
            disabled={loading}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 text-sm font-bold text-white disabled:opacity-60"
          >
            {loading && <LoaderCircle className="animate-spin" size={17} />}
            {loading ? 'Bloklanmoqda...' : 'Bloklash'}
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
  children: React.ReactNode
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
        className={`w-full overflow-hidden rounded-2xl bg-white shadow-2xl ${narrow ? 'max-w-md' : 'max-w-2xl'}`}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

function Field({
  name,
  label,
  type = 'text',
  defaultValue,
  placeholder,
  required = true,
  invalid = false,
  className = '',
}: {
  name: string
  label: string
  type?: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
  invalid?: boolean
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-bold text-slate-600">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={type === 'password' ? 6 : undefined}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`h-11 w-full rounded-xl border px-3 text-sm outline-none transition focus:ring-4 ${
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
    <div className="animate-pulse" aria-label="Xaridorlar yuklanmoqda">
      <div className="grid grid-cols-[1.6fr_1.2fr_1fr_.9fr_1.1fr_.7fr] gap-4 bg-slate-50/70 px-6 py-4">
        {Array.from({ length: 6 }).map((_, key) => (
          <div key={key} className="h-2.5 rounded-full bg-slate-200" />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, key) => (
        <div
          key={key}
          className="grid min-w-[960px] grid-cols-[1.6fr_1.2fr_1fr_.9fr_1.1fr_.7fr] items-center gap-4 border-t border-slate-100 px-6 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 shrink-0 rounded-xl bg-slate-200" />
            <div className="w-full space-y-2">
              <div className="h-3 w-2/3 rounded-full bg-slate-200" />
              <div className="h-2.5 w-1/2 rounded-full bg-slate-100" />
            </div>
          </div>
          <div className="h-3 w-3/4 rounded-full bg-slate-200" />
          <div className="h-3 w-3/4 rounded-full bg-slate-200" />
          <div className="h-3 w-3/4 rounded-full bg-slate-200" />
          <div className="h-3 w-3/4 rounded-full bg-slate-200" />
          <div className="ml-auto h-8 w-24 rounded-lg bg-slate-200" />
        </div>
      ))}
    </div>
  )
}
