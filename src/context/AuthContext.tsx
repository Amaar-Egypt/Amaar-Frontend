import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import authService from '../services/authService'
import {
  clearAuthSession,
  isSessionPersisted,
  readAuthSession,
  writeAuthSession,
} from '../services/authStorage'
import {
  registerAuthFailureHandler,
  setAccessToken as setApiAccessToken,
} from '../services/authTokenManager'
import type { AuthUser } from '../types/auth'
import { hasAuthorityAccess } from '../types/auth'
import { userFromTokenPayload } from '../utils/jwt'
import { AuthContext } from './auth-context'

const getInitialSession = () => {
  const session = readAuthSession()

  if (!session) {
    return {
      accessToken: null,
      refreshToken: null,
      user: null,
    }
  }

  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken ?? null,
    user: session.user ?? userFromTokenPayload(session.accessToken),
  }
}

const toAuthUser = (profile: Awaited<ReturnType<typeof authService.getCurrentUserProfile>>): AuthUser => {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    authorityId: profile.authorityId,
  }
}

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const initialSession = getInitialSession()

  const [token, setTokenState] = useState<string | null>(initialSession.accessToken)
  const [refreshToken, setRefreshToken] = useState<string | null>(
    initialSession.refreshToken,
  )
  const [user, setUser] = useState<AuthUser | null>(initialSession.user)
  const [isAuthLoading, setIsAuthLoading] = useState(
    Boolean(initialSession.accessToken && !initialSession.user),
  )

  const startSession = useCallback(
    ({ accessToken, refreshToken: nextRefreshToken, user: nextUser, rememberMe = false }: {
      accessToken: string
      refreshToken?: string
      user?: AuthUser | null
      rememberMe?: boolean
    }) => {
      const resolvedUser = nextUser ?? userFromTokenPayload(accessToken)

      setTokenState(accessToken)
      setRefreshToken(nextRefreshToken ?? null)
      setUser(resolvedUser)
      setIsAuthLoading(!resolvedUser)

      writeAuthSession(
        {
          accessToken,
          refreshToken: nextRefreshToken,
          user: resolvedUser,
        },
        rememberMe,
      )
    },
    [],
  )

  const clearSession = useCallback(() => {
    setTokenState(null)
    setRefreshToken(null)
    setUser(null)
    setIsAuthLoading(false)
    clearAuthSession()
  }, [])

  const updateUser = useCallback((nextUser: AuthUser | null) => {
    setUser(nextUser)

    if (!token) {
      return
    }

    writeAuthSession(
      {
        accessToken: token,
        refreshToken: refreshToken ?? undefined,
        user: nextUser,
      },
      isSessionPersisted(),
    )
  }, [refreshToken, token])

  useEffect(() => {
    setApiAccessToken(token)
  }, [token])

  useEffect(() => {
    registerAuthFailureHandler(() => {
      clearSession()
    })

    return () => {
      registerAuthFailureHandler(null)
    }
  }, [clearSession])

  useEffect(() => {
    if (!token || user) {
      setIsAuthLoading(false)
      return
    }

    let isMounted = true
    setIsAuthLoading(true)

    const syncUser = async () => {
      try {
        const profile = await authService.getCurrentUserProfile()

        if (!isMounted) {
          return
        }

        updateUser(toAuthUser(profile))
      } catch {
        if (isMounted) {
          clearSession()
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false)
        }
      }
    }

    syncUser()

    return () => {
      isMounted = false
    }
  }, [clearSession, token, updateUser, user])

  const role = user?.role ?? null
  const isAuthority = hasAuthorityAccess(role)

  const value = useMemo(
    () => ({
      token,
      refreshToken,
      user,
      role,
      isAuthenticated: Boolean(token),
      isAuthority,
      isAuthLoading,
      startSession,
      clearSession,
      updateUser,
    }),
    [
      clearSession,
      isAuthLoading,
      isAuthority,
      refreshToken,
      role,
      startSession,
      token,
      updateUser,
      user,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useHydrateAuthUser = () => {
  const [isHydrating, setIsHydrating] = useState(false)

  const hydrate = useCallback(async (token: string) => {
    setIsHydrating(true)

    try {
      const profile = await authService.getCurrentUserProfile()
      return toAuthUser(profile)
    } catch {
      return userFromTokenPayload(token)
    } finally {
      setIsHydrating(false)
    }
  }, [])

  return {
    hydrate,
    isHydrating,
  }
}
