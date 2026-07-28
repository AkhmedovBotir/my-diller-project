import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Building2, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { getErrorField, getErrorMessage } from '../../shared/api'
import { useSnackbar } from '../../shared/Snackbar'
import { useAuth } from './AuthContext'

export function RegisterPage() {
  const { user, register } = useAuth()
  const { showSnackbar } = useSnackbar()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorField, setErrorField] = useState<string>()

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorField(undefined)
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    try {
      await register({
        company_name: String(form.get('company_name') ?? '').trim(),
        stir: String(form.get('stir') ?? '').trim(),
        phone: String(form.get('phone') ?? '').trim(),
        password: String(form.get('password') ?? ''),
      })
      showSnackbar('Mahsulot qo‘shishdan oldin profilni 100% to‘ldiring')
      navigate('/profile', { replace: true })
    } catch (registerError) {
      showSnackbar(getErrorMessage(registerError), 'error')
      setErrorField(getErrorField(registerError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f7f6] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden bg-[#102d26] p-14 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -left-32 top-1/3 size-96 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="absolute -right-24 -top-24 size-80 rounded-full border border-white/10" />
          <div className="absolute -right-5 top-8 size-52 rounded-full border border-white/10" />

          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative flex items-center gap-3"
          >
            <div className="grid size-11 place-items-center rounded-2xl bg-[#c9f560] text-[#14352d] shadow-lg shadow-black/10">
              <Building2 size={23} strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">My Diller</p>
              <p className="text-xs text-emerald-100/60">Ishlab chiqaruvchi kabineti</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="relative max-w-xl"
          >
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-100/15 bg-white/5 px-4 py-2 text-xs font-semibold text-[#c9f560]">
              <span className="size-1.5 rounded-full bg-[#c9f560]" />
              Yangi hisob
            </div>
            <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.04em] xl:text-6xl">
              Korxonangizni
              <span className="block text-[#c9f560]">ro‘yxatdan o‘tkazing.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-emerald-50/60">
              Ro‘yxatdan o‘tgach, mahsulot qo‘shishdan oldin profilni to‘liq
              to‘ldirishingiz kerak bo‘ladi.
            </p>
          </motion.div>

          <p className="relative text-xs text-emerald-50/40">
            © 2026 My Diller. Barcha huquqlar himoyalangan.
          </p>
        </section>

        <section className="relative flex items-center justify-center px-6 py-12 sm:px-12">
          <div className="absolute left-6 top-6 flex items-center gap-2 lg:hidden">
            <div className="grid size-9 place-items-center rounded-xl bg-[#173c32] text-[#c9f560]">
              <Building2 size={20} />
            </div>
            <span className="font-bold">My Diller</span>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
            className="w-full max-w-md"
          >
            <div className="mb-8">
              <p className="mb-3 text-sm font-semibold text-[#397461]">ISHLAB CHIQARUVCHI</p>
              <h2 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950">
                Ro‘yxatdan o‘tish
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Qolgan rekvizit ma’lumotlarini keyinroq profilda to‘ldirasiz.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Field name="company_name" label="Korxona nomi" invalid={errorField === 'company_name'} />
              <Field name="stir" label="STIR (INN)" invalid={errorField === 'stir'} />
              <Field name="phone" label="Telefon raqami" type="tel" invalid={errorField === 'phone'} />

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Parol</span>
                <div className="relative">
                  <input
                    name="password"
                    required
                    minLength={6}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Kamida 6 ta belgi"
                    className={`h-12 w-full rounded-xl border bg-white px-4 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                      errorField === 'password'
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                        : 'border-slate-200 focus:border-[#397461] focus:ring-[#397461]/10'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                    aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                disabled={submitting}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#173c32] text-sm font-bold text-white shadow-xl shadow-[#173c32]/15 transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="animate-spin" size={18} />
                    Yuborilmoqda...
                  </>
                ) : (
                  <>
                    Ro‘yxatdan o‘tish
                    <ArrowRight size={18} />
                  </>
                )}
              </motion.button>
            </form>

            <p className="mt-7 text-center text-sm text-slate-500">
              Hisobingiz bormi?{' '}
              <Link to="/login" className="font-bold text-[#173c32] hover:underline">
                Tizimga kirish
              </Link>
            </p>
          </motion.div>
        </section>
      </div>
    </main>
  )
}

function Field({
  name,
  label,
  type = 'text',
  invalid = false,
}: {
  name: string
  label: string
  type?: string
  invalid?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        required
        className={`h-12 w-full rounded-xl border bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:ring-4 ${
          invalid
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-slate-200 focus:border-[#397461] focus:ring-[#397461]/10'
        }`}
      />
    </label>
  )
}
