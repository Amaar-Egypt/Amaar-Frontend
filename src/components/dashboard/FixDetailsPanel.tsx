import type { Fix, FixStatus } from '../../types/fix'
import { formatArabicDate } from '../../utils/reportPresentation'

interface FixDetailsPanelProps {
  fix: Fix | null
  reportLabelById?: Record<string, string>
  isLoading?: boolean
  errorMessage?: string | null
}

const FIX_STATUS_LABELS: Record<FixStatus, string> = {
  pending: 'قيد المراجعة',
  accepted: 'مقبول',
  rejected: 'مرفوض',
}

const getFixStatusTone = (status: FixStatus) => {
  if (status === 'accepted') {
    return 'border-emerald-300/70 bg-emerald-500/12 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200'
  }

  if (status === 'rejected') {
    return 'border-rose-300/70 bg-rose-500/12 text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200'
  }

  return 'border-amber-300/70 bg-amber-500/12 text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200'
}

const FixDetailsPanel = ({
  fix,
  reportLabelById = {},
  isLoading = false,
  errorMessage = null,
}: FixDetailsPanelProps) => {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-4 text-sm text-slate-600 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-300">
        جاري تحميل التفاصيل الكاملة للإصلاح...
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-rose-300/70 bg-rose-500/10 p-4 text-sm text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200">
        {errorMessage}
      </div>
    )
  }

  if (!fix) {
    return null
  }

  return (
    <article
      dir="rtl"
      className="rounded-2xl border border-slate-200/70 bg-white/78 p-3.5 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-slate-950/55 dark:shadow-[0_25px_65px_rgba(2,6,23,0.55)]"
    >
      <h3 className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">
        لوحة تفاصيل الإصلاح
      </h3>

      <div className="overflow-hidden rounded-xl border border-slate-200/70 dark:border-white/10">
        <img
          src={fix.imageUrl}
          alt="صورة الإصلاح"
          className="h-40 w-full object-cover"
        />
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-base font-extrabold text-slate-800 dark:text-slate-100">
          تفاصيل الإصلاح
        </p>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {fix.description || 'لا يوجد وصف.'}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getFixStatusTone(fix.status)}`}>
          {FIX_STATUS_LABELS[fix.status]}
        </span>

        <span className="inline-flex rounded-full border border-indigo-300/70 bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:border-indigo-400/45 dark:bg-indigo-500/15 dark:text-indigo-200">
          النقاط: {fix.pointsAwarded}
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200/70 bg-slate-100/70 p-3 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-300">
        <div className="space-y-1.5">
          <p>
            صاحب الإصلاح: <span className="font-semibold">غير متوفر</span>
          </p>
          <p>
            البلاغ: <span className="font-semibold">{reportLabelById[fix.reportId] ?? 'جاري تحميل بيانات البلاغ...'}</span>
          </p>
          <p>
            أنشئ في: <span className="font-semibold">{formatArabicDate(fix.createdAt)}</span>
          </p>
          <p>
            آخر تحديث: <span className="font-semibold">{formatArabicDate(fix.updatedAt)}</span>
          </p>
        </div>

        {fix.comment ? (
          <p className="mt-2 rounded-lg border border-slate-200/70 bg-white/75 px-2.5 py-2 text-xs text-slate-600 dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-300">
            ملاحظة المراجعة: {fix.comment}
          </p>
        ) : null}
      </div>
    </article>
  )
}

export default FixDetailsPanel