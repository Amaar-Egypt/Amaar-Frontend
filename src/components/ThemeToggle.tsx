import useTheme from '../hooks/useTheme'

interface ThemeToggleProps {
  className?: string
}

const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { isDarkMode, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center gap-2 rounded-xl border border-slate-300/50 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-200 dark:hover:border-emerald-400/60 dark:hover:text-emerald-200 ${className ?? ''}`}
      aria-label={isDarkMode ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
    >
      <span className="text-base" aria-hidden="true">
        {isDarkMode ? '☀' : '🌙'}
      </span>
      <span>{isDarkMode ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
    </button>
  )
}

export default ThemeToggle
