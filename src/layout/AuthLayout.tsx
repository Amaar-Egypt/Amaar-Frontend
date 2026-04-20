import type { PropsWithChildren } from 'react'
import ThemeToggle from '../components/ThemeToggle'

const AuthLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100 font-arabic text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.24),transparent_42%),radial-gradient(circle_at_80%_0%,rgba(14,116,144,0.2),transparent_38%),radial-gradient(circle_at_50%_100%,rgba(251,146,60,0.2),transparent_48%)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.26),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(249,115,22,0.22),transparent_35%),radial-gradient(circle_at_50%_100%,rgba(14,116,144,0.3),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.07)_1px,transparent_1px)] bg-[size:34px_34px] opacity-25 dark:bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] dark:opacity-30" />

      <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  )
}

export default AuthLayout
