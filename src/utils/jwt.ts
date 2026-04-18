import type { AuthUser, UserRole } from '../types/auth'

interface JwtPayload {
  sub?: string
  id?: string
  name?: string
  email?: string
  role?: UserRole
  authorityId?: string
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
  if (!payload?.role) {
    return null
  }

  const id = payload.id ?? payload.sub

  if (!id || !payload.email || !payload.name) {
    return null
  }

  return {
    id,
    name: payload.name,
    email: payload.email,
    role: payload.role,
    authorityId: payload.authorityId,
  }
}
