import type { AuthUser } from '../types/auth'
import {
  normalizeAuthorityId,
  normalizeUserRole,
} from './authNormalization'

interface JwtPayload {
  sub?: string
  id?: string
  userId?: string
  name?: string
  fullName?: string
  displayName?: string
  username?: string
  email?: string
  role?: string
  userRole?: string
  authorityId?: string
  authority_id?: string
}

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')

  try {
    return atob(padded)
  } catch {
    return null
  }
}

export const readJwtPayload = (token?: string): JwtPayload | null => {
  if (!token) {
    return null
  }

  const parts = token.split('.')
  if (parts.length < 2) {
    return null
  }

  const payloadJson = decodeBase64Url(parts[1])
  if (!payloadJson) {
    return null
  }

  try {
    return JSON.parse(payloadJson) as JwtPayload
  } catch {
    return null
  }
}

export const userFromTokenPayload = (token?: string): AuthUser | null => {
  const payload = readJwtPayload(token)
  if (!payload) {
    return null
  }

  const role = normalizeUserRole(payload.role ?? payload.userRole)
  const id = payload.id ?? payload.userId ?? payload.sub
  const name = payload.name ?? payload.fullName ?? payload.displayName ?? payload.username
  const authorityId = normalizeAuthorityId(payload.authorityId ?? payload.authority_id)

  if (!role || !id || !payload.email || !name) {
    return null
  }

  return {
    id,
    name,
    email: payload.email,
    role,
    authorityId,
  }
}
