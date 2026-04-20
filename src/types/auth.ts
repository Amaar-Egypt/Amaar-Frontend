export type UserRole = 'citizen' | 'authority' | 'admin'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  authorityId?: string | null
}

export interface AuthSession {
  accessToken: string
  refreshToken?: string
  user: AuthUser | null
}

export const hasAuthorityAccess = (role?: UserRole | null) => {
  return role === 'authority' || role === 'admin'
}
