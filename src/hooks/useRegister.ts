import { AxiosError } from 'axios'
import { useCallback, useState } from 'react'
import authService from '../services/authService'
import type { RegisterRequest } from '../services/authService'

interface BackendErrorResponse {
  message?: string
  error?: string
}

const DEFAULT_ERROR_MESSAGE = 'حدث خطأ أثناء إنشاء الحساب. حاول مرة أخرى.'

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

interface RegisterResult {
  success: boolean
  message: string
}

const useRegister = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const registerUser = useCallback(
    async (data: RegisterRequest): Promise<RegisterResult> => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await authService.register(data)
        return {
          success: true,
          message: response.message ?? 'تم إنشاء الحساب بنجاح.',
        }
      } catch (error) {
        const message = getErrorMessage(error)
        setErrorMessage(message)

        return {
          success: false,
          message,
        }
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return {
    registerUser,
    isLoading,
    errorMessage,
  }
}

export default useRegister
