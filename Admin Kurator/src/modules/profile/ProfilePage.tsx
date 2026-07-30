import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { KeyRound, LoaderCircle, MapPin, Save, ShieldCheck, UserRound } from 'lucide-react'
import { api, getErrorField, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { useSnackbar } from '../../shared/Snackbar'
import type { Region } from '../../shared/types'
import { useAuth } from '../auth/AuthContext'

const typeLabel: Record<string, string> = {
  kurator: 'Kurator',
  general: 'Umumiy admin',
  admin: 'Administrator',
}

export function ProfilePage() {
  const { user, setUser } = useAuth()
  const { showSnackbar } = useSnackbar()
  const [saving, setSaving] = useState(false)
  const [errorField, setErrorField] = useState<string>()
  const [mfys, setMfys] = useState<Region[]>([])
  const [mfysLoading, setMfysLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setMfysLoading(true)
    api
      .kuratorMfys()
      .then((items) => {
        if (!cancelled) setMfys(items)
      })
      .catch(() => {
        if (!cancelled) setMfys([])
      })
      .finally(() => {
        if (!cancelled) setMfysLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!user) return null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    setSaving(true)
    setErrorField(undefined)
    const form = new FormData(formElement)
    try {
      const password = String(form.get('password') ?? '').trim()
      const updated = await api.updateProfile({
        first_name: String(form.get('first_name')),
        last_name: String(form.get('last_name')),
        phone: String(form.get('phone')),
        username: String(form.get('username')),
        birth_date: String(form.get('birth_date')),
        residence_address: String(form.get('residence_address')),
        ...(password ? { password } : {}),
      })
      setUser(updated)
      showSnackbar('Profil muvaffaqiyatli yangilandi')
      const passwordInput = formElement.elements.namedItem('password')
      if (passwordInput instanceof HTMLInputElement) passwordInput.value = ''
    } catch (updateError) {
      showSnackbar(getErrorMessage(updateError), 'error')
      setErrorField(getErrorField(updateError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
      <aside className="self-start rounded-2xl border border-slate-200/80 bg-white p-6">
        <div className="grid size-20 place-items-center rounded-3xl bg-[#dff6b0] text-2xl font-bold text-[#173c32]">
          {user.first_name.charAt(0)}{user.last_name.charAt(0)}
        </div>
        <h2 className="mt-5 text-xl font-bold tracking-tight">{user.first_name} {user.last_name}</h2>
        <p className="mt-1 text-sm text-slate-400">@{user.username}</p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#eff8f3] px-3 py-1.5 text-xs font-bold text-[#397461]">
          <ShieldCheck size={14} />
          {typeLabel[user.type] ?? user.type}
        </div>
        <div className="mt-7 space-y-4 border-t border-slate-100 pt-6">
          <ProfileMeta label="Telefon raqami" value={user.phone} />
          <ProfileMeta label="Ro‘yxatdan o‘tgan" value={formatDateTime(user.created_at)} />
        </div>
      </aside>

      <section className="rounded-2xl border border-slate-200/80 bg-white">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
          <h2 className="font-bold text-slate-900">Shaxsiy ma’lumotlar</h2>
          <p className="mt-1 text-xs text-slate-400">Profil va xavfsizlik ma’lumotlarini yangilang</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]"><UserRound size={18} /></div>
            <p className="text-sm font-bold text-slate-700">Asosiy ma’lumotlar</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="first_name" label="Ism" defaultValue={user.first_name} invalid={errorField === 'first_name'} />
            <Field name="last_name" label="Familiya" defaultValue={user.last_name} invalid={errorField === 'last_name'} />
            <Field name="phone" label="Telefon raqami" defaultValue={user.phone} type="tel" invalid={errorField === 'phone'} />
            <Field name="username" label="Foydalanuvchi nomi" defaultValue={user.username} invalid={errorField === 'username'} />
            <Field
              name="birth_date"
              label="Tug‘ilgan sana"
              type="date"
              defaultValue={user.birth_date?.slice(0, 10) ?? ''}
              invalid={errorField === 'birth_date'}
            />
            <Field
              name="residence_address"
              label="Yashash manzili"
              defaultValue={user.residence_address ?? ''}
              className="sm:col-span-2"
              invalid={errorField === 'residence_address'}
            />
          </div>

          <div className="my-8 border-t border-slate-100" />
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]">
              <MapPin size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Biriktirilgan MFYlar</p>
              <p className="text-xs text-slate-400">Faqat o‘qish — admin tomonidan belgilanadi</p>
            </div>
          </div>
          {mfysLoading ? (
            <p className="text-sm text-slate-400">Yuklanmoqda...</p>
          ) : mfys.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-500">
              Hali MFY biriktirilmagan
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {mfys.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  {item.name}
                </li>
              ))}
            </ul>
          )}

          <div className="my-8 border-t border-slate-100" />
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-orange-50 text-orange-500"><KeyRound size={18} /></div>
            <div>
              <p className="text-sm font-bold text-slate-700">Parolni yangilash</p>
              <p className="text-xs text-slate-400">O‘zgartirmaslik uchun bo‘sh qoldiring</p>
            </div>
          </div>
          <Field name="password" label="Yangi parol" type="password" placeholder="Kamida 6 ta belgi" optional invalid={errorField === 'password'} />

          <div className="mt-8 flex justify-end">
            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={saving}
              className="flex h-11 items-center gap-2 rounded-xl bg-[#173c32] px-5 text-sm font-bold text-white shadow-lg shadow-[#173c32]/10 disabled:opacity-60"
            >
              {saving ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}
              {saving ? 'Saqlanmoqda...' : 'O‘zgarishlarni saqlash'}
            </motion.button>
          </div>
        </form>
      </section>
    </div>
  )
}

function Field({
  name,
  label,
  defaultValue,
  type = 'text',
  placeholder,
  optional = false,
  invalid = false,
  className = '',
}: {
  name: string
  label: string
  defaultValue?: string
  type?: string
  placeholder?: string
  optional?: boolean
  invalid?: boolean
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-bold text-slate-600">{label}</span>
      <input
        name={name}
        type={type}
        required={!optional}
        minLength={type === 'password' ? 6 : undefined}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`h-12 w-full rounded-xl border bg-slate-50/40 px-4 text-sm outline-none transition focus:bg-white focus:ring-4 ${
          invalid
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-slate-200 focus:border-[#397461] focus:ring-[#397461]/8'
        }`}
      />
    </label>
  )
}

function ProfileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{value}</p>
    </div>
  )
}
