import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiEnvelope } from '../types/api'
import {
  extractResponseData,
  extractResponseMessage,
} from '../utils/apiResponse'
import {
  applyRefreshedTokens,
  getAccessToken,
  getRefreshToken,
  notifyAuthFailure,
} from './authTokenManager'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  'https://amaarbackend-production.up.railway.app'

export const SKIP_AUTH_REFRESH_HEADER = 'X-Skip-Auth-Refresh'

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

interface RefreshResponseData {
  accessToken?: string
  refreshToken?: string
  token?: string
}

interface RefreshedTokens {
  accessToken: string
  refreshToken?: string | null
}

type UnknownObject = Record<string, unknown>

const AUTH_ENDPOINTS_WITHOUT_REFRESH = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
]

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

let refreshPromise: Promise<RefreshedTokens> | null = null

const isObject = (value: unknown): value is UnknownObject => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const readHeader = (headers: unknown, key: string): string | null => {
  if (!headers) {
    return null
  }

  const hasGetter =
    typeof headers === 'object' &&
    headers !== null &&
    typeof (headers as { get?: (name: string) => unknown }).get === 'function'

  if (hasGetter) {
    const value = (headers as { get: (name: string) => unknown }).get(key)

    if (Array.isArray(value)) {
      return toNonEmptyString(value[0])
    }

    return toNonEmptyString(value)
  }

  if (!isObject(headers)) {
    return null
  }

  return (
    toNonEmptyString(headers[key]) ??
    toNonEmptyString(headers[key.toLowerCase()])
  )
}

const shouldSkipAuthRefresh = (requestConfig: RetryableRequestConfig) => {
  const skipRefreshHeader = readHeader(requestConfig.headers, SKIP_AUTH_REFRESH_HEADER)

  if (skipRefreshHeader?.toLowerCase() === 'true') {
    return true
  }

  const requestUrl = requestConfig.url ?? ''
  return AUTH_ENDPOINTS_WITHOUT_REFRESH.some((endpoint) => requestUrl.includes(endpoint))
}

const extractRefreshTokens = (payload: unknown): RefreshedTokens | null => {
  const envelopeData = extractResponseData<RefreshResponseData>(payload)
  const fallbackData = isObject(payload) ? (payload as RefreshResponseData) : null
  const data = envelopeData ?? fallbackData

  const accessToken =
    toNonEmptyString(data?.accessToken) ??
    toNonEmptyString(data?.token)

  if (!accessToken) {
    return null
  }

  const refreshToken = toNonEmptyString(data?.refreshToken)

  return {
    accessToken,
    refreshToken,
  }
}

const requestTokenRefresh = async (): Promise<RefreshedTokens> => {
  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    throw new Error('انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.')
  }

  const response = await refreshClient.post<ApiEnvelope<RefreshResponseData> | RefreshResponseData>(
    '/auth/refresh',
    { refreshToken },
  )

  const refreshedTokens = extractRefreshTokens(response.data)

  if (!refreshedTokens) {
    throw new Error(
      extractResponseMessage(response.data) ?? 'تعذر تحديث جلسة الدخول.',
    )
  }

  return refreshedTokens
}

const queueRefreshRequest = () => {
  if (!refreshPromise) {
    refreshPromise = requestTokenRefresh().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()

  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined
    const responseStatus = error.response?.status

    if (!originalRequest || responseStatus !== 401) {
      return Promise.reject(error)
    }

    if (shouldSkipAuthRefresh(originalRequest)) {
      return Promise.reject(error)
    }

    if (originalRequest._retry) {
      notifyAuthFailure()
      return Promise.reject(error)
    }

    if (!getRefreshToken()) {
      notifyAuthFailure()
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const refreshedTokens = await queueRefreshRequest()

      applyRefreshedTokens({
        accessToken: refreshedTokens.accessToken,
        refreshToken: refreshedTokens.refreshToken,
      })

      originalRequest.headers = originalRequest.headers ?? {}
      originalRequest.headers.Authorization = `Bearer ${refreshedTokens.accessToken}`

      return apiClient(originalRequest)
    } catch (refreshError) {
      notifyAuthFailure()
      return Promise.reject(refreshError)
    }
  },
)

export default apiClient
