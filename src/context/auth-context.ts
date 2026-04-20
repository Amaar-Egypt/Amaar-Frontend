import { createContext } from 'react'
import type { AuthUser } from '../types/auth'

export interface AuthContextValue {
  token: string | null
  refreshToken: string | null
  user: AuthUser | null
  role: AuthUser['role'] | null
  isAuthenticated: boolean
  isAuthority: boolean
  isAuthLoading: boolean
  startSession: (params: {
    accessToken: string
    refreshToken?: string
    user?: AuthUser | null
    rememberMe?: boolean
  }) => void
  clearSession: () => void
  logout: () => Promise<void>
  updateUser: (user: AuthUser | null) => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
