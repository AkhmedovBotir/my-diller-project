import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { AuthProvider } from './shared/AuthContext'
import { GroupBuyDetailPage, GroupBuysPage } from './pages/GroupBuysPage'
import { CatalogPage } from './pages/CatalogPage'
import { CartPage } from './pages/CartPage'
import { OrdersPage } from './pages/OrdersPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { ProfilePage } from './pages/ProfilePage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<GroupBuysPage />} />
          <Route path="yigimlar" element={<GroupBuysPage />} />
          <Route path="yigimlar/:id" element={<GroupBuyDetailPage />} />
          <Route path="katalog" element={<CatalogPage />} />
          <Route path="katalog/:categoryId" element={<CatalogPage />} />
          <Route path="katalog/:categoryId/:subcategoryId" element={<CatalogPage />} />
          <Route path="savat" element={<CartPage />} />
          <Route path="buyurtmalar" element={<OrdersPage />} />
          <Route path="buyurtmalar/:id" element={<OrderDetailPage />} />
          <Route path="profil" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
