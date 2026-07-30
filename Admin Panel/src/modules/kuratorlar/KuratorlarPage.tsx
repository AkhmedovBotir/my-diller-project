import { AdminsPage } from '../admins/AdminsPage'

export function KuratorlarPage() {
  return (
    <AdminsPage
      typeFilter="kurator"
      title="Kuratorlar"
      subtitle="Hududiy kuratorlarni boshqaring va komissiya to'lovlarini tasdiqlang"
      hideTypeFilter
    />
  )
}
