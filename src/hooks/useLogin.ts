import { AxiosError } from 'axios'
import { useCallback, useState } from 'react'
import authService from '../services/authService'
import type { LoginRequest, LoginResponse } from '../services/authService'

interface BackendErrorResponse {
  message?: string
  error?: string
}

interface LoginResult {
  success: boolean
  message: string
  token?: string
}

const DEFAULT_ERROR_MESSAGE = 'تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.'

const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const responseData = error.response?.data as BackendErrorResponse | undefined
    return responseData?.message ?? responseData?.error ?? DEFAULT_ERROR_MESSAGE
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return DEFAULT_ERROR_MESSAGE
}

const extractToken = (response: LoginResponse): string | undefined => {
  // Support common backend token shapes without coupling the UI to one response contract.
  return response.token ?? response.accessToken ?? response.data?.token ?? response.data?.accessToken
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
        token,
      }
    } catch (error) {
      if (error instanceof AxiosError && isSafeDebugEnabled) {
        console.log('[useLogin] Login request failed:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
        })
      }

      const message = getErrorMessage(error)
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
