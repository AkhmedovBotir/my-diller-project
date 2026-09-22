import { useEffect, useState } from 'react'
import { LogOut, UserRound } from 'lucide-react'
import { EmptyState, FadeIn, PageHeader } from '../app/AppShell'
import { ApiRequestError } from '../shared/api'
import { useAuth } from '../shared/AuthContext'
import { formatPhoneDisplay } from '../shared/phone'
import { RegionCascade, type RegionNames } from '../shared/RegionCascade'
import { toast } from '../shared/Snackbar'

export function ProfilePage() {
  const { customer, loading: authLoading, requireAuth, updateProfile, logout, refreshMe } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [region, setRegion] = useState<RegionNames>({
    region_name: '',
    city_name: '',
    mfy_name: '',
  })
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!customer) {
      requireAuth(() => void refreshMe())
      return
    }
    setFirstName(customer.first_name ?? '')
    setLastName(customer.last_name ?? '')
    setBirthDate(customer.birth_date ?? '')
    setRegion({
      region_name: customer.region_name ?? '',
      city_name: customer.city_name ?? '',
      mfy_name: customer.mfy_name ?? '',
    })
    setAddress(customer.address ?? '')
  }, [customer, authLoading, requireAuth, refreshMe])

  if (authLoading) {
    return (
      <div>
        <PageHeader title="Profil" subtitle="Shaxsiy ma’lumotlar va manzil." />
        <div className="h-64 animate-pulse rounded-[28px] bg-white/70" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div>
        <PageHeader title="Profil" subtitle="Shaxsiy ma’lumotlar va manzil." />
        <EmptyState
          title="Kirish kerak"
          text="Telefon orqali kirish oynasi ochiladi — kirgach profil shu yerda chiqadi."
        />
      </div>
    )
  }

  async function save() {
    setBusy(true)
    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        birth_date: birthDate,
        region_name: region.region_name,
        city_name: region.city_name,
        mfy_name: region.mfy_name,
        address: address.trim(),
      })
      toast('Profil saqlandi')
    } catch (error) {
      toast(error instanceof ApiRequestError ? error.message : 'Saqlanmadi', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Profil" subtitle="Ma’lumotlaringizni yangilang." />

      <FadeIn>
        <div className="rounded-[28px] bg-white p-5 ring-1 ring-[#102d26]/6 sm:p-7">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-[#102d26] text-[#c9f560]">
              <UserRound className="h-8 w-8" />
            </div>
            <div>
              <p className="text-lg font-bold">
                {customer.first_name || customer.last_name
                  ? `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim()
                  : 'Yangi foydalanuvchi'}
              </p>
              <p className="text-sm text-[#5f7a70]">{formatPhoneDisplay(customer.phone)}</p>
              {!customer.profile_completed ? (
                <p className="mt-1 text-xs font-semibold text-amber-600">
                  Profil to‘liq emas — buyurtma uchun to‘ldiring
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Field label="Ism" value={firstName} onChange={setFirstName} />
            <Field label="Familiya" value={lastName} onChange={setLastName} />
          </div>

          <label className="mt-3 block">
            <span className="mb-1.5 block text-xs font-semibold text-[#3d5c52]">Tug‘ilgan sana</span>
            <input
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              className="h-12 w-full rounded-2xl border border-[#102d26]/15 px-3 text-sm outline-none focus:border-[#102d26] focus:ring-2 focus:ring-[#c9f560]/60"
            />
          </label>

          <div className="mt-3">
            <p className="mb-2 text-xs font-semibold text-[#3d5c52]">Hudud</p>
            {customer.region_name ? (
              <p className="mb-3 rounded-2xl bg-[#f3f7f4] px-3 py-2 text-sm text-[#3d5c52]">
                Hozirgi: {customer.region_name}, {customer.city_name}, {customer.mfy_name}
              </p>
            ) : null}
            <RegionCascade value={region} onChange={setRegion} />
          </div>

          <label className="mt-3 block">
            <span className="mb-1.5 block text-xs font-semibold text-[#3d5c52]">Manzil</span>
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className="h-12 w-full rounded-2xl border border-[#102d26]/15 px-3 text-sm outline-none focus:border-[#102d26] focus:ring-2 focus:ring-[#c9f560]/60"
              placeholder="Ko‘cha, uy"
            />
          </label>

          <div className="mt-6 flex flex-row gap-2 sm:gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-2xl bg-[#102d26] text-sm font-bold text-[#c9f560] transition hover:brightness-110 disabled:opacity-60 sm:h-12"
            >
              {busy ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
            <button
              type="button"
              onClick={logout}
              className="flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-[#102d26]/15 bg-white text-sm font-semibold text-[#102d26] transition hover:bg-[#f3f7f4] sm:h-12 sm:gap-2"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Chiqish
            </button>
          </div>
        </div>
      </FadeIn>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#3d5c52]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[#102d26]/15 px-3 text-sm outline-none focus:border-[#102d26] focus:ring-2 focus:ring-[#c9f560]/60"
      />
    </label>
  )
}
