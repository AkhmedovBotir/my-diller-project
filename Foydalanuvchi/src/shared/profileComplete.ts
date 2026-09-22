import type { Xaridor } from './types'

/** Backend ProfileComplete bilan bir xil — UI server flagiga bog‘liq bo‘lmasin. */
export function isProfileComplete(user: Xaridor | null | undefined): boolean {
  if (!user) return false
  return (
    Boolean(user.shop_name?.trim()) &&
    Boolean(user.stir?.trim()) &&
    Boolean(user.bank_account?.trim()) &&
    Boolean(user.bank_name?.trim()) &&
    Boolean(user.mfo?.trim()) &&
    Boolean(user.mfy_id) &&
    Boolean(user.birth_date) &&
    Boolean(user.address?.trim()) &&
    Boolean(user.first_name?.trim()) &&
    Boolean(user.last_name?.trim()) &&
    Boolean(user.phone?.trim()) &&
    user.lat != null &&
    !Number.isNaN(Number(user.lat)) &&
    user.lng != null &&
    !Number.isNaN(Number(user.lng))
  )
}

export const isXaridorProfileComplete = isProfileComplete
