import apiClient from './apiClient'

export interface RegisterRequest {
  name: string
  email: string
  password: string
  confirmPassword: string
  phone: string
}

export interface RegisterResponse {
  message?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  message?: string
  token?: string
  accessToken?: string
  data?: {
    token?: string
    accessToken?: string
  }
}

const isAuthDebugEnabled =
  import.meta.env.DEV || import.meta.env.VITE_DEBUG_AUTH === 'true'

const debugAuthLog = (label: string, details: unknown) => {
  if (!isAuthDebugEnabled) {
    return
  }

  console.log(`[authService] ${label}`, details)
}

const register = async (data: RegisterRequest): Promise<RegisterResponse> => {
  const response = await apiClient.post<RegisterResponse>('/auth/register', data)
  return response.data
}

const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const payload: LoginRequest = {
    email: data.email.trim(),
    password: data.password,
  }

  const headers = {
    'Content-Type': 'application/json',
  }

  debugAuthLog('LOGIN DATA:', payload)
  debugAuthLog('Request URL:', `${apiClient.defaults.baseURL}/auth/login`)
  debugAuthLog('Request Headers:', {
    ...apiClient.defaults.headers.common,
    ...headers,
  })
  debugAuthLog('Payload shape check:', {
    hasEmail: Object.hasOwn(payload, 'email'),
    hasEmailOrPhone: Object.hasOwn(payload as object, 'emailOrPhone'),
    isEmailEmpty: payload.email.length === 0,
    isPasswordEmpty: payload.password.length === 0,
  })

  try {
    const response = await apiClient.post<LoginResponse>('/auth/login', payload, {
      headers,
    })

    debugAuthLog('Response status:', response.status)
    debugAuthLog('Response body:', response.data)

    return response.data
  } catch (error) {
    debugAuthLog('Login request failed (full error):', error)

    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as {
        response?: {
          status?: number
          statusText?: string
          headers?: unknown
          data?: unknown
        }
      }).response

      debugAuthLog('Error response status:', response?.status)
      debugAuthLog('Error response statusText:', response?.statusText)
      debugAuthLog('Error response headers:', response?.headers)
      debugAuthLog('Error response body:', response?.data)
    }

    throw error
  }
}

const authService = {
  register,
  login,
}

export default authService
