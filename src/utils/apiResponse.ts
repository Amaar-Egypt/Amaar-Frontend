import { AxiosError } from 'axios'
import type { ApiValidationErrorItem } from '../types/api'

type UnknownRecord = Record<string, unknown>

const isObject = (value: unknown): value is UnknownRecord => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const isValidationErrorItem = (value: unknown): value is ApiValidationErrorItem => {
  return (
    isObject(value) &&
    typeof value.field === 'string' &&
    typeof value.message === 'string'
  )
}

const getValidationErrorDetails = (errors: unknown): string | null => {
  if (!Array.isArray(errors)) {
    return null
  }

  const items = errors.filter(isValidationErrorItem)

  if (items.length === 0) {
    return null
  }

  const details = items
    .slice(0, 3)
    .map((item) => `${item.field}: ${item.message}`)
    .join(' | ')

  return details || null
}

export const extractResponseMessage = (payload: unknown): string | null => {
  if (!isObject(payload)) {
    return null
  }

  return toNonEmptyString(payload.message)
}

export const extractResponseData = <T>(payload: unknown): T | null => {
  if (isObject(payload) && Object.prototype.hasOwnProperty.call(payload, 'success')) {
    if (payload.success !== true) {
      return null
    }

    if (!Object.prototype.hasOwnProperty.call(payload, 'data')) {
      return null
    }

    return (payload.data as T | undefined) ?? null
  }

  return (payload as T | undefined) ?? null
}

export const extractResponsePagination = <T>(payload: unknown): T | null => {
  if (!isObject(payload)) {
    return null
  }

  if (!Object.prototype.hasOwnProperty.call(payload, 'pagination')) {
    return null
  }

  return (payload.pagination as T | undefined) ?? null
}

export const extractErrorMessageFromPayload = (
  payload: unknown,
  fallback: string,
): string => {
  if (!isObject(payload)) {
    return fallback
  }

  const message = toNonEmptyString(payload.message)
  const details = getValidationErrorDetails(payload.errors)

  if (message && details) {
    return `${message} (${details})`
  }

  return message ?? details ?? fallback
}

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof AxiosError) {
    return extractErrorMessageFromPayload(error.response?.data, fallback)
  }

  if (error instanceof Error) {
    const message = error.message.trim()
    return message || fallback
  }

  return fallback
}
