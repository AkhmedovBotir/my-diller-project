import { useEffect, useRef, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, LoaderCircle, ShieldCheck } from 'lucide-react'
import { SmsCodeInput } from './SmsCodeInput'

interface SmsVerifyFormProps {
  phoneMasked: string
  submitting: boolean
  resendAfter: number
  onSubmit: (code: string) => void
  onResend: () => Promise<number | void> | number | void
  onBack: () => void
}

export function SmsVerifyForm({
  phoneMasked,
  submitting,
  resendAfter,
  onSubmit,
  onResend,
  onBack,
}: SmsVerifyFormProps) {
  const [code, setCode] = useState('')
  const [seconds, setSeconds] = useState(resendAfter)
  const [resending, setResending] = useState(false)
  const sentRef = useRef('')

  useEffect(() => {
    setSeconds(resendAfter)
  }, [resendAfter])

  useEffect(() => {
    if (seconds <= 0) return
    const timer = window.setTimeout(() => setSeconds((current) => current - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [seconds])

  useEffect(() => {
    if (code.length !== 6 || submitting || sentRef.current === code) return
    sentRef.current = code
    onSubmit(code)
  }, [code, submitting, onSubmit])

  async function handleResend() {
    if (seconds > 0 || resending) return
    setResending(true)
    try {
      const next = await onResend()
      setCode('')
      sentRef.current = ''
      setSeconds(typeof next === 'number' ? next : 60)
    } finally {
      setResending(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (code.length !== 6 || submitting) return
    sentRef.current = code
    onSubmit(code)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm leading-6 text-slate-600">
        <p className="font-semibold text-[#173c32]">SMS kod yuborildi</p>
        <p className="mt-1">
          6 xonali tasdiqlash kodi <span className="font-bold text-[#173c32]">{phoneMasked}</span>{' '}
          raqamiga yuborildi.
        </p>
      </div>

      <label className="block">
        <span className="mb-3 block text-sm font-semibold text-slate-700">Tasdiqlash kodi</span>
        <SmsCodeInput value={code} onChange={setCode} disabled={submitting} />
      </label>

      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        disabled={submitting || code.length !== 6}
        className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#173c32] text-sm font-bold text-white shadow-xl shadow-[#173c32]/15 transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <>
            <LoaderCircle className="animate-spin" size={18} />
            Tekshirilmoqda...
          </>
        ) : (
          <>
            Tasdiqlash
            <ShieldCheck size={18} />
          </>
        )}
      </motion.button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-[#173c32]"
        >
          <ArrowLeft size={16} />
          Orqaga
        </button>
        <button
          type="button"
          disabled={seconds > 0 || resending}
          onClick={() => void handleResend()}
          className="font-semibold text-[#173c32] disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {seconds > 0 ? `Qayta yuborish (${seconds}s)` : resending ? 'Yuborilmoqda...' : 'Qayta yuborish'}
        </button>
      </div>
    </form>
  )
}
