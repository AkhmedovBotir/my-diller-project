import { NavLink, Outlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutGrid,
  Package,
  ShoppingBag,
  UserRound,
  UsersRound,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { AuthModal } from '../shared/AuthModal'
import { useAuth } from '../shared/AuthContext'
import { SnackbarHost } from '../shared/Snackbar'
import { APP_NAME } from '../shared/config'

const NAV = [
  { to: '/', label: 'Yig‘imlar', icon: UsersRound, end: true },
  { to: '/katalog', label: 'Katalog', icon: LayoutGrid },
  { to: '/savat', label: 'Savat', icon: ShoppingBag },
  { to: '/buyurtmalar', label: 'Buyurtmalar', icon: Package },
  { to: '/profil', label: 'Profil', icon: UserRound },
]

export function AppShell() {
  const { cartCount, authOpen, closeAuth, authIntent } = useAuth()

  return (
    <div className="min-h-screen bg-[#eef3ef] text-[#102d26]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[#c9f560]/25 blur-3xl" />
        <div className="absolute -right-16 top-40 h-80 w-80 rounded-full bg-[#102d26]/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-[#102d26]/8 bg-[#f7faf8]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#102d26] text-sm font-black text-[#c9f560]">
              BX
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#5f7a70]">
                My Diller
              </p>
              <h1 className="text-base font-bold leading-none sm:text-lg">{APP_NAME}</h1>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `relative flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-[#102d26] text-[#c9f560]'
                      : 'text-[#3d5c52] hover:bg-white/70'
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.to === '/savat' && cartCount > 0 ? (
                  <span className="ml-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#c9f560] px-1 text-[10px] font-bold text-[#102d26]">
                    {cartCount}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 pb-28 pt-4 sm:px-6 sm:pb-10 sm:pt-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#102d26]/10 bg-[#f7faf8]/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-0.5 px-1.5 py-1.5 sm:gap-1 sm:px-2 sm:py-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-0.5 rounded-xl px-0.5 py-1.5 text-[9px] font-semibold sm:gap-1 sm:rounded-2xl sm:px-1 sm:py-2 sm:text-[10px] ${
                  isActive ? 'bg-[#102d26] text-[#c9f560]' : 'text-[#5f7a70]'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
              {item.to === '/savat' && cartCount > 0 ? (
                <span className="absolute right-2 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#c9f560] px-1 text-[9px] font-bold text-[#102d26]">
                  {cartCount}
                </span>
              ) : null}
            </NavLink>
          ))}
        </div>
      </nav>

      <AuthModal
        open={authOpen}
        onClose={closeAuth}
        onDone={(customer) => {
          authIntent?.(customer)
        }}
      />
      <SnackbarHost />
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 sm:mb-7">
      <div>
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-bold tracking-tight text-[#102d26] sm:text-3xl"
        >
          {title}
        </motion.h2>
        {subtitle ? (
          <p className="mt-1 max-w-xl text-sm leading-6 text-[#5f7a70]">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-[#102d26]/15 bg-white/60 px-6 py-16 text-center">
      <p className="text-lg font-bold text-[#102d26]">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#5f7a70]">{text}</p>
    </div>
  )
}

export function FadeIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      {children}
    </motion.div>
  )
}

export { AnimatePresence, motion }
