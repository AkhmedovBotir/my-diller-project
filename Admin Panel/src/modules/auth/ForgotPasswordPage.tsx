import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, LoaderCircle, ShieldCheck } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { api, getErrorField, getErrorMessage } from '../../shared/api'
import { PasswordInput } from '../../shared/PasswordInput'
import { SmsVerifyForm } from '../../shared/SmsVerifyForm'
import { useSnackbar } from '../../shared/Snackbar'
import type { SmsChallenge } from '../../shared/types'
import { useAuth } from './AuthContext'

export function ForgotPasswordPage() {
  const { admin } = useAuth()
  const { showSnackbar } = useSnackbar()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorField, setErrorField] = useState<string>()
  const [challenge, setChallenge] = useState<SmsChallenge | null>(null)
  const [code, setCode] = useState('')

  if (admin) return <Navigate to={`/${admin.type}`} replace />

  async function handleForgot(event: FormEvent) {
    event.preventDefault()
    setErrorField(undefined)
    setSubmitting(true)
    try {
      const next = await api.forgotPassword(username.trim())
      setChallenge(next)
      setCode('')
      showSnackbar(`SMS kod ${next.phone_masked} raqamiga yuborildi`)
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
      setErrorField(getErrorField(error))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReset(event: FormEvent) {
    event.preventDefault()
    if (!challenge || code.length !== 6) return
    if (password !== confirm) {
      showSnackbar('Parollar mos kelmadi', 'error')
      return
    }
    setSubmitting(true)
    try {
      await api.resetPassword(challenge.challenge_id, code, password)
      showSnackbar('Parol yangilandi. Endi tizimga kiring.')
      navigate('/login', { replace: true })
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f7f6] text-slate-950">
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-[#173c32] text-[#c9f560]">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="text-lg font-bold">My Diller</p>
              <p className="text-xs text-slate-500">Parolni tiklash</p>
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">Parolni tiklash</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {!challenge
              ? 'Login yoki telefon raqamingizni kiriting. SMS orqali 6 xonali kod yuboramiz.'
              : code.length === 6
                ? 'Yangi parol o‘rnating.'
                : `Kod ${challenge.phone_masked} raqamiga yuborildi.`}
          </p>
          {!challenge ? (
            <form onSubmit={handleForgot} className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Login yoki telefon</span>
                <input
                  required
                  autoFocus
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="username yoki +998..."
                  className={`h-13 w-full rounded-2xl border bg-white px-4 text-sm outline-none transition focus:ring-4 ${
                    errorField === 'username'
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                      : 'border-slate-200 focus:border-[#397461] focus:ring-[#397461]/10'
                  }`}
                />
              </label>
              <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} disabled={submitting} className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#173c32] text-sm font-bold text-white disabled:opacity-60">
                {submitting ? <LoaderCircle className="animate-spin" size={18} /> : <>SMS yuborish <ArrowRight size={18} /></>}
              </motion.button>
            </form>
          ) : code.length !== 6 ? (
            <div className="mt-8">
              <SmsVerifyForm
                phoneMasked={challenge.phone_masked}
                submitting={submitting}
                resendAfter={challenge.resend_after}
                onSubmit={setCode}
                onResend={async () => {
                  const next = await api.resendSms(challenge.challenge_id, 'reset')
                  setChallenge(next)
                  showSnackbar('SMS kod qayta yuborildi')
                  return next.resend_after
                }}
                onBack={() => {
                  setChallenge(null)
                  setCode('')
                }}
              />
            </div>
          ) : (
            <form onSubmit={handleReset} className="mt-8 space-y-5">
              <PasswordInput
                label="Yangi parol"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                size="lg"
                labelStyle="auth"
                withLock
              />
              <PasswordInput
                name="confirm"
                label="Parolni tasdiqlang"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                size="lg"
                labelStyle="auth"
              />
              <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} disabled={submitting} className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#173c32] text-sm font-bold text-white disabled:opacity-60">
                {submitting ? <LoaderCircle className="animate-spin" size={18} /> : 'Parolni saqlash'}
              </motion.button>
            </form>
          )}
          <p className="mt-7 text-center text-sm text-slate-500">
            <Link to="/login" className="font-bold text-[#173c32] hover:underline">Tizimga kirish</Link>
          </p>
        </motion.div>
      </div>
    </main>
  )
}
