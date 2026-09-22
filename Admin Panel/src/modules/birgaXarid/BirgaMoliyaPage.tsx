import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import {
  Banknote,
  Check,
  Clock3,
  LoaderCircle,
  PackageCheck,
  Percent,
  RefreshCw,
  Save,
  Settings2,
  Sparkles,
  Truck,
  UserCog,
  Wallet,
} from 'lucide-react'
import { api, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { formatMoney, formatMoneyInput, parseMoneyInput } from '../../shared/order'
import { useSnackbar } from '../../shared/Snackbar'
import type { BirgaFinanceAccrual, BirgaFinanceStats, BirgaSettings } from '../../shared/types'

type FeeMode = 'percent' | 'fixed'
type MoliyaTab = 'sozlamalar' | 'statistika' | 'kuryer' | 'kurator'

const MOLIYA_TABS: { id: MoliyaTab; label: string; icon: typeof Wallet }[] = [
  { id: 'sozlamalar', label: 'Sozlamalar', icon: Settings2 },
  { id: 'statistika', label: 'Statistika', icon: Wallet },
  { id: 'kuryer', label: 'Kuryer to‘lov', icon: Truck },
  { id: 'kurator', label: 'Kurator to‘lov', icon: UserCog },
]

export function BirgaMoliyaPage() {
  const location = useLocation()
  const onIndex = /\/moliya\/?$/.test(location.pathname)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-[#173c32] to-[#102d26] p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#c9f560]/80">Moliya</p>
        <h3 className="mt-1 text-lg font-bold">Birga Xarid daromad va to‘lovlar</h3>
        <p className="mt-1 max-w-2xl text-sm text-emerald-50/55">
          Kuryer va kurator ulushi, ishlagan summalar, statistika va to‘lov belgilash — faqat admin.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white p-2">
        {MOLIYA_TABS.map(({ id, label, icon: Icon }) => (
          <NavLink
            key={id}
            to={id}
            className={({ isActive }) =>
              `relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                isActive ? 'text-[#173c32]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="birga-moliya-tab"
                    className="absolute inset-0 rounded-xl bg-[#c9f560]/70"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <Icon size={15} />
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      {onIndex ? <Navigate to="sozlamalar" replace /> : <Outlet />}
    </div>
  )
}

export function BirgaMoliyaSettingsPage() {
  return <SettingsTab />
}

export function BirgaMoliyaStatsPage() {
  return <StatsTab />
}

export function BirgaMoliyaCourierPage() {
  return <PayoutTab role="courier" />
}

export function BirgaMoliyaKuratorPage() {
  return <PayoutTab role="kurator" />
}

function SettingsTab() {
  const { showSnackbar } = useSnackbar()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<BirgaSettings | null>(null)
  const [courierMode, setCourierMode] = useState<FeeMode>('percent')
  const [kuratorMode, setKuratorMode] = useState<FeeMode>('percent')
  const [courierPercent, setCourierPercent] = useState('0')
  const [kuratorPercent, setKuratorPercent] = useState('0')
  const [courierFixed, setCourierFixed] = useState('0')
  const [kuratorFixed, setKuratorFixed] = useState('0')
  const [minOrder, setMinOrder] = useState('0')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const s = await api.birgaSettings()
      setSettings(s)
      setCourierMode(s.courier_fee_mode === 'fixed' ? 'fixed' : 'percent')
      setKuratorMode(s.kurator_fee_mode === 'fixed' ? 'fixed' : 'percent')
      setCourierPercent(String(s.courier_fee_percent ?? 0))
      setKuratorPercent(String(s.kurator_fee_percent ?? 0))
      setCourierFixed(formatMoneyInput(String(s.courier_fee_fixed ?? 0)))
      setKuratorFixed(formatMoneyInput(String(s.kurator_fee_fixed ?? 0)))
      setMinOrder(formatMoneyInput(String(s.min_order_amount ?? 0)))
    } catch (err) {
      showSnackbar(getErrorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }, [showSnackbar])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const updated = await api.updateBirgaSettings({
        min_order_amount: parseMoneyInput(minOrder),
        courier_fee_mode: courierMode,
        courier_fee_percent: Number(courierPercent) || 0,
        courier_fee_fixed: parseMoneyInput(courierFixed),
        kurator_fee_mode: kuratorMode,
        kurator_fee_percent: Number(kuratorPercent) || 0,
        kurator_fee_fixed: parseMoneyInput(kuratorFixed),
      })
      setSettings(updated)
      showSnackbar('Moliya sozlamalari saqlandi')
    } catch (err) {
      showSnackbar(getErrorMessage(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white py-16 text-slate-400">
        <LoaderCircle className="animate-spin" size={18} />
        Yuklanmoqda...
      </div>
    )
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <FeeCard
          title="Kuryer ulushi"
          hint="Har bir topshirilgan buyurtmadan kuryerga"
          mode={courierMode}
          onMode={setCourierMode}
          percent={courierPercent}
          onPercent={setCourierPercent}
          fixed={courierFixed}
          onFixed={setCourierFixed}
          icon={<Truck size={18} />}
        />
        <FeeCard
          title="Kurator ulushi"
          hint="O‘z hududidagi Birga Xarid buyurtmalaridan"
          mode={kuratorMode}
          onMode={setKuratorMode}
          percent={kuratorPercent}
          onPercent={setKuratorPercent}
          fixed={kuratorFixed}
          onFixed={setKuratorFixed}
          icon={<UserCog size={18} />}
        />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
        <label className="block text-sm font-semibold text-slate-800">
          Minimal buyurtma summasi
          <input
            value={minOrder}
            onChange={(e) => setMinOrder(formatMoneyInput(e.target.value))}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#173c32]"
          />
        </label>
        {settings ? (
          <p className="mt-3 text-xs text-slate-400">
            Oxirgi yangilanish: {formatDateTime(settings.updated_at)}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-[#173c32] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#102d26] disabled:opacity-60"
      >
        {saving ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
        {saving ? 'Saqlanmoqda...' : 'Saqlash'}
      </button>
    </form>
  )
}

function FeeCard({
  title,
  hint,
  mode,
  onMode,
  percent,
  onPercent,
  fixed,
  onFixed,
  icon,
}: {
  title: string
  hint: string
  mode: FeeMode
  onMode: (m: FeeMode) => void
  percent: string
  onPercent: (v: string) => void
  fixed: string
  onFixed: (v: string) => void
  icon: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]">
          {icon}
        </div>
        <div>
          <h4 className="font-bold text-slate-900">{title}</h4>
          <p className="text-xs text-slate-400">{hint}</p>
        </div>
      </div>

      <div className="mb-3 flex gap-2">
        {(
          [
            { id: 'percent' as const, label: 'Foiz', icon: Percent },
            { id: 'fixed' as const, label: 'Summa', icon: Banknote },
          ] as const
        ).map(({ id, label, icon: ModeIcon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onMode(id)}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              mode === id
                ? 'bg-[#c9f560]/80 text-[#173c32]'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <ModeIcon size={14} />
            {label}
          </button>
        ))}
      </div>

      {mode === 'percent' ? (
        <label className="block text-sm text-slate-600">
          Foiz (%)
          <input
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={percent}
            onChange={(e) => onPercent(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#173c32]"
          />
        </label>
      ) : (
        <label className="block text-sm text-slate-600">
          Belgilangan summa (so‘m)
          <input
            value={fixed}
            onChange={(e) => onFixed(formatMoneyInput(e.target.value))}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#173c32]"
          />
        </label>
      )}
    </div>
  )
}

function StatsTab() {
  const { showSnackbar } = useSnackbar()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<BirgaFinanceStats | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setStats(await api.birgaFinanceStats())
    } catch (err) {
      showSnackbar(getErrorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }, [showSnackbar])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white py-16 text-slate-400">
        <LoaderCircle className="animate-spin" size={18} />
        Yuklanmoqda...
      </div>
    )
  }

  const courierProgress =
    stats.courier_accrued > 0
      ? Math.min(100, Math.round((stats.courier_paid / stats.courier_accrued) * 100))
      : 0
  const kuratorProgress =
    stats.kurator_accrued > 0
      ? Math.min(100, Math.round((stats.kurator_paid / stats.kurator_accrued) * 100))
      : 0

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-[28px] bg-[#102d26] px-5 py-6 text-white sm:px-7">
        <div className="pointer-events-none absolute -right-8 -top-10 size-44 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-2/3 w-1/2 bg-[#c9f560]/15 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-[#c9f560]">
              <Sparkles size={12} />
              Umumiy ko‘rsatkichlar
            </div>
            <h4 className="text-lg font-bold tracking-tight sm:text-xl">Moliya statistikasi</h4>
            <p className="mt-1 max-w-md text-sm text-emerald-50/55">
              Topshirilgan buyurtmalar, aylanma va platforma ulushi.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
          >
            <RefreshCw size={13} />
            Yangilash
          </button>
        </div>

        <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
          <HeroStat
            icon={<PackageCheck size={18} />}
            label="Topshirilgan buyurtmalar"
            value={String(stats.issued_orders)}
            accent
          />
          <HeroStat
            icon={<Banknote size={18} />}
            label="Jami aylanma"
            value={formatMoney(stats.gross_volume)}
          />
          <HeroStat
            icon={<Wallet size={18} />}
            label="Platforma taxminiy"
            value={formatMoney(stats.platform_estimate)}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PartyStats
          title="Kuryer"
          subtitle="Yetkazish bo‘yicha ulushlar"
          icon={<Truck size={18} />}
          accrued={stats.courier_accrued}
          paid={stats.courier_paid}
          pending={stats.courier_pending}
          progress={courierProgress}
          tone="courier"
        />
        <PartyStats
          title="Kurator"
          subtitle="Hudud bo‘yicha ulushlar"
          icon={<UserCog size={18} />}
          accrued={stats.kurator_accrued}
          paid={stats.kurator_paid}
          pending={stats.kurator_pending}
          progress={kuratorProgress}
          tone="kurator"
        />
      </div>
    </div>
  )
}

function HeroStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 ${
        accent
          ? 'border-[#c9f560]/40 bg-[#c9f560]/15'
          : 'border-white/10 bg-white/6'
      }`}
    >
      <div
        className={`mb-3 grid size-9 place-items-center rounded-xl ${
          accent ? 'bg-[#c9f560] text-[#102d26]' : 'bg-white/10 text-[#c9f560]'
        }`}
      >
        {icon}
      </div>
      <p className={`text-xs ${accent ? 'text-[#e8f9a8]' : 'text-emerald-50/50'}`}>{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">{value}</p>
    </motion.div>
  )
}

function PartyStats({
  title,
  subtitle,
  icon,
  accrued,
  paid,
  pending,
  progress,
  tone,
}: {
  title: string
  subtitle: string
  icon: ReactNode
  accrued: number
  paid: number
  pending: number
  progress: number
  tone: 'courier' | 'kurator'
}) {
  const bar =
    tone === 'courier'
      ? 'from-[#c9f560] to-[#9bc93a]'
      : 'from-emerald-300 to-teal-400'

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="grid size-10 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-slate-900">{title}</h4>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        <span className="rounded-full bg-[#102d26] px-2.5 py-1 text-[11px] font-bold text-[#c9f560]">
          {progress}%
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-slate-400">To‘lov holati</span>
            <span className="font-semibold text-slate-600">{progress}% to‘langan</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              className={`h-full rounded-full bg-gradient-to-r ${bar}`}
            />
          </div>
        </div>

        <div className="grid gap-3">
          <MiniStat
            icon={<Wallet size={15} />}
            label="Hisoblangan"
            value={formatMoney(accrued)}
            tone="neutral"
          />
          <MiniStat
            icon={<Check size={15} />}
            label="To‘langan"
            value={formatMoney(paid)}
            tone="ok"
          />
          <MiniStat
            icon={<Clock3 size={15} />}
            label="Kutilmoqda"
            value={formatMoney(pending)}
            tone="warn"
          />
        </div>
      </div>
    </section>
  )
}

function MiniStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode
  label: string
  value: string
  tone: 'neutral' | 'ok' | 'warn'
}) {
  const styles = {
    neutral: 'bg-slate-50 text-slate-600',
    ok: 'bg-emerald-50 text-emerald-700',
    warn: 'bg-amber-50 text-amber-700',
  } as const

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-3.5 py-3">
      <div className={`grid size-8 shrink-0 place-items-center rounded-lg ${styles[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="truncate text-base font-bold text-slate-900">{value}</p>
      </div>
    </div>
  )
}

function PayoutTab({ role }: { role: 'courier' | 'kurator' }) {
  const { showSnackbar } = useSnackbar()
  const [items, setItems] = useState<BirgaFinanceAccrual[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'paid' | 'all'>('pending')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [paying, setPaying] = useState(false)

  const paidParam = useMemo(() => {
    if (filter === 'pending') return false
    if (filter === 'paid') return true
    return undefined
  }, [filter])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await api.birgaFinanceAccruals({
        role,
        paid: paidParam,
        limit: 100,
      })
      setItems(list)
      setSelected(new Set())
    } catch (err) {
      showSnackbar(getErrorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }, [paidParam, role, showSnackbar])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  const pendingIds = useMemo(
    () =>
      items
        .filter((a) => (role === 'courier' ? !a.courier_paid && a.courier_amount > 0 : !a.kurator_paid && a.kurator_amount > 0))
        .map((a) => a.id),
    [items, role],
  )

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => {
      if (prev.size === pendingIds.length) return new Set()
      return new Set(pendingIds)
    })
  }

  async function markPaid() {
    if (selected.size === 0) {
      showSnackbar('Kamida 1 ta yozuv tanlang', 'error')
      return
    }
    setPaying(true)
    try {
      const ids = [...selected]
      const res =
        role === 'courier' ? await api.birgaPayCourier(ids) : await api.birgaPayKurator(ids)
      showSnackbar(`${res.updated} ta to‘lov belgilandi`)
      await load()
    } catch (err) {
      showSnackbar(getErrorMessage(err), 'error')
    } finally {
      setPaying(false)
    }
  }

  const amountOf = (a: BirgaFinanceAccrual) =>
    role === 'courier' ? a.courier_amount : a.kurator_amount
  const paidOf = (a: BirgaFinanceAccrual) => (role === 'courier' ? a.courier_paid : a.kurator_paid)
  const paidAtOf = (a: BirgaFinanceAccrual) =>
    role === 'courier' ? a.courier_paid_at : a.kurator_paid_at

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(
            [
              { id: 'pending' as const, label: 'Kutilmoqda' },
              { id: 'paid' as const, label: 'To‘langan' },
              { id: 'all' as const, label: 'Hammasi' },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                filter === id
                  ? 'bg-[#c9f560]/80 text-[#173c32]'
                  : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {filter !== 'paid' ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleAll}
              className="rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              {selected.size === pendingIds.length && pendingIds.length > 0
                ? 'Tanlovni bekor'
                : 'Hammasini tanlash'}
            </button>
            <button
              type="button"
              disabled={paying || selected.size === 0}
              onClick={() => void markPaid()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#173c32] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {paying ? <LoaderCircle className="animate-spin" size={15} /> : <Check size={15} />}
              To‘landi deb belgilash
            </button>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
            <LoaderCircle className="animate-spin" size={18} />
            Yuklanmoqda...
          </div>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400">Yozuvlar yo‘q</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  {filter !== 'paid' ? <th className="px-4 py-3 font-semibold"> </th> : null}
                  <th className="px-4 py-3 font-semibold">Buyurtma</th>
                  <th className="px-4 py-3 font-semibold">Hudud</th>
                  <th className="px-4 py-3 font-semibold">Buyurtma summa</th>
                  <th className="px-4 py-3 font-semibold">Ulush</th>
                  <th className="px-4 py-3 font-semibold">Holat</th>
                  <th className="px-4 py-3 font-semibold">Sana</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {items.map((a) => {
                    const canSelect = !paidOf(a) && amountOf(a) > 0
                    return (
                      <motion.tr
                        key={a.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-t border-slate-100"
                      >
                        {filter !== 'paid' ? (
                          <td className="px-4 py-3">
                            {canSelect ? (
                              <input
                                type="checkbox"
                                checked={selected.has(a.id)}
                                onChange={() => toggle(a.id)}
                                className="size-4 rounded border-slate-300 accent-[#173c32]"
                              />
                            ) : null}
                          </td>
                        ) : null}
                        <td className="px-4 py-3 font-semibold text-slate-800">#{a.order_id}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {[a.region_name, a.city_name, a.mfy_name].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td className="px-4 py-3">{formatMoney(a.order_amount)}</td>
                        <td className="px-4 py-3 font-semibold text-[#173c32]">
                          {formatMoney(amountOf(a))}
                        </td>
                        <td className="px-4 py-3">
                          {paidOf(a) ? (
                            <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                              To‘langan
                              {paidAtOf(a) ? ` · ${formatDateTime(paidAtOf(a)!)}` : ''}
                            </span>
                          ) : (
                            <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                              Kutilmoqda
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatDateTime(a.created_at)}</td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
