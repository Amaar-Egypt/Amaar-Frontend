import type { Fix, FixStatus } from '../../types/fix'
import { formatArabicDate } from '../../utils/reportPresentation'

interface FixesListProps {
  fixes: Fix[]
  selectedFixId?: string | null
  onSelectFix?: (fix: Fix) => void
}

const FIX_STATUS_LABELS: Record<FixStatus, string> = {
  pending: 'قيد المراجعة',
  accepted: 'مقبول',
  rejected: 'مرفوض',
}

const getFixStatusClassName = (status: FixStatus) => {
  if (status === 'accepted') {
    return 'border-emerald-300/70 bg-emerald-500/12 text-emerald-700 dark:border-emerald-400/45 dark:bg-emerald-500/18 dark:text-emerald-200'
  }

  if (status === 'rejected') {
    return 'border-rose-300/70 bg-rose-500/12 text-rose-700 dark:border-rose-400/45 dark:bg-rose-500/18 dark:text-rose-200'
  }

  return 'border-amber-300/70 bg-amber-500/12 text-amber-700 dark:border-amber-400/45 dark:bg-amber-500/18 dark:text-amber-200'
}

const FixesList = ({
  fixes,
  selectedFixId = null,
  onSelectFix,
}: FixesListProps) => {
  return (
    <div className="space-y-3">
      {fixes.map((fix) => (
        <article
          key={fix.id}
          onClick={onSelectFix ? () => onSelectFix(fix) : undefined}
          className={`rounded-2xl border bg-white/78 p-3 shadow-sm dark:bg-slate-950/45 ${
            selectedFixId === fix.id
              ? 'cursor-pointer border-cyan-300/80 ring-1 ring-cyan-300/50 dark:border-cyan-400/45 dark:ring-cyan-400/40'
              : onSelectFix
                ? 'cursor-pointer border-slate-200/70 hover:border-cyan-300/65 dark:border-white/10 dark:hover:border-cyan-400/35'
                : 'border-slate-200/70 dark:border-white/10'
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="h-28 w-full overflow-hidden rounded-xl border border-slate-200/70 bg-slate-100 dark:border-white/10 dark:bg-slate-800 sm:w-40">
              <img
                src={fix.imageUrl}
                alt="صورة الإصلاح"
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getFixStatusClassName(fix.status)}`}>
                  {FIX_STATUS_LABELS[fix.status]}
                </span>

                <span className="inline-flex rounded-full border border-indigo-300/70 bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:border-indigo-400/45 dark:bg-indigo-500/15 dark:text-indigo-200">
                  النقاط: {fix.pointsAwarded}
                </span>
              </div>

              <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">{fix.description || 'لا يوجد وصف.'}</p>

              {fix.comment ? (
                <p className="rounded-xl border border-slate-200/70 bg-slate-100/70 px-3 py-2 text-xs text-slate-600 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-300">
                  ملاحظة المراجعة: {fix.comment}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span>البلاغ: {fix.reportId}</span>
                <span>أنشئ في: {formatArabicDate(fix.createdAt)}</span>
                <span>آخر تحديث: {formatArabicDate(fix.updatedAt)}</span>
                <span>معرف الإصلاح: {fix.id}</span>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

export default FixesList
