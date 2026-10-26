import { ROLE_RANK } from './constants'

export const rankOf = (role) => ROLE_RANK[role] ?? 0
export const atLeast = (role, minRole) => rankOf(role) >= rankOf(minRole)

/** Mirrors the member-update rule in firestore.rules. */
export function canChangeRole(actorRole, targetRole, newRole) {
  if (!atLeast(actorRole, 'admin') || targetRole === 'owner' || newRole === 'owner') return false
  return rankOf(actorRole) > rankOf(targetRole) && rankOf(newRole) <= rankOf(actorRole)
}

export function canRemoveMember(actorRole, targetRole) {
  return atLeast(actorRole, 'admin') && rankOf(actorRole) > rankOf(targetRole)
}

export function rolesAssignableBy(actorRole) {
  return ['admin', 'staff', 'member'].filter((r) => rankOf(r) <= rankOf(actorRole))
}
