import {
  useCallback,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { AuthContext } from './auth-context'

const SESSION_TOKEN_KEY = 'amaar.auth.session-token'

// Frontend-managed tokens are exposed to XSS by nature. We intentionally avoid
// localStorage persistence and keep tokens in memory by default. When users
// opt into "remember me", we use sessionStorage only for same-tab continuity.
const readSessionToken = () => {
  try {
    return sessionStorage.getItem(SESSION_TOKEN_KEY)
  } catch {
    return null
  }
}

const writeSessionToken = (token: string) => {
  try {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token)
  } catch {
    // Ignore storage write failures (privacy mode/quota) and keep in-memory state.
  }
}

const clearSessionToken = () => {
  try {
    sessionStorage.removeItem(SESSION_TOKEN_KEY)
  } catch {
    // Ignore storage cleanup failures.
  }
}

const getInitialToken = () => {
  return readSessionToken()
}

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [token, setTokenState] = useState<string | null>(() => getInitialToken())

  const setToken = useCallback((nextToken: string, rememberMe = false) => {
    setTokenState(nextToken)

    if (rememberMe) {
      writeSessionToken(nextToken)
      return
    }

    clearSessionToken()
  }, [])

  const clearToken = useCallback(() => {
    setTokenState(null)
    clearSessionToken()
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
