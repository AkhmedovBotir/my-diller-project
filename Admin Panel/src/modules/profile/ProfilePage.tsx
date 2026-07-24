import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { KeyRound, LoaderCircle, Save, ShieldCheck, UserRound } from 'lucide-react'
import { api, getErrorField, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { useSnackbar } from '../../shared/Snackbar'
import { useAuth } from '../auth/AuthContext'

export function ProfilePage() {
  const { admin, setAdmin } = useAuth()
  const { showSnackbar } = useSnackbar()
  const [saving, setSaving] = useState(false)
  const [errorField, setErrorField] = useState<string>()

  if (!admin) return null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    setSaving(true)
    setErrorField(undefined)
    const form = new FormData(formElement)
    try {
      const updated = await api.updateProfile({
        first_name: String(form.get('first_name')),
        last_name: String(form.get('last_name')),
        phone: String(form.get('phone')),
        username: String(form.get('username')),
        password: String(form.get('password')),
      })
      setAdmin(updated)
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
          {admin.first_name.charAt(0)}{admin.last_name.charAt(0)}
        </div>
        <h2 className="mt-5 text-xl font-bold tracking-tight">{admin.first_name} {admin.last_name}</h2>
        <p className="mt-1 text-sm text-slate-400">@{admin.username}</p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#eff8f3] px-3 py-1.5 text-xs font-bold capitalize text-[#397461]">
          <ShieldCheck size={14} />
          {admin.type}
        </div>
        <div className="mt-7 space-y-4 border-t border-slate-100 pt-6">
          <ProfileMeta label="Telefon raqami" value={admin.phone} />
          <ProfileMeta
            label="Ro‘yxatdan o‘tgan"
            value={formatDateTime(admin.created_at)}
          />
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
            <Field name="first_name" label="Ism" defaultValue={admin.first_name} invalid={errorField === 'first_name'} />
            <Field name="last_name" label="Familiya" defaultValue={admin.last_name} invalid={errorField === 'last_name'} />
            <Field name="phone" label="Telefon raqami" defaultValue={admin.phone} type="tel" invalid={errorField === 'phone'} />
            <Field name="username" label="Foydalanuvchi nomi" defaultValue={admin.username} invalid={errorField === 'username'} />
          </div>

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
}: {
  name: string
  label: string
  defaultValue?: string
  type?: string
  placeholder?: string
  optional?: boolean
  invalid?: boolean
}) {
  return (
    <label className="block">
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
