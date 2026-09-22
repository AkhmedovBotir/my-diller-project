import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api, ApiRequestError } from './api'
import { useAuth } from './AuthContext'
import { isValidPhone, normalizePhone } from './phone'
import { PhoneInput } from './PhoneInput'
import { RegionCascade, type RegionNames } from './RegionCascade'
import { SmsVerifyForm } from './SmsVerifyForm'
import type { Customer, SmsChallenge } from './types'

type Props = {
  open: boolean
  onClose: () => void
  onDone?: (customer: Customer) => void
}

type Step = 'phone' | 'sms' | 'profile'

export function AuthModal({ open, onClose, onDone }: Props) {
  const { customer, setSession, updateProfile } = useAuth()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [challenge, setChallenge] = useState<SmsChallenge | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [region, setRegion] = useState<RegionNames>({
    region_name: '',
    city_name: '',
    mfy_name: '',
  })
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    if (customer && !customer.profile_completed) {
      setStep('profile')
      setFirstName(customer.first_name ?? '')
      setLastName(customer.last_name ?? '')
      setBirthDate(customer.birth_date ?? '')
      setRegion({
        region_name: customer.region_name ?? '',
        city_name: customer.city_name ?? '',
        mfy_name: customer.mfy_name ?? '',
      })
      setAddress(customer.address ?? '')
    } else if (!customer) {
      setStep('phone')
      setPhone('')
      setChallenge(null)
    } else {
      onDone?.(customer)
      onClose()
    }
  }, [open, customer, onClose, onDone])

  async function submitPhone() {
    setError('')
    if (!isValidPhone(phone)) {
      setError('Telefon raqamini to‘liq kiriting')
      return
    }
    setBusy(true)
    try {
      const next = await api.authLogin(normalizePhone(phone))
      setChallenge(next)
      setStep('sms')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'SMS yuborilmadi')
    } finally {
      setBusy(false)
    }
  }

  const verifySms = useCallback(
    async (code: string) => {
      if (!challenge) return
      setError('')
      setBusy(true)
      try {
        const result = await api.authVerify(challenge.challenge_id, code)
        setSession(result.token, result.customer)
        if (result.customer.profile_completed) {
          onDone?.(result.customer)
          onClose()
        } else {
          setFirstName(result.customer.first_name ?? '')
          setLastName(result.customer.last_name ?? '')
          setBirthDate(result.customer.birth_date ?? '')
          setRegion({
            region_name: result.customer.region_name ?? '',
            city_name: result.customer.city_name ?? '',
            mfy_name: result.customer.mfy_name ?? '',
          })
          setAddress(result.customer.address ?? '')
          setStep('profile')
        }
      } catch (err) {
        setError(err instanceof ApiRequestError ? err.message : 'Kod noto‘g‘ri')
      } finally {
        setBusy(false)
      }
    },
    [challenge, setSession, onDone, onClose],
  )

  async function submitProfile() {
    setError('')
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !birthDate ||
      !region.region_name ||
      !region.city_name ||
      !region.mfy_name
    ) {
      setError('Barcha majburiy maydonlarni to‘ldiring')
      return
    }
    setBusy(true)
    try {
      const next = await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        birth_date: birthDate,
        region_name: region.region_name,
        city_name: region.city_name,
        mfy_name: region.mfy_name,
        address: address.trim(),
      })
      onDone?.(next)
      onClose()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Profil saqlanmadi')
    } finally {
      setBusy(false)
    }
  }

  const title =
    step === 'phone'
      ? 'Telefon orqali kirish'
      : step === 'sms'
        ? 'SMS tasdiqlash'
        : 'Profilni to‘ldiring'

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#102d26]/45 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-[#f7faf8] shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#102d26]/8 bg-[#f7faf8]/95 px-5 py-4 backdrop-blur">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5f7a70]">
                  Birga Xarid
                </p>
                <h2 className="text-lg font-bold text-[#102d26]">{title}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#102d26] shadow-sm"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              {step === 'phone' ? (
                <>
                  <p className="text-sm leading-6 text-[#3d5c52]">
                    Buyurtma berish uchun telefon raqamingizni kiriting. Tasdiqlash kodi SMS orqali
                    yuboriladi.
                  </p>
                  <PhoneInput
                    value={phone}
                    autoFocus
                    invalid={Boolean(error)}
                    onChange={(full) => setPhone(full)}
                  />
                  {error ? (
                    <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void submitPhone()}
                    className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#102d26] text-sm font-bold text-[#c9f560] transition hover:brightness-110 disabled:opacity-60"
                  >
                    {busy ? 'Yuborilmoqda...' : 'SMS kod olish'}
                  </button>
                </>
              ) : null}

              {step === 'sms' && challenge ? (
                <>
                  {error ? (
                    <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
                  ) : null}
                  <SmsVerifyForm
                    phoneMasked={challenge.phone_masked}
                    submitting={busy}
                    resendAfter={challenge.resend_after}
                    onSubmit={(code) => void verifySms(code)}
                    onBack={() => {
                      setStep('phone')
                      setChallenge(null)
                      setError('')
                    }}
                    onResend={async () => {
                      const next = await api.authResendSms(challenge.challenge_id)
                      setChallenge(next)
                      return next.resend_after
                    }}
                  />
                </>
              ) : null}

              {step === 'profile' ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Ism"
                      value={firstName}
                      onChange={setFirstName}
                      placeholder="Ismingiz"
                    />
                    <Field
                      label="Familiya"
                      value={lastName}
                      onChange={setLastName}
                      placeholder="Familiyangiz"
                    />
                  </div>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[#3d5c52]">
                      Tug‘ilgan sana
                    </span>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(event) => setBirthDate(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-[#102d26]/15 bg-white px-3 text-sm text-[#102d26] outline-none focus:border-[#102d26] focus:ring-2 focus:ring-[#c9f560]/60"
                    />
                  </label>
                  <RegionCascade value={region} onChange={setRegion} invalid={Boolean(error)} />
                  <Field
                    label="Manzil (ixtiyoriy)"
                    value={address}
                    onChange={setAddress}
                    placeholder="Ko‘cha, uy"
                  />
                  {error ? (
                    <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void submitProfile()}
                    className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#102d26] text-sm font-bold text-[#c9f560] transition hover:brightness-110 disabled:opacity-60"
                  >
                    {busy ? 'Kutilmoqda...' : 'Saqlash'}
                  </button>
                </>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[#3d5c52]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-[#102d26]/15 bg-white px-3 text-sm text-[#102d26] outline-none focus:border-[#102d26] focus:ring-2 focus:ring-[#c9f560]/60"
      />
    </label>
  )
}
