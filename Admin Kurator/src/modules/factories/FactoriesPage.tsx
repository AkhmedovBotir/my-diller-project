import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Building2,
  Landmark,
  LoaderCircle,
  MapPin,
  Phone,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { api, getErrorField, getErrorMessage } from '../../shared/api'
import { formatDate } from '../../shared/date'
import { useSnackbar } from '../../shared/Snackbar'
import type { Ishlabchiqaruvchi, IshlabchiqaruvchiCreateInput } from '../../shared/types'
import { useAuth } from '../auth/AuthContext'

export function FactoriesPage() {
  const { user } = useAuth()
  const { showSnackbar } = useSnackbar()
  const [items, setItems] = useState<Ishlabchiqaruvchi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      setItems(await api.factories(100, 0))
    } catch (loadError) {
      const message = getErrorMessage(loadError)
      setError(message)
      showSnackbar(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(task)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const assigned = useMemo(() => {
    if (!user || user.type !== 'kurator') return items
    return items.filter((item) => item.kurator_id === user.id)
  }, [items, user])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return assigned
    return assigned.filter((item) =>
      `${item.company_name} ${item.first_name} ${item.last_name} ${item.phone} ${item.address}`
        .toLocaleLowerCase()
        .includes(query),
    )
  }, [assigned, search])

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Fabrikalar</h2>
          <p className="mt-1 text-xs text-slate-400">
            {user?.type === 'kurator'
              ? 'Sizga biriktirilgan ishlab chiqaruvchilar ro‘yxati'
              : 'Barcha ishlab chiqaruvchilar ro‘yxati (umumiy admin ko‘rinishi)'}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Korxona, kontakt yoki manzil"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm outline-none transition focus:border-[#397461] focus:bg-white"
            />
          </div>
          {user?.type === 'kurator' && (
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCreating(true)}
              className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#173c32] px-5 text-sm font-bold text-white shadow-lg shadow-[#173c32]/10"
            >
              <Plus size={18} />
              Qo‘shish
            </motion.button>
          )}
        </div>
      </section>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-2xl bg-white p-5 shadow-sm">
              <div className="size-11 rounded-xl bg-slate-200" />
              <div className="mt-5 h-3 w-32 rounded-full bg-slate-200" />
              <div className="mt-3 h-2.5 w-24 rounded-full bg-slate-200/70" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center">
          <div>
            <AlertTriangle className="mx-auto mb-3 text-red-400" />
            <p className="text-sm font-semibold text-red-600">{error}</p>
            <button onClick={() => void load()} className="mt-4 text-xs font-bold text-[#397461]">
              Qayta urinish
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white py-16 text-center text-sm text-slate-400">
          Fabrika topilmadi
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item, index) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="rounded-2xl border border-slate-200/80 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]">
                  <Building2 size={20} />
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                  #{item.id}
                </span>
              </div>
              <h3 className="mt-4 truncate text-base font-bold text-slate-900">{item.company_name}</h3>
              <p className="mt-0.5 text-xs text-slate-400">
                {item.first_name} {item.last_name} · @{item.username}
              </p>

              <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Phone size={13} className="shrink-0 text-slate-400" />
                  <span className="truncate">{item.phone}</span>
                </div>
                {item.address && (
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <MapPin size={13} className="mt-0.5 shrink-0 text-slate-400" />
                    <span className="line-clamp-2">{item.address}</span>
                  </div>
                )}
                {(item.bank_name || item.bank_account) && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Landmark size={13} className="shrink-0 text-slate-400" />
                    <span className="truncate">
                      {item.bank_name || '—'} {item.bank_account ? `· ${item.bank_account}` : ''}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-[11px] text-slate-400">
                <span>STIR: {item.stir || '—'}</span>
                <span>Ro‘yxatdan: {formatDate(item.created_at)}</span>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      <AnimatePresence>
        {creating && (
          <CreateFactoryModal
            onClose={() => setCreating(false)}
            onCreated={() => {
              setCreating(false)
              void load()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function CreateFactoryModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { showSnackbar } = useSnackbar()
  const [saving, setSaving] = useState(false)
  const [errorField, setErrorField] = useState<string>()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorField(undefined)
    const form = new FormData(event.currentTarget)
    const input: IshlabchiqaruvchiCreateInput = {
      company_name: String(form.get('company_name')),
      first_name: String(form.get('first_name')),
      last_name: String(form.get('last_name')),
      phone: String(form.get('phone')),
      username: String(form.get('username')),
      password: String(form.get('password')),
      stir: String(form.get('stir') || ''),
      bank_account: String(form.get('bank_account') || ''),
      bank_name: String(form.get('bank_name') || ''),
      address: String(form.get('address') || ''),
    }
    try {
      await api.createFactory(input)
      showSnackbar('Fabrika yaratildi')
      onCreated()
    } catch (saveError) {
      showSnackbar(getErrorMessage(saveError), 'error')
      setErrorField(getErrorField(saveError))
    } finally {
      setSaving(false)
    }
  }

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
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="font-bold">Yangi fabrika</h3>
              <p className="mt-0.5 text-xs text-slate-400">Sizga avtomatik biriktiriladi</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={19} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="company_name"
              label="Korxona nomi"
              invalid={errorField === 'company_name'}
              className="sm:col-span-2"
            />
            <FormField name="first_name" label="Ism" invalid={errorField === 'first_name'} />
            <FormField name="last_name" label="Familiya" invalid={errorField === 'last_name'} />
            <FormField name="phone" label="Telefon" type="tel" placeholder="+998 90 123 45 67" invalid={errorField === 'phone'} />
            <FormField name="username" label="Login" invalid={errorField === 'username'} />
            <FormField name="password" label="Parol" type="password" placeholder="Kamida 6 ta belgi" invalid={errorField === 'password'} />
            <FormField name="stir" label="STIR" required={false} invalid={errorField === 'stir'} />
            <FormField name="bank_name" label="Bank nomi" required={false} invalid={errorField === 'bank_name'} />
            <FormField name="bank_account" label="Hisob raqami" required={false} invalid={errorField === 'bank_account'} />
            <FormField name="address" label="Manzil" required={false} invalid={errorField === 'address'} className="sm:col-span-2" />
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
              {saving ? 'Saqlanmoqda...' : 'Yaratish'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

function FormField({
  name,
  label,
  type = 'text',
  placeholder,
  required = true,
  invalid = false,
  className = '',
}: {
  name: string
  label: string
  type?: string
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
