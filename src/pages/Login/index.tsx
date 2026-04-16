import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import BrandLogo from '../../components/BrandLogo'
import TextField from '../../components/form/TextField'
import useAuth from '../../hooks/useAuth'
import useLogin from '../../hooks/useLogin'
import AuthLayout from '../../layout/AuthLayout'

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'البريد الإلكتروني مطلوب')
    .email('يرجى إدخال بريد إلكتروني صحيح'),
  password: z
    .string()
    .min(1, 'كلمة المرور مطلوبة')
    .max(50, 'كلمة المرور يجب ألا تتجاوز 50 حرفًا'),
  rememberMe: z.boolean().optional(),
})

type LoginFormValues = z.infer<typeof loginSchema>

const LoginPage = () => {
  const navigate = useNavigate()
  const { setToken } = useAuth()
  const { loginUser, isLoading, errorMessage } = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  })

  const onSubmit = async ({ email, password, rememberMe }: LoginFormValues) => {
    const normalizedEmail = email.trim()

    const result = await loginUser({
      email: normalizedEmail,
      password,
    })

    if (!result.success || !result.token) {
      return
    }

    // Store token via context so route guards react immediately after login.
    setToken(result.token, rememberMe ?? false)
    navigate('/dashboard', { replace: true })
  }

  return (
    <AuthLayout>
      <section dir="rtl" className="w-full max-w-xl text-right [animation:fade-up_0.75s_ease-out]">
        <BrandLogo />
        <h1 className="mb-6 text-center text-2xl font-extrabold leading-relaxed text-slate-100 sm:text-3xl">
          ساهم في تجميل مدينتك... ابدأ الآن مع عمار
        </h1>

        <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-[0_28px_80px_rgba(2,6,23,0.62)] backdrop-blur-md sm:p-8">
          <h2 className="mb-6 text-center text-xl font-bold text-slate-100 sm:text-2xl">
            تسجيل الدخول
          </h2>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              label="البريد الإلكتروني"
              type="text"
              placeholder="البريد الإلكتروني"
              autoComplete="email"
              registration={register('email')}
              error={errors.email?.message}
            />

            <TextField
              label="كلمة المرور"
              type="password"
              placeholder="كلمة المرور"
              autoComplete="current-password"
              registration={register('password')}
              error={errors.password?.message}
            />

            <div className="flex items-center justify-between gap-4 pt-1">
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-emerald-300 transition hover:text-emerald-200"
              >
                نسيت كلمة المرور؟
              </Link>

              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20 bg-slate-900/50 text-emerald-400 focus:ring-emerald-300/60"
                  {...register('rememberMe')}
                />
                <span>تذكرني</span>
              </label>
            </div>

            <button
              type="submit"
              className="mt-2 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-3 text-sm font-extrabold text-slate-950 transition duration-200 hover:from-emerald-400 hover:to-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/70 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isLoading}
            >
              {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>

            {errorMessage ? (
              <p className="rounded-xl border border-rose-300/40 bg-rose-500/15 px-3 py-2 text-center text-sm text-rose-200">
                {errorMessage}
              </p>
            ) : null}

            <p className="pt-1 text-center text-sm text-slate-300">
              ليس لديك حساب؟{' '}
              <Link
                to="/register"
                className="font-semibold text-emerald-300 transition hover:text-emerald-200"
              >
                إنشاء حساب جديد
              </Link>
            </p>
          </form>
        </div>
      </section>
    </AuthLayout>
  )
}

export default LoginPage
