interface StatCardProps {
  title: string
  value: number
  tone: 'neutral' | 'warning' | 'success' | 'danger'
  isLoading?: boolean
}

const toneMap: Record<StatCardProps['tone'], string> = {
  neutral:
    'text-slate-700 dark:text-slate-100 border-slate-200/70 dark:border-white/10',
  warning:
    'text-amber-700 dark:text-amber-200 border-amber-200/80 dark:border-amber-500/35',
  success:
    'text-emerald-700 dark:text-emerald-200 border-emerald-200/80 dark:border-emerald-500/35',
  danger:
    'text-rose-700 dark:text-rose-200 border-rose-200/80 dark:border-rose-500/35',
}

const StatCard = ({ title, value, tone, isLoading = false }: StatCardProps) => {
  return (
    <article
      dir="rtl"
      className={`rounded-2xl border bg-white/72 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.09)] backdrop-blur-xl dark:bg-slate-900/65 dark:shadow-[0_18px_42px_rgba(2,6,23,0.48)] ${toneMap[tone]}`}
    >
      <p className="text-xs text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-extrabold leading-none">
        {isLoading ? (
          <span className="inline-block min-w-10 animate-pulse rounded bg-slate-300/65 px-2 text-transparent dark:bg-slate-700/70">
            00
          </span>
        ) : (
          value
        )}
      </p>
    </article>
  )
}

export default StatCard
