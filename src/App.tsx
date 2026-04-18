import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/routing/ProtectedRoute'
import useAuth from './hooks/useAuth'
import DashboardPage from './pages/Dashboard'
import ForgotPasswordPage from './pages/ForgotPassword'
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'

function App() {
  const { isAuthenticated, isAuthority, isAuthLoading } = useAuth()

  const defaultPath = isAuthenticated ? '/dashboard' : '/login'

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={defaultPath} replace />}
        />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/login"
          element={isAuthenticated && (isAuthority || isAuthLoading) ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requireAuthority>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
