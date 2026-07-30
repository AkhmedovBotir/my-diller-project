import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, LoaderCircle, Percent, Save, ShieldCheck, Sparkles, Wallet } from 'lucide-react'
import { api, getErrorMessage } from '../../shared/api'
import { formatDateTime } from '../../shared/date'
import { useSnackbar } from '../../shared/Snackbar'
import type { PlatformSettings } from '../../shared/types'

export function PlatformSettingsPage() {
  const { showSnackbar } = useSnackbar()
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setSettings(await api.platformSettings())
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(task)
  }, [load])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    const form = new FormData(event.currentTarget)
    try {
      const updated = await api.updatePlatformSettings({
        commission_percent: Number(form.get('commission_percent')),
        free_promo_active: form.get('free_promo_active') === 'on',
        reserve_balance: Number(form.get('reserve_balance')),
        curator_percent: Number(form.get('curator_percent')),
        support_telegram: String(form.get('support_telegram') ?? '').trim().replace(/^@+/, ''),
      })
      setSettings(updated)
      showSnackbar('Platforma sozlamalari yangilandi')
    } catch (saveError) {
      showSnackbar(getErrorMessage(saveError), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <LoaderCircle className="animate-spin text-slate-300" size={28} />
      </div>
    )
  }

  if (error || !settings) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-center">
        <div>
          <AlertTriangle className="mx-auto mb-3 text-red-400" />
          <p className="text-sm font-semibold text-red-600">{error || 'Sozlamalar topilmadi'}</p>
          <button onClick={() => void load()} className="mt-4 text-xs font-bold text-[#397461]">
            Qayta urinish
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] bg-[#173c32] px-6 py-7 text-white sm:px-8">
        <div className="absolute -right-10 -top-16 size-56 rounded-full border border-white/10" />
        <div className="absolute bottom-0 right-1/4 h-1/2 w-1/3 bg-[#c9f560]/10 blur-3xl" />
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-[#c9f560]">
            <Sparkles size={14} />
            Platforma sozlamalari
          </div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Umumiy platforma parametrlari</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/60">
            Komissiya foizi, aksiya rejimi va zaxira balansini shu yerdan boshqaring
          </p>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-600">
              <Percent size={14} className="text-[#397461]" />
              Komissiya foizi (%)
            </span>
            <input
              name="commission_percent"
              type="number"
              min="0"
              max="100"
              step="0.1"
              required
              defaultValue={settings.commission_percent}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 text-sm outline-none transition focus:border-[#397461] focus:bg-white focus:ring-4 focus:ring-[#397461]/8"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-600">
              <Wallet size={14} className="text-[#397461]" />
              Zaxira balans (so‘m)
            </span>
            <input
              name="reserve_balance"
              type="number"
              min="0"
              step="1000"
              required
              defaultValue={settings.reserve_balance}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 text-sm outline-none transition focus:border-[#397461] focus:bg-white focus:ring-4 focus:ring-[#397461]/8"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-600">
              <ShieldCheck size={14} className="text-[#397461]" />
              Kurator komissiyasi (%)
            </span>
            <input
              name="curator_percent"
              type="number"
              min="0"
              max="100"
              step="0.1"
              required
              defaultValue={settings.curator_percent}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 text-sm outline-none transition focus:border-[#397461] focus:bg-white focus:ring-4 focus:ring-[#397461]/8"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-600">
              <ShieldCheck size={14} className="text-[#397461]" />
              Texnik yordam Telegram username
            </span>
            <input
              name="support_telegram"
              type="text"
              required
              defaultValue={settings.support_telegram}
              placeholder="workmydiler"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 text-sm outline-none transition focus:border-[#397461] focus:bg-white focus:ring-4 focus:ring-[#397461]/8"
            />
            <p className="mt-1 text-xs text-slate-400">Masalan: `workmydiler` (oldiga @ yozmang)</p>
          </label>
        </div>

        <label className="mt-6 flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
          <div>
            <p className="text-sm font-bold text-slate-700">Bepul promo faol</p>
            <p className="mt-1 text-xs text-slate-400">
              Faol bo‘lsa, yakunlangan buyurtmalar uchun komissiya olinmaydi (waived)
            </p>
          </div>
          <input
            name="free_promo_active"
            type="checkbox"
            defaultChecked={settings.free_promo_active}
            className="size-5 rounded border-slate-300 text-[#173c32] focus:ring-[#397461]"
          />
        </label>

        <p className="mt-6 text-xs text-slate-400">
          Oxirgi yangilanish: {formatDateTime(settings.updated_at)}
        </p>

        <div className="mt-6 flex justify-end">
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
    </div>
  )
}
