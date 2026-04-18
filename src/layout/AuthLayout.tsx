import type { PropsWithChildren } from 'react'

const AuthLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 font-arabic text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.26),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(249,115,22,0.22),transparent_35%),radial-gradient(circle_at_50%_100%,rgba(14,116,144,0.3),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:34px_34px] opacity-30" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  )
}

export default AuthLayout
