import ThemeToggle from '../ThemeToggle'
import type { AuthUser } from '../../types/auth'

interface DashboardTopbarProps {
  user: AuthUser | null
  searchValue: string
  onSearchChange: (value: string) => void
  onLogout: () => void
}

const DashboardTopbar = ({
  user,
  searchValue,
  onSearchChange,
  onLogout,
}: DashboardTopbarProps) => {
  return (
    <header
      dir="rtl"
      className="rounded-3xl border border-slate-200/70 bg-white/75 p-3 shadow-[0_18px_46px_rgba(15,23,42,0.1)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_28px_70px_rgba(2,6,23,0.48)]"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-slate-950/45">
          <span className="text-sm text-slate-500 dark:text-slate-400" aria-hidden="true">
            ⌕
          </span>
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            type="search"
            placeholder="ابحث بنوع البلاغ أو الموقع..."
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-500/90 outline-none dark:text-slate-200 dark:placeholder:text-slate-400"
            aria-label="بحث داخل البلاغات"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <ThemeToggle />

          <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-slate-950/45">
            <p className="text-xs text-slate-500 dark:text-slate-400">جهه الاختصاص</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{user?.name ?? 'جهة الاختصاص'}</p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center justify-center rounded-2xl border border-rose-300/70 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-500/20 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    </header>
  )
}

export default DashboardTopbar
