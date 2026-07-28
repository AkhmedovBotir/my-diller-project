import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, KeyRound, LoaderCircle, MapPin, Save, ShoppingBag, UserRound } from 'lucide-react'
import { api, getErrorField, getErrorMessage, isXaridorProfileComplete } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { LocationPicker } from '../../shared/LocationPicker'
import { useSnackbar } from '../../shared/Snackbar'
import { useAuth } from '../auth/AuthContext'

export function ProfilePage() {
  const { user, setUser } = useAuth()
  const { showSnackbar } = useSnackbar()
  const [saving, setSaving] = useState(false)
  const [errorField, setErrorField] = useState<string>()
  const [address, setAddress] = useState(user?.address ?? '')
  const [lat, setLat] = useState<number | null>(user?.lat ?? null)
  const [lng, setLng] = useState<number | null>(user?.lng ?? null)

  if (!user) return null

  const profileComplete = isXaridorProfileComplete(user)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    setSaving(true)
    setErrorField(undefined)

    if (lat == null || lng == null) {
      showSnackbar('Xaritadan do‘kon joylashuvini tanlang', 'error')
      setErrorField('lat')
      setSaving(false)
      return
    }
    if (!address.trim()) {
      showSnackbar('Manzil kiritilishi shart', 'error')
      setErrorField('address')
      setSaving(false)
      return
    }

    const form = new FormData(formElement)
    const password = String(form.get('password') ?? '').trim()
    try {
      await api.updateProfile({
        shop_name: String(form.get('shop_name')),
        first_name: String(form.get('first_name')),
        last_name: String(form.get('last_name')),
        phone: String(form.get('phone')),
        username: String(form.get('username')),
        stir: String(form.get('stir') ?? '').trim(),
        bank_account: String(form.get('bank_account') ?? '').trim(),
        bank_name: String(form.get('bank_name') ?? '').trim(),
        mfo: String(form.get('mfo') ?? '').trim(),
        address: address.trim(),
        lat,
        lng,
        ...(password ? { password } : {}),
      })
      const refreshed = await api.profile()
      setUser(refreshed)
      setAddress(refreshed.address)
      setLat(refreshed.lat)
      setLng(refreshed.lng)
      showSnackbar(
        isXaridorProfileComplete(refreshed)
          ? 'Profil muvaffaqiyatli yangilandi — endi to‘liq'
          : 'Profil saqlandi, lekin ba’zi maydonlar hali to‘liq emas',
      )
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
          <ShoppingBag size={14} />
          Xaridor
        </div>
        {profileComplete ? (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#eff8f3] px-3 py-1.5 text-xs font-bold text-[#397461]">
            <CheckCircle2 size={14} />
            Profil to‘liq
          </div>
        ) : (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
            <AlertTriangle size={14} />
            Rekvizit to‘liq emas
          </div>
        )}
        <div className="mt-7 space-y-4 border-t border-slate-100 pt-6">
          <ProfileMeta label="Do‘kon" value={user.shop_name} />
          <ProfileMeta label="Telefon raqami" value={user.phone} />
          <ProfileMeta label="Manzil" value={user.address || '—'} />
          <ProfileMeta label="Ro‘yxatdan o‘tgan" value={formatDateTime(user.created_at)} />
          {user.lat != null && user.lng != null && (
            <ProfileMeta label="Koordinata" value={`${user.lat.toFixed(5)}, ${user.lng.toFixed(5)}`} />
          )}
        </div>
      </aside>

      <section className="rounded-2xl border border-slate-200/80 bg-white">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
          <h2 className="font-bold text-slate-900">Shaxsiy ma’lumotlar</h2>
          <p className="mt-1 text-xs text-slate-400">Profil, rekvizit va xavfsizlik ma’lumotlarini yangilang</p>
        </div>

        {!profileComplete && (
          <div className="mx-6 mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-800 sm:mx-8">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <p className="font-semibold">
              Buyurtma berishdan oldin rekvizit ma’lumotlarini (do‘kon nomi, STIR, bank, MFO, manzil, xarita) to‘liq to‘ldiring.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]"><UserRound size={18} /></div>
            <p className="text-sm font-bold text-slate-700">Asosiy ma’lumotlar</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="shop_name" label="Do‘kon nomi" defaultValue={user.shop_name} invalid={errorField === 'shop_name'} className="sm:col-span-2" />
            <Field name="first_name" label="Ism" defaultValue={user.first_name} invalid={errorField === 'first_name'} />
            <Field name="last_name" label="Familiya" defaultValue={user.last_name} invalid={errorField === 'last_name'} />
            <Field name="phone" label="Telefon raqami" defaultValue={user.phone} type="tel" invalid={errorField === 'phone'} />
            <Field name="username" label="Foydalanuvchi nomi" defaultValue={user.username} invalid={errorField === 'username'} />
          </div>

          <div className="my-8 border-t border-slate-100" />
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-500"><MapPin size={18} /></div>
            <p className="text-sm font-bold text-slate-700">Rekvizit va manzil</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="stir" label="STIR" defaultValue={user.stir} invalid={errorField === 'stir'} />
            <Field name="bank_name" label="Bank nomi" defaultValue={user.bank_name} invalid={errorField === 'bank_name'} />
            <Field name="mfo" label="MFO" defaultValue={user.mfo} invalid={errorField === 'mfo'} />
            <Field name="bank_account" label="Hisob raqami" defaultValue={user.bank_account} invalid={errorField === 'bank_account'} />
          </div>

          <div className="mt-5">
            <LocationPicker
              lat={lat}
              lng={lng}
              onChange={({ lat: nextLat, lng: nextLng, address: nextAddress }) => {
                setLat(nextLat)
                setLng(nextLng)
                if (nextAddress) setAddress(nextAddress)
              }}
              className="mb-5"
            />
            <label className="mb-5 block">
              <span className="mb-2 block text-xs font-bold text-slate-600">
                Manzil
                <span className="ml-1 text-red-400">*</span>
              </span>
              <input
                name="address"
                required
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Ko‘cha, uy, shahar..."
                className={`h-12 w-full rounded-xl border bg-slate-50/40 px-4 text-sm outline-none transition focus:bg-white focus:ring-4 ${
                  errorField === 'address'
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                    : 'border-slate-200 focus:border-[#397461] focus:ring-[#397461]/8'
                }`}
              />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-600">
                  Kenglik (lat)
                  <span className="ml-1 text-red-400">*</span>
                </span>
                <input
                  type="number"
                  step="any"
                  required
                  readOnly
                  value={lat ?? ''}
                  className={`h-12 w-full rounded-xl border bg-slate-100/80 px-4 text-sm text-slate-600 outline-none ${
                    errorField === 'lat' ? 'border-red-300' : 'border-slate-200'
                  }`}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-600">
                  Uzunlik (lng)
                  <span className="ml-1 text-red-400">*</span>
                </span>
                <input
                  type="number"
                  step="any"
                  required
                  readOnly
                  value={lng ?? ''}
                  className={`h-12 w-full rounded-xl border bg-slate-100/80 px-4 text-sm text-slate-600 outline-none ${
                    errorField === 'lng' ? 'border-red-300' : 'border-slate-200'
                  }`}
                />
              </label>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Koordinatalar faqat xarita orqali tanlanadi va saqlashda bazaga yuboriladi.
            </p>
          </div>

          <div className="my-8 border-t border-slate-100" />
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-orange-50 text-orange-500"><KeyRound size={18} /></div>
            <div>
              <p className="text-sm font-bold text-slate-700">Parolni yangilash</p>
              <p className="text-xs text-slate-400">O‘zgartirmaslik uchun bo‘sh qoldiring</p>
            </div>
          </div>
          <Field name="password" label="Yangi parol" type="password" placeholder="Kamida 6 ta belgi" required={false} invalid={errorField === 'password'} />

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
  required = true,
  invalid = false,
  className = '',
}: {
  name: string
  label: string
  defaultValue?: string
  type?: string
  placeholder?: string
  required?: boolean
  invalid?: boolean
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-bold text-slate-600">
        {label}
        {!required && <span className="ml-1 font-normal text-slate-400">(ixtiyoriy)</span>}
        {required && <span className="ml-1 text-red-400">*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
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
