import { Link } from 'react-router-dom'
import BrandLogo from '../../components/BrandLogo'
import AuthLayout from '../../layout/AuthLayout'

const ForgotPasswordPage = () => {
  return (
    <AuthLayout>
      <section
        dir="rtl"
        className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/10 p-6 text-center shadow-[0_28px_80px_rgba(2,6,23,0.62)] backdrop-blur-md sm:p-8"
      >
        <BrandLogo />
        <h1 className="mb-3 text-2xl font-bold text-slate-100">استعادة كلمة المرور</h1>
        <p className="mb-7 text-sm text-slate-300">
          يمكنك ربط هذه الصفحة لاحقًا بواجهة طلب إعادة تعيين كلمة المرور.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-5 py-2 text-sm font-extrabold text-slate-950 transition hover:from-emerald-400 hover:to-emerald-300"
        >
          العودة إلى تسجيل الدخول
        </Link>
      </section>
    </AuthLayout>
  )
}

export default ForgotPasswordPage
