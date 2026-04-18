import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import BrandLogo from '../../components/BrandLogo'
import TextField from '../../components/form/TextField'
import useRegister from '../../hooks/useRegister'
import AuthLayout from '../../layout/AuthLayout'

const registerSchema = z
  .object({
    name: z
      .string()
      .min(3, 'الاسم الكامل يجب أن يحتوي على 3 أحرف على الأقل')
      .max(60, 'الاسم الكامل يجب ألا يتجاوز 60 حرفًا'),
    email: z
      .string()
      .min(1, 'البريد الإلكتروني مطلوب')
      .email('يرجى إدخال بريد إلكتروني صحيح'),
    password: z
      .string()
      .min(8, 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل')
      .max(50, 'كلمة المرور يجب ألا تتجاوز 50 حرفًا'),
    confirmPassword: z.string().min(1, 'تأكيد كلمة المرور مطلوب'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'كلمتا المرور غير متطابقتين',
  })

type RegisterFormValues = z.infer<typeof registerSchema>

const REDIRECT_DELAY_MS = 1300

const RegisterPage = () => {
  const navigate = useNavigate()
  const [shouldRedirect, setShouldRedirect] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const { registerUser, isLoading, errorMessage } = useRegister()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    if (!shouldRedirect) {
      return
    }

    const timer = window.setTimeout(() => {
      navigate('/login')
    }, REDIRECT_DELAY_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [navigate, shouldRedirect])

  const onSubmit = async (values: RegisterFormValues) => {
    setSuccessMessage(null)
    setShouldRedirect(false)

    const result = await registerUser(values)

    if (!result.success) {
      return
    }

    setSuccessMessage(result.message)
    setShouldRedirect(true)
    reset()
  }

  return (
    <AuthLayout>
      <section dir="rtl" className="w-full max-w-xl text-right [animation:fade-up_0.75s_ease-out]">
        <BrandLogo />

        <h1 className="mb-6 text-center text-2xl font-extrabold leading-relaxed text-slate-100 sm:text-3xl">
          ساهم في تجميل مدينتك... ابدأ الآن مع عمار
        </h1>

        <div className="rounded-3xl border border-white/10 bg-slate-900/45 p-6 shadow-[0_28px_80px_rgba(2,6,23,0.62)] backdrop-blur-2xl sm:p-8">
          <h2 className="mb-6 text-center text-xl font-bold text-slate-100 sm:text-2xl">
            إنشاء حساب جديد
          </h2>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              label="الاسم الكامل"
              type="text"
              placeholder="أدخل اسمك الكامل"
              autoComplete="name"
              registration={register('name')}
              error={errors.name?.message}
            />

            <TextField
              label="البريد الإلكتروني"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              registration={register('email')}
              error={errors.email?.message}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="كلمة المرور"
                type="password"
                placeholder="********"
                autoComplete="new-password"
                registration={register('password')}
                error={errors.password?.message}
              />

              <TextField
                label="تأكيد كلمة المرور"
                type="password"
                placeholder="********"
                autoComplete="new-password"
                registration={register('confirmPassword')}
                error={errors.confirmPassword?.message}
              />
            </div>

            <button
              type="submit"
              className="mt-2 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-3 text-sm font-extrabold text-slate-950 transition duration-200 hover:from-emerald-400 hover:to-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/70 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isLoading}
            >
              {isLoading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
            </button>

            {successMessage ? (
              <p className="rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-3 py-2 text-center text-sm text-emerald-200">
                {successMessage} سيتم تحويلك إلى صفحة تسجيل الدخول...
              </p>
            ) : null}

            {errorMessage ? (
              <p className="rounded-xl border border-rose-300/40 bg-rose-500/15 px-3 py-2 text-center text-sm text-rose-200">
                {errorMessage}
              </p>
            ) : null}

            <p className="pt-1 text-center text-sm text-slate-300">
              لديك حساب بالفعل؟{' '}
              <Link
                to="/login"
                className="font-semibold text-emerald-300 transition hover:text-emerald-200"
              >
                تسجيل الدخول
              </Link>
            </p>
          </form>
        </div>
      </section>
    </AuthLayout>
  )
}

export default RegisterPage
