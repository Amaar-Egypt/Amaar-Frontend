import { useCallback, useState } from 'react'
import authService from '../services/authService'
import type { RegisterRequest } from '../services/authService'
import { getApiErrorMessage } from '../utils/apiResponse'

const DEFAULT_ERROR_MESSAGE = 'حدث خطأ أثناء إنشاء الحساب. حاول مرة أخرى.'

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
        const message = getApiErrorMessage(error, DEFAULT_ERROR_MESSAGE)
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
