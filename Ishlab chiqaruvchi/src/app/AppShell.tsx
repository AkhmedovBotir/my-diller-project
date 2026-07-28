import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Percent,
  ShoppingBag,
  UserRound,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../modules/auth/AuthContext'
import { NotifSoundToggle } from '../shared/NotifSoundToggle'
import { isProfileComplete } from '../shared/profileComplete'
import { NotificationsBell } from './NotificationsBell'

export function AppShell() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  if (!user) return null

  const title = pathname.endsWith('/profile')
    ? 'Mening profilim'
    : pathname.startsWith('/products')
      ? 'Mahsulotlar'
      : pathname.startsWith('/orders')
        ? 'Buyurtmalar'
        : pathname.startsWith('/commissions')
          ? 'Komissiya'
          : 'Boshqaruv paneli'

  const links = [
    { to: '/', label: 'Asosiy', icon: LayoutDashboard, end: true },
    { to: '/products', label: 'Mahsulotlar', icon: Package, end: false },
    { to: '/orders', label: 'Buyurtmalar', icon: ShoppingBag, end: false },
    { to: '/commissions', label: 'Komissiya', icon: Percent, end: false },
    { to: '/profile', label: 'Profil', icon: UserRound, end: false },
  ]

  const sidebar = (
    <div className="flex h-full flex-col bg-[#102d26] p-4 text-white">
      <div className="flex h-16 items-center gap-3 px-3">
        <div className="grid size-10 place-items-center rounded-2xl bg-[#c9f560] text-[#173c32]">
          <Building2 size={22} strokeWidth={2.5} />
        </div>
        <div>
          <p className="font-bold tracking-tight">My Diller</p>
          <p className="text-[11px] text-emerald-100/45">ISHLAB CHIQARUVCHI</p>
        </div>
      </div>

      <p className="mb-3 mt-8 px-3 text-[10px] font-bold tracking-[0.16em] text-emerald-100/35">
        ASOSIY MENYU
      </p>
      <nav className="space-y-1.5">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-emerald-50/55 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="active-nav"
                    className="absolute -left-4 h-7 w-1 rounded-r-full bg-[#c9f560]"
                  />
                )}
                <Icon size={19} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f5f7f6] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-3 z-10 rounded-lg p-2 text-emerald-50/60 hover:bg-white/10"
              >
                <X size={20} />
              </button>
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200/70 bg-[#f5f7f6]/90 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-[-0.025em] sm:text-2xl">{title}</h1>
              <p className="hidden text-xs text-slate-400 sm:block">Ishlab chiqaruvchi kabineti</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotifSoundToggle />
            <NotificationsBell />
            <div className="relative">
              <button
                onClick={() => setProfileOpen((current) => !current)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-2 pl-2 pr-3 transition hover:border-slate-300"
              >
                <div className="grid size-7 place-items-center rounded-lg bg-[#dff6b0] text-xs font-bold text-[#173c32]">
                  {user.first_name.charAt(0)}
                </div>
                <span className="hidden max-w-28 truncate text-xs font-bold text-slate-700 sm:block">
                  {user.first_name}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <>
                    <button
                      aria-label="Profil menyusini yopish"
                      onClick={() => setProfileOpen(false)}
                      className="fixed inset-0 z-30 cursor-default"
                    />
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.16 }}
                      className="absolute right-0 top-[calc(100%+10px)] z-40 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10"
                    >
                      <div className="border-b border-slate-100 px-3 py-3">
                        <p className="truncate text-sm font-bold text-slate-800">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-400">{user.company_name}</p>
                        <span className="mt-2 inline-flex rounded-full bg-[#eff8f3] px-2 py-1 text-[10px] font-bold text-[#397461]">
                          Ishlab chiqaruvchi
                        </span>
                      </div>
                      <NavLink
                        to="/profile"
                        role="menuitem"
                        onClick={() => setProfileOpen(false)}
                        className={({ isActive }) =>
                          `mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                            isActive
                              ? 'bg-[#eff8f3] text-[#397461]'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`
                        }
                      >
                        <UserRound size={17} />
                        Mening profilim
                      </NavLink>
                      <button
                        role="menuitem"
                        onClick={() => {
                          setProfileOpen(false)
                          logout()
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-50"
                      >
                        <LogOut size={17} />
                        Tizimdan chiqish
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1480px] p-5 sm:p-8">
          {!isProfileComplete(user) && (
            <NavLink
              to="/profile"
              className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm font-semibold text-amber-800 transition hover:border-amber-300"
            >
              <AlertTriangle size={18} className="shrink-0" />
              Mahsulot qo‘shishdan oldin profilni 100% to‘ldiring
            </NavLink>
          )}
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
