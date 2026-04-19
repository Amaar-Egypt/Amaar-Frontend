import type { AuthUser, UserRole } from '../types/auth'

type UnknownObject = Record<string, unknown>

const ADMIN_ROLE_ALIASES = new Set([
  'admin',
  'system_admin',
  'system-admin',
  'systemadmin',
  'super_admin',
  'super-admin',
  'superadmin',
])

const AUTHORITY_ROLE_ALIASES = new Set([
  'authority',
  'authority_admin',
  'authority-admin',
  'authorityadmin',
  'authority_user',
  'authority-user',
  'authorityuser',
  'agency',
])

const CITIZEN_ROLE_ALIASES = new Set([
  'citizen',
  'user',
  'public',
  'reporter',
])

const isObject = (value: unknown): value is UnknownObject => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return null
}

const readFirstValue = (source: UnknownObject, keys: string[]) => {
  for (const key of keys) {
    if (key in source) {
      return source[key]
    }
  }

  return null
}

const readFirstString = (source: UnknownObject, keys: string[]) => {
  for (const key of keys) {
    const value = toNonEmptyString(source[key])

    if (value) {
      return value
    }
  }

  return null
}

export const normalizeUserRole = (roleValue: unknown): UserRole | null => {
  const normalizedRole = toNonEmptyString(roleValue)?.toLowerCase()

  if (!normalizedRole) {
    return null
  }

  if (ADMIN_ROLE_ALIASES.has(normalizedRole)) {
    return 'admin'
  }

  if (AUTHORITY_ROLE_ALIASES.has(normalizedRole)) {
    return 'authority'
  }

  if (CITIZEN_ROLE_ALIASES.has(normalizedRole)) {
    return 'citizen'
  }

  return null
}

export const normalizeAuthorityId = (authorityValue: unknown): string | null => {
  const directStringValue = toNonEmptyString(authorityValue)

  if (directStringValue) {
    return directStringValue
  }

  if (!isObject(authorityValue)) {
    return null
  }

  const directField = readFirstString(authorityValue, [
    'authorityId',
    'authority_id',
    'authorityID',
    'authority',
    'authorityName',
    'authority_name',
    'authorityCode',
    'authority_code',
    'agencyId',
    'agency_id',
    'assignedAuthorityId',
    'assigned_authority_id',
    'assignedAuth',
  ])

  if (directField) {
    return directField
  }

  const nestedAuthority = readFirstValue(authorityValue, [
    'authority',
    'agency',
    'assignedAuthority',
    'authorityInfo',
    'authority_info',
  ])

  if (Array.isArray(nestedAuthority)) {
    for (const authorityEntry of nestedAuthority) {
      const normalizedEntry = normalizeAuthorityId(authorityEntry)

      if (normalizedEntry) {
        return normalizedEntry
      }
    }
  }

  const nestedAuthorityIds = readFirstValue(authorityValue, [
    'authorityIds',
    'authority_ids',
    'agencies',
  ])

  if (Array.isArray(nestedAuthorityIds)) {
    for (const authorityEntry of nestedAuthorityIds) {
      const normalizedEntry = normalizeAuthorityId(authorityEntry)

      if (normalizedEntry) {
        return normalizedEntry
      }
    }
  }

  if (isObject(nestedAuthority)) {
    return readFirstString(nestedAuthority, [
      'id',
      '_id',
      'authorityId',
      'authority_id',
      'authorityID',
      'authorityCode',
      'authority_code',
      'name',
      'displayName',
      'display_name',
    ])
  }

  return null
}

export const normalizeAuthUser = (rawUser: unknown): AuthUser | null => {
  if (!isObject(rawUser)) {
    return null
  }

  const role = normalizeUserRole(
    readFirstValue(rawUser, ['role', 'userRole', 'user_role', 'accountRole', 'account_role']),
  )

  const id = readFirstString(rawUser, ['id', '_id', 'userId', 'user_id', 'sub'])
  const name = readFirstString(rawUser, [
    'name',
    'fullName',
    'full_name',
    'displayName',
    'display_name',
    'username',
  ])
  const email = readFirstString(rawUser, ['email', 'mail'])

  if (!role || !id || !name || !email) {
    return null
  }

  const authorityId = normalizeAuthorityId(rawUser)

  return {
    id,
    name,
    email,
    role,
    authorityId,
  }
}
