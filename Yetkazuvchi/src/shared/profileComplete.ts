import type { Dostavka } from './types'

/** Hudud (Viloyat → Tuman → MFY) to‘liq tanlanganmi. */
export function isProfileComplete(user: Dostavka | null | undefined): boolean {
  if (!user) return false
  return Boolean(user.mfy_id)
}
