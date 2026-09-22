import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { AdminsPage } from './modules/admins/AdminsPage'
import { useAuth } from './modules/auth/AuthContext'
import { LoginPage } from './modules/auth/LoginPage'
import { ForgotPasswordPage } from './modules/auth/ForgotPasswordPage'
import { BirgaXaridPage, BirgaXaridIndexRedirect, BirgaCategoriesPage, BirgaProductsPage, BirgaCollectionsPage, BirgaOrdersPage, BirgaCustomersPage } from './modules/birgaXarid/BirgaXaridPage'
import {
  BirgaMoliyaPage,
  BirgaMoliyaSettingsPage,
  BirgaMoliyaStatsPage,
  BirgaMoliyaCourierPage,
  BirgaMoliyaKuratorPage,
} from './modules/birgaXarid/BirgaMoliyaPage'
import { CategoriesPage } from './modules/categories/CategoriesPage'
import { CommissionsPage } from './modules/commissions/CommissionsPage'
import { DashboardPage } from './modules/dashboard/DashboardPage'
import { DebtsPage } from './modules/debts/DebtsPage'
import { DostavkaPage } from './modules/dostavka/DostavkaPage'
import { IshlabchiqaruvchilarPage } from './modules/ishlabchiqaruvchilar/IshlabchiqaruvchilarPage'
import { KuratorlarPage } from './modules/kuratorlar/KuratorlarPage'
import { KuratorTolovSorovlariPage } from './modules/kuratorTolovSorovlari/KuratorTolovSorovlariPage'
import { OrderDetailPage } from './modules/orders/OrderDetailPage'
import { OrdersPage } from './modules/orders/OrdersPage'
import { ProductsPage } from './modules/products/ProductsPage'
import { ProfilePage } from './modules/profile/ProfilePage'
import { RegionsPage } from './modules/regions/RegionsPage'
import { PlatformSettingsPage } from './modules/settings/PlatformSettingsPage'
import { XaridorlarPage } from './modules/xaridorlar/XaridorlarPage'
import type { AdminRole } from './shared/types'

function ProtectedArea({ role }: { role: AdminRole }) {
  const { admin, loading } = useAuth()

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

  if (!admin) return <Navigate to="/login" replace />
  if (admin.type !== role) return <Navigate to={`/${admin.type}`} replace />
  return <AppShell />
}

export default function App() {
  const { admin } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot" element={<ForgotPasswordPage />} />

      <Route path="/general" element={<ProtectedArea role="general" />}>
        <Route index element={<DashboardPage />} />
        <Route path="admins" element={<AdminsPage />} />
        <Route path="kuratorlar" element={<KuratorlarPage />} />
        <Route path="ishlabchiqaruvchilar" element={<IshlabchiqaruvchilarPage />} />
        <Route path="xaridorlar" element={<XaridorlarPage />} />
        <Route path="dostavka" element={<DostavkaPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="regions" element={<RegionsPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="commissions" element={<CommissionsPage />} />
        <Route path="kurator-tolovlari" element={<KuratorTolovSorovlariPage />} />
        <Route path="debts" element={<DebtsPage />} />
        <Route path="birga-xarid" element={<BirgaXaridPage />}>
          <Route index element={<BirgaXaridIndexRedirect />} />
          <Route path="kategoriyalar" element={<BirgaCategoriesPage />} />
          <Route path="mahsulotlar" element={<BirgaProductsPage />} />
          <Route path="yigimlar" element={<BirgaCollectionsPage />} />
          <Route path="buyurtmalar" element={<BirgaOrdersPage />} />
          <Route path="mijozlar" element={<BirgaCustomersPage />} />
          <Route path="moliya" element={<BirgaMoliyaPage />}>
            <Route index element={<Navigate to="sozlamalar" replace />} />
            <Route path="sozlamalar" element={<BirgaMoliyaSettingsPage />} />
            <Route path="statistika" element={<BirgaMoliyaStatsPage />} />
            <Route path="kuryer" element={<BirgaMoliyaCourierPage />} />
            <Route path="kurator" element={<BirgaMoliyaKuratorPage />} />
          </Route>
        </Route>
        <Route path="settings" element={<PlatformSettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="/admin" element={<ProtectedArea role="admin" />}>
        <Route index element={<DashboardPage />} />
        <Route path="admins" element={<AdminsPage readOnly />} />
        <Route path="ishlabchiqaruvchilar" element={<IshlabchiqaruvchilarPage />} />
        <Route path="xaridorlar" element={<XaridorlarPage />} />
        <Route path="dostavka" element={<DostavkaPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="commissions" element={<CommissionsPage />} />
        <Route path="debts" element={<DebtsPage />} />
        <Route path="birga-xarid" element={<BirgaXaridPage />}>
          <Route index element={<BirgaXaridIndexRedirect />} />
          <Route path="kategoriyalar" element={<BirgaCategoriesPage />} />
          <Route path="mahsulotlar" element={<BirgaProductsPage />} />
          <Route path="yigimlar" element={<BirgaCollectionsPage />} />
          <Route path="buyurtmalar" element={<BirgaOrdersPage />} />
          <Route path="mijozlar" element={<BirgaCustomersPage />} />
          <Route path="moliya" element={<BirgaMoliyaPage />}>
            <Route index element={<Navigate to="sozlamalar" replace />} />
            <Route path="sozlamalar" element={<BirgaMoliyaSettingsPage />} />
            <Route path="statistika" element={<BirgaMoliyaStatsPage />} />
            <Route path="kuryer" element={<BirgaMoliyaCourierPage />} />
            <Route path="kurator" element={<BirgaMoliyaKuratorPage />} />
          </Route>
        </Route>
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="/kurator" element={<ProtectedArea role="kurator" />}>
        <Route index element={<DashboardPage />} />
        <Route path="admins" element={<AdminsPage readOnly />} />
        <Route path="ishlabchiqaruvchilar" element={<IshlabchiqaruvchilarPage />} />
        <Route path="xaridorlar" element={<XaridorlarPage />} />
        <Route path="dostavka" element={<DostavkaPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="commissions" element={<CommissionsPage />} />
        <Route path="debts" element={<DebtsPage />} />
        <Route path="birga-xarid" element={<BirgaXaridPage />}>
          <Route index element={<BirgaXaridIndexRedirect />} />
          <Route path="kategoriyalar" element={<BirgaCategoriesPage />} />
          <Route path="mahsulotlar" element={<BirgaProductsPage />} />
          <Route path="yigimlar" element={<BirgaCollectionsPage />} />
          <Route path="buyurtmalar" element={<BirgaOrdersPage />} />
          <Route path="mijozlar" element={<BirgaCustomersPage />} />
        </Route>
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to={admin ? `/${admin.type}` : '/login'} replace />} />
    </Routes>
  )
}
