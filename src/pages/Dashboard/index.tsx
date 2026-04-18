import { Link, useNavigate } from 'react-router-dom'
import BrandLogo from '../../components/BrandLogo'
import useAuth from '../../hooks/useAuth'
import AuthLayout from '../../layout/AuthLayout'

const DashboardPage = () => {
  const navigate = useNavigate()
  const { clearToken } = useAuth()

  const handleLogout = () => {
    clearToken()
    navigate('/login', { replace: true })
  }

  return (
    <AuthLayout>
      <section
        dir="rtl"
        className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/10 p-6 text-center shadow-[0_28px_80px_rgba(2,6,23,0.62)] backdrop-blur-md sm:p-8"
      >
        <BrandLogo />
        <h1 className="mb-3 text-2xl font-bold text-slate-100">مرحبًا بك في لوحة التحكم</h1>
        <p className="mb-7 text-sm text-slate-300">
          تم تسجيل الدخول بنجاح. يمكنك الآن استكمال تجربة المستخدم داخل التطبيق.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/register"
            className="inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            صفحة التسجيل
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-5 py-2 text-sm font-extrabold text-slate-950 transition hover:from-emerald-400 hover:to-emerald-300"
          >
            تسجيل الخروج
          </button>
        </div>
      </section>
    </AuthLayout>
  )
}

export default DashboardPage
