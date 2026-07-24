import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, ShoppingBag } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { getErrorField, getErrorMessage } from '../../shared/api'
import { useSnackbar } from '../../shared/Snackbar'
import { useAuth } from './AuthContext'

export function LoginPage() {
  const { user, login } = useAuth()
  const { showSnackbar } = useSnackbar()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorField, setErrorField] = useState<string>()

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrorField(undefined)
    setSubmitting(true)
    try {
      const loggedUser = await login(username.trim(), password)
      showSnackbar(`Xush kelibsiz, ${loggedUser.first_name}!`)
      navigate('/', { replace: true })
    } catch (loginError) {
      showSnackbar(getErrorMessage(loginError), 'error')
      setErrorField(getErrorField(loginError))
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
              <ShoppingBag size={23} strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">My Diller</p>
              <p className="text-xs text-emerald-100/60">Xaridor kabineti</p>
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
              Do‘kon kabineti
            </div>
            <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.04em] xl:text-6xl">
              Ulgurji xaridlar
              <span className="block text-[#c9f560]">bitta joyda.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-emerald-50/60">
              Katalogdan mahsulot tanlang, buyurtma bering va yetkazib berishni
              real vaqt rejimida kuzating.
            </p>
          </motion.div>

          <p className="relative text-xs text-emerald-50/40">
            © 2026 My Diller. Barcha huquqlar himoyalangan.
          </p>
        </section>

        <section className="relative flex items-center justify-center px-6 py-12 sm:px-12">
          <div className="absolute left-6 top-6 flex items-center gap-2 lg:hidden">
            <div className="grid size-9 place-items-center rounded-xl bg-[#173c32] text-[#c9f560]">
              <ShoppingBag size={20} />
            </div>
            <span className="font-bold">My Diller</span>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
            className="w-full max-w-md"
          >
            <div className="mb-9">
              <p className="mb-3 text-sm font-semibold text-[#397461]">XARIDOR</p>
              <h2 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950">
                Xush kelibsiz
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Kabinetga kirish uchun hisob ma’lumotlaringizni kiriting.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Login</span>
                <input
                  required
                  autoFocus
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Foydalanuvchi nomi"
                  className={`h-13 w-full rounded-2xl border bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                    errorField === 'username'
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                      : 'border-slate-200 focus:border-[#397461] focus:ring-[#397461]/10'
                  }`}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Parol</span>
                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    required
                    minLength={6}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Kamida 6 ta belgi"
                    className={`h-13 w-full rounded-2xl border bg-white pl-11 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:ring-4 ${
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
                    Tekshirilmoqda...
                  </>
                ) : (
                  <>
                    Tizimga kirish
                    <ArrowRight size={18} />
                  </>
                )}
              </motion.button>
            </form>

            <p className="mt-7 text-center text-sm text-slate-500">
              Hisobingiz yo‘qmi?{' '}
              <Link to="/register" className="font-bold text-[#173c32] hover:underline">
                Ro‘yxatdan o‘tish
              </Link>
            </p>

            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShoppingBag size={14} />
              Ma’lumotlaringiz shifrlangan holda uzatiladi
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  )
}
