import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { useAuth } from './modules/auth/AuthContext'
import { LoginPage } from './modules/auth/LoginPage'
import { RegisterPage } from './modules/auth/RegisterPage'
import { ForgotPasswordPage } from './modules/auth/ForgotPasswordPage'
import { CartPage } from './modules/cart/CartPage'
import { CatalogPage } from './modules/catalog/CatalogPage'
import { ProductDetailPage } from './modules/catalog/ProductDetailPage'
import { DashboardPage } from './modules/dashboard/DashboardPage'
import { NotificationsProvider } from './modules/notifications/NotificationsContext'
import { NotificationsPage } from './modules/notifications/NotificationsPage'
import { OrderDetailPage } from './modules/orders/OrderDetailPage'
import { OrdersPage } from './modules/orders/OrdersPage'
import { ProfilePage } from './modules/profile/ProfilePage'

function ProtectedArea() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen animate-pulse bg-[#f5f7f6]">
        <div className="fixed inset-y-0 left-0 hidden w-64 bg-[#102d26] p-7 lg:block">
          <div className="h-10 w-32 rounded-xl bg-white/10" />
          <div className="mt-14 h-3 w-20 rounded-full bg-white/10" />
          <div className="mt-5 h-11 rounded-xl bg-white/10" />
          <div className="mt-2 h-11 rounded-xl bg-white/5" />
        </div>
        <div className="lg:pl-64">
          <div className="flex h-20 items-center justify-between border-b border-slate-200 px-5 sm:px-8">
            <div className="space-y-2">
              <div className="h-5 w-44 rounded-full bg-slate-200" />
              <div className="h-2.5 w-32 rounded-full bg-slate-200/70" />
            </div>
            <div className="h-10 w-28 rounded-xl bg-slate-200" />
          </div>
          <div className="space-y-5 p-5 sm:p-8">
            <div className="h-52 rounded-[28px] bg-slate-200" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-36 rounded-2xl bg-white p-5">
                  <div className="size-10 rounded-xl bg-slate-200" />
                  <div className="mt-6 h-3 w-20 rounded-full bg-slate-200" />
                  <div className="mt-3 h-4 w-28 rounded-full bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return (
    <NotificationsProvider>
      <AppShell />
    </NotificationsProvider>
  )
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot" element={<ForgotPasswordPage />} />

      <Route path="/" element={<ProtectedArea />}>
        <Route index element={<DashboardPage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="catalog/:id" element={<ProductDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  )
}
