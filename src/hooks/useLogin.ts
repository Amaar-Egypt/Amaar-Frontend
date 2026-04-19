import { AxiosError } from 'axios'
import { useCallback, useState } from 'react'
import authService from '../services/authService'
import type { LoginRequest, LoginResponse } from '../services/authService'
import type { AuthUser } from '../types/auth'
import { getApiErrorMessage } from '../utils/apiResponse'
import { normalizeAuthUser } from '../utils/authNormalization'
import { userFromTokenPayload } from '../utils/jwt'

interface LoginResult {
  success: boolean
  message: string
  accessToken?: string
  refreshToken?: string
  user?: AuthUser | null
}

const DEFAULT_ERROR_MESSAGE = 'تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.'

const extractToken = (response: LoginResponse): string | undefined => {
  // Support common backend token shapes without coupling the UI to one response contract.
  return response.accessToken ?? response.token
}

const extractUser = (response: LoginResponse, token?: string) => {
  const normalizedUser = normalizeAuthUser(response.user ?? response)

  if (normalizedUser) {
    return normalizedUser
  }

  return userFromTokenPayload(token)
}

const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const isSafeDebugEnabled =
    import.meta.env.DEV || import.meta.env.VITE_DEBUG_AUTH === 'true'

  const loginUser = useCallback(async (data: LoginRequest): Promise<LoginResult> => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await authService.login(data)
      const token = extractToken(response)
      const user = extractUser(response, token)

      if (!token) {
        const fallbackMessage = response.message ?? DEFAULT_ERROR_MESSAGE
        setErrorMessage(fallbackMessage)
        return {
          success: false,
          message: fallbackMessage,
        }
      }

      return {
        success: true,
        message: response.message ?? 'تم تسجيل الدخول بنجاح.',
        accessToken: token,
        refreshToken: response.refreshToken,
        user,
      }
    } catch (error) {
      if (error instanceof AxiosError && isSafeDebugEnabled) {
        console.log('[useLogin] Login request failed:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
        })
      }

      const message = getApiErrorMessage(error, DEFAULT_ERROR_MESSAGE)
      setErrorMessage(message)

      return {
        success: false,
        message,
      }
    } finally {
      setIsLoading(false)
    }
  }, [isSafeDebugEnabled])

  return {
    loginUser,
    isLoading,
    errorMessage,
  }
}

export default useLogin
