import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowDownToLine,
  Banknote,
  Clock3,
  CreditCard,
  LoaderCircle,
  Percent,
  Send,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { api, getErrorField, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { formatMoneyInput, formatPrice, parseMoneyInput } from '../../shared/order'
import { useSnackbar } from '../../shared/Snackbar'
import type { KuratorDaromadSummary, KuratorTolovSorovi, KuratorTolovStatus } from '../../shared/types'
import { useAuth } from '../auth/AuthContext'

const statusLabel: Record<KuratorTolovStatus, string> = {
  pending: 'Kutilmoqda',
  paid: 'To‘landi',
  rejected: 'Rad etildi',
}

const statusStyle: Record<KuratorTolovStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  paid: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-600',
}

export function EarningsPage() {
  const { user } = useAuth()
  const { showSnackbar } = useSnackbar()
  const [summary, setSummary] = useState<KuratorDaromadSummary | null>(null)
  const [requests, setRequests] = useState<KuratorTolovSorovi[]>([])
  const [curatorPercent, setCuratorPercent] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) {
      setLoading(true)
      setError('')
    }
    try {
      const [daromad, sorovlar] = await Promise.all([api.kuratorDaromad(), api.kuratorTolovSorovlari()])
      setSummary(daromad)
      setRequests(sorovlar)
      setError('')
      try {
        const settings = await api.platformSettings()
        setCuratorPercent(settings.curator_percent)
      } catch {
        // Sozlamalarni o'qish ixtiyoriy — foiz ko'rsatilmasa ham sahifa ishlaydi.
      }
    } catch (loadError) {
      const message = getErrorMessage(loadError)
      if (!opts?.quiet) {
        setError(message)
        showSnackbar(message, 'error')
      }
    } finally {
      if (!opts?.quiet) setLoading(false)
    }
  }, [showSnackbar])

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(task)
  }, [load])

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-56 animate-pulse rounded-[28px] bg-slate-200/60" />
        <div className="h-72 animate-pulse rounded-2xl bg-white" />
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="grid min-h-72 place-items-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center">
        <div>
          <AlertTriangle className="mx-auto mb-3 text-red-400" />
          <p className="text-sm font-semibold text-red-600">{error || 'Ma’lumot topilmadi'}</p>
          <button onClick={() => void load()} className="mt-4 text-xs font-bold text-[#397461]">
            Qayta urinish
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <PlasticCard
          holderName={user ? `${user.first_name} ${user.last_name}` : 'Kurator'}
          balance={summary.balance}
          percent={curatorPercent}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            icon={Wallet}
            tone="bg-[#eff8f3] text-[#397461]"
            label="Jami topilgan daromad"
            value={formatPrice(summary.total_earned)}
          />
          <StatCard
            icon={Clock3}
            tone="bg-amber-50 text-amber-600"
            label="Yechish kutilmoqda"
            value={formatPrice(summary.total_withdrawn_pending)}
          />
          <StatCard
            icon={Percent}
            tone="bg-[#dff6b0] text-[#173c32]"
            label="Kurator komissiyasi"
            value={curatorPercent != null ? `${curatorPercent}%` : '—'}
          />
          <StatCard
            icon={ArrowDownToLine}
            tone="bg-blue-50 text-blue-600"
            label="Yechib olish uchun mavjud"
            value={formatPrice(summary.balance)}
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <WithdrawForm
          maxAmount={summary.balance}
          onCreated={(created) => {
            setRequests((current) => [created, ...current])
            setSummary((current) =>
              current
                ? {
                    ...current,
                    balance: Math.max(0, current.balance - created.amount),
                    total_withdrawn_pending: current.total_withdrawn_pending + created.amount,
                  }
                : current,
            )
            void load({ quiet: true })
          }}
        />

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <div className="border-b border-slate-100 p-5">
            <h3 className="text-lg font-bold tracking-tight text-slate-900">Mening so‘rovlarim</h3>
            <p className="mt-1 text-xs text-slate-400">Kartaga pul o‘tkazish so‘rovlari tarixi</p>
          </div>
          {requests.length === 0 ? (
            <div className="py-14 text-center text-sm text-slate-400">Hozircha so‘rovlar yo‘q</div>
          ) : (
            <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
              {requests.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  className="flex items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">{formatPrice(item.amount)}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {item.card_holder} · {item.card_number}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{formatDateTime(item.created_at)}</p>
                    {item.status === 'rejected' && item.admin_note && (
                      <p className="mt-1 text-[11px] text-red-500">Sabab: {item.admin_note}</p>
                    )}
                  </div>
                  <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyle[item.status]}`}>
                    {statusLabel[item.status]}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function PlasticCard({
  holderName,
  balance,
  percent,
}: {
  holderName: string
  balance: number
  percent: number | null
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex min-h-[240px] flex-col justify-between overflow-hidden rounded-[28px] bg-gradient-to-br from-[#173c32] via-[#0f2721] to-[#081714] p-7 text-white shadow-2xl shadow-[#0f2721]/30"
    >
      <div className="absolute -right-16 -top-16 size-56 rounded-full border border-white/10" />
      <div className="absolute -right-4 top-10 size-32 rounded-full border border-white/10" />
      <div className="absolute bottom-0 left-1/4 h-1/2 w-1/2 bg-[#c9f560]/10 blur-3xl" />

      <div className="relative flex items-start justify-between">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#c9f560]">
          <Sparkles size={13} />
          Kurator daromadi
        </div>
        <div className="grid size-11 place-items-center rounded-2xl bg-[#c9f560] text-[#173c32]">
          <CreditCard size={20} />
        </div>
      </div>

      <div className="relative mt-6">
        <p className="text-xs font-medium text-emerald-50/50">Yechib olish uchun mavjud balans</p>
        <p className="mt-2 text-4xl font-bold tracking-tight sm:text-[2.6rem]">{formatPrice(balance)}</p>
      </div>

      <div className="relative mt-8 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-50/40">Karta egasi</p>
          <p className="mt-1 truncate text-sm font-bold uppercase tracking-wide">{holderName}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-50/40">Komissiya</p>
          <p className="mt-1 text-sm font-bold text-[#c9f560]">{percent != null ? `${percent}%` : '—'}</p>
        </div>
      </div>
    </motion.div>
  )
}

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof Wallet
  tone: string
  label: string
  value: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200/80 bg-white p-5"
    >
      <div className={`mb-4 grid size-10 place-items-center rounded-xl ${tone}`}>
        <Icon size={18} />
      </div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 truncate text-base font-bold text-slate-800">{value}</p>
    </motion.div>
  )
}

function WithdrawForm({
  maxAmount,
  onCreated,
}: {
  maxAmount: number
  onCreated: (created: KuratorTolovSorovi) => void
}) {
  const { showSnackbar } = useSnackbar()
  const [saving, setSaving] = useState(false)
  const [errorField, setErrorField] = useState<string>()
  const [amount, setAmount] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    setSaving(true)
    setErrorField(undefined)
    const form = new FormData(formElement)
    const parsedAmount = parseMoneyInput(amount)

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorField('amount')
      showSnackbar('Summa musbat bo‘lishi kerak', 'error')
      setSaving(false)
      return
    }
    if (parsedAmount > maxAmount) {
      setErrorField('amount')
      showSnackbar('Mavjud balans yetarli emas', 'error')
      setSaving(false)
      return
    }

    try {
      const created = await api.createTolovSorov({
        amount: parsedAmount,
        card_number: String(form.get('card_number') || '').replace(/\s+/g, ''),
        card_holder: String(form.get('card_holder') || '').trim(),
        note: String(form.get('note') || '').trim(),
      })
      formElement.reset()
      setAmount('')
      showSnackbar('So‘rov yuborildi — admin tasdiqlashini kuting')
      onCreated(created)
    } catch (saveError) {
      showSnackbar(getErrorMessage(saveError), 'error')
      setErrorField(getErrorField(saveError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200/80 bg-white p-6"
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]">
          <Banknote size={19} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Kartaga pul yechish</h3>
          <p className="mt-0.5 text-xs text-slate-400">Mavjud: {formatPrice(maxAmount)}</p>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-slate-600">Summa (so‘m)</span>
          <input
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(formatMoneyInput(e.target.value))}
            placeholder="1 000"
            className={`h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ${
              errorField === 'amount' ? 'border-red-300' : 'border-slate-200 focus:border-[#397461]'
            }`}
            required
          />
        </label>
        <Field name="card_number" label="Karta raqami" placeholder="8600 1234 5678 9012" invalid={errorField === 'card_number'} />
        <Field name="card_holder" label="Karta egasi (F.I.Sh)" invalid={errorField === 'card_holder'} />
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-slate-600">
            Izoh <span className="font-medium text-slate-400">(ixtiyoriy)</span>
          </span>
          <textarea
            name="note"
            rows={2}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-2.5 text-sm outline-none transition focus:border-[#397461] focus:bg-white focus:ring-4 focus:ring-[#397461]/8"
          />
        </label>
      </div>

      <button
        disabled={saving || maxAmount <= 0}
        className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#173c32] text-sm font-bold text-white shadow-lg shadow-[#173c32]/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}
        {saving ? 'Yuborilmoqda...' : 'So‘rov yuborish'}
      </button>
      {maxAmount <= 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck size={13} />
          Yechish uchun mavjud balans yo‘q
        </p>
      )}
    </form>
  )
}

function Field({
  name,
  label,
  type = 'text',
  min,
  max,
  step,
  placeholder,
  invalid = false,
}: {
  name: string
  label: string
  type?: string
  min?: string
  max?: string
  step?: string
  placeholder?: string
  invalid?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-slate-600">{label}</span>
      <input
        name={name}
        type={type}
        required
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className={`h-11 w-full rounded-xl border bg-slate-50/40 px-4 text-sm outline-none transition focus:bg-white focus:ring-4 ${
          invalid
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-slate-200 focus:border-[#397461] focus:ring-[#397461]/8'
        }`}
      />
    </label>
  )
}