import apiClient from './apiClient'
import type { ApiEnvelope } from '../types/api'
import type { AuthoritySummary } from '../types/authority'
import { extractResponseData, extractResponseMessage } from '../utils/apiResponse'

type UnknownObject = Record<string, unknown>

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

const pickStringField = (source: UnknownObject, keys: string[]): string | null => {
  for (const key of keys) {
    const value = toNonEmptyString(source[key])

    if (value) {
      return value
    }
  }

  return null
}

const normalizeAuthority = (raw: unknown): AuthoritySummary | null => {
  if (typeof raw === 'string') {
    const value = toNonEmptyString(raw)

    if (!value) {
      return null
    }

    return {
      id: value,
      name: value,
    }
  }

  if (!isObject(raw)) {
    return null
  }

  const source = raw as UnknownObject

  const id = pickStringField(source, [
    'id',
    '_id',
    'authorityId',
    'authority_id',
    'authorityCode',
    'authority_code',
    'code',
  ])

  const name =
    pickStringField(source, [
      'name',
      'displayName',
      'display_name',
      'nameAr',
      'authorityName',
      'authority_name',
      'label',
      'labelAr',
    ]) ??
    id

  if (!id || !name) {
    return null
  }

  return {
    id,
    name,
  }
}

const extractAuthoritiesPayload = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload
  }

  if (!isObject(payload)) {
    return []
  }

  const container = payload as UnknownObject
  const candidates: unknown[] = [
    container.authorities,
    container.items,
    container.results,
    container.data,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
    }

    if (isObject(candidate)) {
      const nested = (candidate as UnknownObject).authorities

      if (Array.isArray(nested)) {
        return nested
      }
    }
  }

  return []
}

const listAuthorities = async (): Promise<AuthoritySummary[]> => {
  const response = await apiClient.get<ApiEnvelope<unknown> | unknown>('/users/authorities')
  const payload = extractResponseData<unknown>(response.data)

  if (payload === null) {
    const message = extractResponseMessage(response.data)

    if (message) {
      throw new Error(message)
    }
  }

  const rawList = extractAuthoritiesPayload(payload ?? response.data)
  const deduped = new Map<string, AuthoritySummary>()

  for (const rawAuthority of rawList) {
    const normalized = normalizeAuthority(rawAuthority)

    if (!normalized || deduped.has(normalized.id)) {
      continue
    }

    deduped.set(normalized.id, normalized)
  }

  return Array.from(deduped.values())
}

const authorityService = {
  listAuthorities,
}

export default authorityService
