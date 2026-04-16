import {
  useCallback,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { AuthContext } from './auth-context'

// Keep long-lived and session-only tokens separate for remember-me behavior.
const LOCAL_TOKEN_KEY = 'amaar.auth.token'
const SESSION_TOKEN_KEY = 'amaar.auth.session-token'

const getInitialToken = () => {
  return localStorage.getItem(LOCAL_TOKEN_KEY) ?? sessionStorage.getItem(SESSION_TOKEN_KEY)
}

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [token, setTokenState] = useState<string | null>(() => getInitialToken())

  const setToken = useCallback((nextToken: string, rememberMe = true) => {
    setTokenState(nextToken)

    // Persist in localStorage only when the user opts into remember-me.
    if (rememberMe) {
      localStorage.setItem(LOCAL_TOKEN_KEY, nextToken)
      sessionStorage.removeItem(SESSION_TOKEN_KEY)
      return
    }

    sessionStorage.setItem(SESSION_TOKEN_KEY, nextToken)
    localStorage.removeItem(LOCAL_TOKEN_KEY)
  }, [])

  const clearToken = useCallback(() => {
    setTokenState(null)
    localStorage.removeItem(LOCAL_TOKEN_KEY)
    sessionStorage.removeItem(SESSION_TOKEN_KEY)
  }, [])

  const value = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      setToken,
      clearToken,
    }),
    [clearToken, setToken, token],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
