import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FolderTree,
  Package,
  Percent,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../../shared/api'
import { useAuth } from '../auth/AuthContext'
import type { AdminRole } from '../../shared/types'
import { formatLongDate } from '../../shared/date'

const roleContent: Record<AdminRole, { eyebrow: string; description: string }> = {
  general: {
    eyebrow: 'Tizim boshqaruvi',
    description: 'Administratorlar, rollar va tizim nazorati sizning qo‘lingizda.',
  },
  admin: {
    eyebrow: 'Operatsion boshqaruv',
    description: 'Kundalik vazifalar va platforma jarayonlarini bir joydan boshqaring.',
  },
  kurator: {
    eyebrow: 'Kurator ish maydoni',
    description: 'Biriktirilgan vazifalar va jarayonlarni tez va qulay kuzating.',
  },
}

export function DashboardPage() {
  const { admin } = useAuth()
  const [forsMajorCount, setForsMajorCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function loadAlert() {
      try {
        const alert = await api.forsMajorAlert()
        if (!cancelled) setForsMajorCount(alert.count)
      } catch {
        // Alert is best-effort; silently ignore failures.
      }
    }
    void loadAlert()
    const interval = window.setInterval(() => void loadAlert(), 30000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  if (!admin) return null

  const content = roleContent[admin.type]
  const now = new Date()
  const formattedDate = formatLongDate(now)

  return (
    <div className="space-y-6">
      {forsMajorCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-red-600 text-white">
              <ShieldAlert size={22} />
            </div>
            <div>
              <p className="text-sm font-bold text-red-700">
                Diqqat! {forsMajorCount} ta buyurtma fors-major holatida
              </p>
              <p className="mt-0.5 text-xs text-red-500">
                To‘lov muddati o‘tib ketgan buyurtmalar bo‘yicha shoshilinch aralashuv talab qilinadi
              </p>
            </div>
          </div>
          <Link
            to={`/${admin.type}/orders?status=fors_major`}
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700"
          >
            Buyurtmalarni ko‘rish
            <ArrowUpRight size={16} />
          </Link>
        </motion.div>
      )}

      <section className="relative overflow-hidden rounded-[28px] bg-[#173c32] px-6 py-8 text-white sm:px-9 sm:py-10">
        <div className="absolute -right-14 -top-20 size-72 rounded-full border border-white/8" />
        <div className="absolute -right-2 -top-3 size-40 rounded-full border border-white/8" />
        <div className="absolute bottom-0 right-1/4 h-1/2 w-1/3 bg-[#c9f560]/5 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-[#c9f560]">
              <Sparkles size={13} />
              {content.eyebrow}
            </div>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Assalomu alaykum, {admin.first_name}!
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/60">
              {content.description}
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
          { label: 'Sizning rolingiz', value: admin.type, icon: ShieldCheck, tone: 'green' },
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
            <p className="mt-1 truncate text-lg font-bold capitalize tracking-tight text-slate-800">{item.value}</p>
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
            {admin.type === 'general' && (
              <Link
                to="/general/admins"
                className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-[#397461]/20 hover:bg-[#eff8f3]"
              >
                <div className="grid size-11 place-items-center rounded-xl bg-[#173c32] text-[#c9f560]">
                  <UsersRound size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Adminlarni boshqarish</p>
                  <p className="mt-1 text-xs text-slate-400">Yaratish, tahrirlash va o‘chirish</p>
                </div>
                <ArrowUpRight size={17} className="ml-auto text-slate-300 transition group-hover:text-[#397461]" />
              </Link>
            )}
            <Link
              to={`/${admin.type}/ishlabchiqaruvchilar`}
              className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-[#397461]/20 hover:bg-[#eff8f3]"
            >
              <div className="grid size-11 place-items-center rounded-xl bg-[#173c32] text-[#c9f560]">
                <Building2 size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Ishlab chiqaruvchilar</p>
                <p className="mt-1 text-xs text-slate-400">Korxonalar CRUD boshqaruvi</p>
              </div>
              <ArrowUpRight size={17} className="ml-auto text-slate-300 transition group-hover:text-[#397461]" />
            </Link>
            <Link
              to={`/${admin.type}/categories`}
              className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-[#397461]/20 hover:bg-[#eff8f3]"
            >
              <div className="grid size-11 place-items-center rounded-xl bg-[#173c32] text-[#c9f560]">
                <FolderTree size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Kategoriyalar</p>
                <p className="mt-1 text-xs text-slate-400">Katalog va subkategoriyalar</p>
              </div>
              <ArrowUpRight size={17} className="ml-auto text-slate-300 transition group-hover:text-[#397461]" />
            </Link>
            <Link
              to={`/${admin.type}/products`}
              className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-[#397461]/20 hover:bg-[#eff8f3]"
            >
              <div className="grid size-11 place-items-center rounded-xl bg-[#173c32] text-[#c9f560]">
                <Package size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Mahsulotlar</p>
                <p className="mt-1 text-xs text-slate-400">Tasdiqlash va moderatsiya</p>
              </div>
              <ArrowUpRight size={17} className="ml-auto text-slate-300 transition group-hover:text-[#397461]" />
            </Link>
            <Link
              to={`/${admin.type}/xaridorlar`}
              className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-[#397461]/20 hover:bg-[#eff8f3]"
            >
              <div className="grid size-11 place-items-center rounded-xl bg-[#173c32] text-[#c9f560]">
                <Store size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Xaridorlar</p>
                <p className="mt-1 text-xs text-slate-400">Ro‘yxat va bloklash</p>
              </div>
              <ArrowUpRight size={17} className="ml-auto text-slate-300 transition group-hover:text-[#397461]" />
            </Link>
            <Link
              to={`/${admin.type}/dostavka`}
              className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-[#397461]/20 hover:bg-[#eff8f3]"
            >
              <div className="grid size-11 place-items-center rounded-xl bg-[#173c32] text-[#c9f560]">
                <Truck size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Dostavka kompaniyalari</p>
                <p className="mt-1 text-xs text-slate-400">Yetkazib berish CRUD</p>
              </div>
              <ArrowUpRight size={17} className="ml-auto text-slate-300 transition group-hover:text-[#397461]" />
            </Link>
            <Link
              to={`/${admin.type}/orders`}
              className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-[#397461]/20 hover:bg-[#eff8f3]"
            >
              <div className="grid size-11 place-items-center rounded-xl bg-[#173c32] text-[#c9f560]">
                <ShoppingBag size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Buyurtmalar</p>
                <p className="mt-1 text-xs text-slate-400">Holat va kafolat nazorati</p>
              </div>
              <ArrowUpRight size={17} className="ml-auto text-slate-300 transition group-hover:text-[#397461]" />
            </Link>
            <Link
              to={`/${admin.type}/commissions`}
              className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-[#397461]/20 hover:bg-[#eff8f3]"
            >
              <div className="grid size-11 place-items-center rounded-xl bg-[#173c32] text-[#c9f560]">
                <Percent size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Komissiyalar</p>
                <p className="mt-1 text-xs text-slate-400">To‘lovlarni tasdiqlash</p>
              </div>
              <ArrowUpRight size={17} className="ml-auto text-slate-300 transition group-hover:text-[#397461]" />
            </Link>
            {admin.type === 'general' && (
              <Link
                to="/general/settings"
                className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-[#397461]/20 hover:bg-[#eff8f3]"
              >
                <div className="grid size-11 place-items-center rounded-xl bg-[#173c32] text-[#c9f560]">
                  <Settings size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Platforma sozlamalari</p>
                  <p className="mt-1 text-xs text-slate-400">Komissiya va promo</p>
                </div>
                <ArrowUpRight size={17} className="ml-auto text-slate-300 transition group-hover:text-[#397461]" />
              </Link>
            )}
            <Link
              to={`/${admin.type}/profile`}
              className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-[#397461]/20 hover:bg-[#eff8f3]"
            >
              <div className="grid size-11 place-items-center rounded-xl bg-[#dff6b0] text-[#173c32]">
                <UserRoundCheck size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Profilni yangilash</p>
                <p className="mt-1 text-xs text-slate-400">Shaxsiy ma’lumotlar va parol</p>
              </div>
              <ArrowUpRight size={17} className="ml-auto text-slate-300 transition group-hover:text-[#397461]" />
            </Link>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <h3 className="font-bold text-slate-900">Hisob ma’lumotlari</h3>
          <div className="mt-6 space-y-5">
            <InfoRow label="Foydalanuvchi" value={`@${admin.username}`} />
            <InfoRow label="Telefon" value={admin.phone} />
            <InfoRow label="Ruxsat darajasi" value={admin.type} capitalize />
          </div>
        </article>
      </section>
    </div>
  )
}

function InfoRow({ label, value, capitalize = false }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-sm font-semibold text-slate-700 ${capitalize ? 'capitalize' : ''}`}>{value}</span>
    </div>
  )
}
