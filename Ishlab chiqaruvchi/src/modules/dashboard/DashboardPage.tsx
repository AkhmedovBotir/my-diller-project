import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Package,
  Sparkles,
  UserRoundCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { formatLongDate } from '../../shared/date'

export function DashboardPage() {
  const { user } = useAuth()
  if (!user) return null

  const now = new Date()
  const formattedDate = formatLongDate(now)

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-[#173c32] px-6 py-8 text-white sm:px-9 sm:py-10">
        <div className="absolute -right-14 -top-20 size-72 rounded-full border border-white/8" />
        <div className="absolute -right-2 -top-3 size-40 rounded-full border border-white/8" />
        <div className="absolute bottom-0 right-1/4 h-1/2 w-1/3 bg-[#c9f560]/5 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-[#c9f560]">
              <Sparkles size={13} />
              Ishlab chiqaruvchi kabineti
            </div>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Assalomu alaykum, {user.first_name}!
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/60">
              {user.company_name} korxonasi profili va hisob ma’lumotlarini shu yerdan boshqaring.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-50/55">
            <CalendarDays size={16} className="text-[#c9f560]" />
            <span className="capitalize">{formattedDate}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Hisob holati', value: 'Faol', icon: CheckCircle2, tone: 'lime' },
          { label: 'Korxona', value: user.company_name, icon: Building2, tone: 'green' },
          { label: 'Oxirgi kirish', value: 'Hozirgina', icon: Clock3, tone: 'orange' },
          { label: 'Xavfsizlik', value: 'Himoyalangan', icon: UserRoundCheck, tone: 'blue' },
        ].map((item, index) => (
          <motion.article
            key={item.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="rounded-2xl border border-slate-200/80 bg-white p-5"
          >
            <div className="mb-6 flex items-start justify-between">
              <div className={`stat-icon stat-icon-${item.tone}`}><item.icon size={19} /></div>
              <ArrowUpRight size={16} className="text-slate-300" />
            </div>
            <p className="text-xs font-medium text-slate-400">{item.label}</p>
            <p className="mt-1 truncate text-lg font-bold tracking-tight text-slate-800">{item.value}</p>
          </motion.article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <article className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">Tezkor amallar</h3>
              <p className="mt-1 text-xs text-slate-400">Ko‘p ishlatiladigan bo‘limlar</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to="/products"
              className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-[#397461]/20 hover:bg-[#eff8f3]"
            >
              <div className="grid size-11 place-items-center rounded-xl bg-[#173c32] text-[#c9f560]">
                <Package size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Mahsulotlar</p>
                <p className="mt-1 text-xs text-slate-400">Yaratish, tahrirlash va holat kuzatuvi</p>
              </div>
              <ArrowUpRight size={17} className="ml-auto text-slate-300 transition group-hover:text-[#397461]" />
            </Link>
            <Link
              to="/profile"
              className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-[#397461]/20 hover:bg-[#eff8f3]"
            >
              <div className="grid size-11 place-items-center rounded-xl bg-[#dff6b0] text-[#173c32]">
                <UserRoundCheck size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Profilni yangilash</p>
                <p className="mt-1 text-xs text-slate-400">Korxona, shaxsiy ma’lumotlar va parol</p>
              </div>
              <ArrowUpRight size={17} className="ml-auto text-slate-300 transition group-hover:text-[#397461]" />
            </Link>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <h3 className="font-bold text-slate-900">Hisob ma’lumotlari</h3>
          <div className="mt-6 space-y-5">
            <InfoRow label="Korxona" value={user.company_name} />
            <InfoRow label="Foydalanuvchi" value={`@${user.username}`} />
            <InfoRow label="Telefon" value={user.phone} />
          </div>
        </article>
      </section>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-700">{value}</span>
    </div>
  )
}
