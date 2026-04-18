import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
  requireAuthority?: boolean
}

const ProtectedRoute = ({
  children,
  requireAuthority = false,
}: ProtectedRouteProps) => {
  const location = useLocation()
  const { isAuthenticated, isAuthority, isAuthLoading } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 font-arabic text-slate-700 dark:bg-slate-950 dark:text-slate-200">
        جاري تجهيز الجلسة...
      </div>
    )
  }

  if (requireAuthority && !isAuthority) {
    return <Navigate to="/login" replace state={{ unauthorized: true }} />
  }

  return children
}

export default ProtectedRoute
