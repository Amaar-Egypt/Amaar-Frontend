import apiClient, { SKIP_AUTH_REFRESH_HEADER } from './apiClient'
import type { ApiEnvelope } from '../types/api'
import type { AuthUser } from '../types/auth'
import {
  extractResponseData,
  extractResponseMessage,
} from '../utils/apiResponse'
import { normalizeAuthUser } from '../utils/authNormalization'

type UnknownObject = Record<string, unknown>

const isObject = (value: unknown): value is UnknownObject => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isAuthDebugEnabled =
  import.meta.env.DEV || import.meta.env.VITE_DEBUG_AUTH === 'true'

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface RegisterResponse {
  user?: AuthUser
  accessToken?: string
  refreshToken?: string
  message?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user?: AuthUser
  accessToken?: string
  refreshToken?: string
  token?: string
  message?: string
}

export interface RefreshTokenResponse {
  accessToken?: string
  refreshToken?: string
  token?: string
  message?: string
}

export interface LogoutResponse {
  message: string
}

export interface ProfileResponse extends AuthUser {
  reports?: unknown[]
  totalPoints?: number
  createdAt?: string
  updatedAt?: string
}

const register = async (data: RegisterRequest): Promise<RegisterResponse> => {
  const payload = {
    name: data.name.trim(),
    email: data.email.trim(),
    password: data.password,
  }

  const response = await apiClient.post<ApiEnvelope<RegisterResponse>>('/auth/register', payload)
  const envelopeData = extractResponseData<RegisterResponse>(response.data)
  const normalizedUser = normalizeAuthUser(envelopeData?.user ?? envelopeData)

  return {
    ...(envelopeData ?? {}),
    user: normalizedUser ?? envelopeData?.user,
    message:
      extractResponseMessage(response.data) ?? envelopeData?.message ?? undefined,
  }
}

const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const payload: LoginRequest = {
    email: data.email.trim(),
    password: data.password,
  }

  const headers = {
    'Content-Type': 'application/json',
  }

  const response = await apiClient.post<ApiEnvelope<LoginResponse>>('/auth/login', payload, {
    headers,
  })

  const envelopeData = extractResponseData<LoginResponse>(response.data)
  const normalizedUser = normalizeAuthUser(envelopeData?.user ?? envelopeData)

  return {
    ...(envelopeData ?? {}),
    user: normalizedUser ?? envelopeData?.user,
    message:
      extractResponseMessage(response.data) ?? envelopeData?.message ?? undefined,
  }
}

const refresh = async (refreshToken: string): Promise<RefreshTokenResponse> => {
  const normalizedRefreshToken = refreshToken.trim()

  const response = await apiClient.post<ApiEnvelope<RefreshTokenResponse> | RefreshTokenResponse>(
    '/auth/refresh',
    {
      refreshToken: normalizedRefreshToken,
    },
    {
      headers: {
        [SKIP_AUTH_REFRESH_HEADER]: 'true',
      },
    },
  )

  const envelopeData = extractResponseData<RefreshTokenResponse>(response.data)
  const accessToken = envelopeData?.accessToken ?? envelopeData?.token

  if (!accessToken) {
    throw new Error(extractResponseMessage(response.data) ?? 'تعذر تحديث الجلسة.')
  }

  return {
    ...(envelopeData ?? {}),
    accessToken,
    message:
      extractResponseMessage(response.data) ?? envelopeData?.message ?? undefined,
  }
}

const logout = async (refreshToken?: string): Promise<LogoutResponse> => {
  const payload = refreshToken?.trim()
    ? { refreshToken: refreshToken.trim() }
    : undefined

  const response = await apiClient.post<ApiEnvelope<never>>('/auth/logout', payload, {
    headers: {
      [SKIP_AUTH_REFRESH_HEADER]: 'true',
    },
  })

  return {
    message: extractResponseMessage(response.data) ?? 'تم تسجيل الخروج بنجاح',
  }
}

const getCurrentUserProfile = async (): Promise<ProfileResponse> => {
  const response = await apiClient.get<ApiEnvelope<ProfileResponse> | ProfileResponse>('/users/me')
  const profilePayload = extractResponseData<unknown>(response.data)
  const normalizedUser = normalizeAuthUser(profilePayload)

  if (isAuthDebugEnabled) {
    console.log('[authService] /users/me debug', {
      profilePayload,
      normalizedUser,
    })
  }

  if (normalizedUser) {
    const profileObject = isObject(profilePayload) ? profilePayload : {}

    return {
      ...profileObject,
      ...normalizedUser,
    } as ProfileResponse
  }

  throw new Error(
    extractResponseMessage(response.data) ?? 'تعذر تحميل الملف الشخصي للمستخدم.',
  )
}

const authService = {
  register,
  login,
  refresh,
  logout,
  getCurrentUserProfile,
}

export default authService
