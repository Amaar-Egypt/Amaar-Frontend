import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
  registerAuthTokensRefreshedHandler,
  setAuthTokens,
} from '../services/authTokenManager'
import type { AuthUser } from '../types/auth'
import { hasAuthorityAccess } from '../types/auth'
import { normalizeAuthUser } from '../utils/authNormalization'
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

  const normalizedStoredUser = normalizeAuthUser(session.user)

  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken ?? null,
    user: normalizedStoredUser ?? userFromTokenPayload(session.accessToken),
  }
}

const toAuthUser = (profile: Awaited<ReturnType<typeof authService.getCurrentUserProfile>>): AuthUser => {
  const normalizedProfile = normalizeAuthUser(profile)

  if (normalizedProfile) {
    return normalizedProfile
  }

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
  const userRef = useRef<AuthUser | null>(initialSession.user)

  const startSession = useCallback(
    ({ accessToken, refreshToken: nextRefreshToken, user: nextUser, rememberMe = false }: {
      accessToken: string
      refreshToken?: string
      user?: AuthUser | null
      rememberMe?: boolean
    }) => {
      const resolvedUser = normalizeAuthUser(nextUser) ?? userFromTokenPayload(accessToken)
      userRef.current = resolvedUser

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
    userRef.current = null
    setTokenState(null)
    setRefreshToken(null)
    setUser(null)
    setIsAuthLoading(false)
    setAuthTokens({
      accessToken: null,
      refreshToken: null,
    })
    clearAuthSession()
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout(refreshToken ?? undefined)
    } catch {
      // Always clear local session even if backend logout request fails.
    } finally {
      clearSession()
    }
  }, [clearSession, refreshToken])

  const updateUser = useCallback((nextUser: AuthUser | null) => {
    const normalizedUser = normalizeAuthUser(nextUser) ?? nextUser
    userRef.current = normalizedUser
    setUser(normalizedUser)

    if (!token) {
      return
    }

    writeAuthSession(
      {
        accessToken: token,
        refreshToken: refreshToken ?? undefined,
        user: normalizedUser,
      },
      isSessionPersisted(),
    )
  }, [refreshToken, token])

  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    setAuthTokens({
      accessToken: token,
      refreshToken,
    })
  }, [refreshToken, token])

  useEffect(() => {
    registerAuthTokensRefreshedHandler((tokens) => {
      if (!tokens.accessToken) {
        clearSession()
        return
      }

      setTokenState(tokens.accessToken)
      setRefreshToken(tokens.refreshToken)
      setIsAuthLoading(false)

      writeAuthSession(
        {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? undefined,
          user: userRef.current,
        },
        isSessionPersisted(),
      )
    })

    return () => {
      registerAuthTokensRefreshedHandler(null)
    }
  }, [clearSession])

  useEffect(() => {
    registerAuthFailureHandler(() => {
      clearSession()
    })

    return () => {
      registerAuthFailureHandler(null)
    }
  }, [clearSession])

  useEffect(() => {
    const shouldHydrateUser =
      !user || (user.role === 'authority' && !user.authorityId)

    if (!token || !shouldHydrateUser) {
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
      logout,
      updateUser,
    }),
    [
      clearSession,
      isAuthLoading,
      isAuthority,
      logout,
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
