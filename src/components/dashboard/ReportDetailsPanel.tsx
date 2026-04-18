import type { Report } from '../../types/report'
import {
  formatArabicDate,
  getReportStatusLabel,
  getReportTypeLabel,
} from '../../utils/reportPresentation'

interface ReportDetailsPanelProps {
  report: Report | null
  isLoading?: boolean
  errorMessage?: string | null
  onViewFullDetails?: (report: Report) => void
}

const getStatusTone = (status: Report['status']) => {
  if (status === 'ai_review') {
    return 'border-amber-300/70 bg-amber-500/12 text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200'
  }

  if (status === 'human_review') {
    return 'border-rose-300/70 bg-rose-500/12 text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200'
  }

  return 'border-emerald-300/70 bg-emerald-500/12 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200'
}

const getAiReviewScore = (report: Report) => {
  if (report.status === 'resolved') {
    return 98
  }

  if (report.status === 'in_progress') {
    return 95
  }

  if (report.status === 'pending') {
    return 92
  }

  if (report.status === 'ai_review') {
    return 88
  }

  return 72
}

const ReportDetailsPanel = ({
  report,
  isLoading = false,
  errorMessage = null,
  onViewFullDetails,
}: ReportDetailsPanelProps) => {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-4 text-sm text-slate-600 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-300">
        جاري تحميل تفاصيل البلاغ...
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

  if (!report) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-4 text-sm text-slate-600 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-300">
        اختر بلاغًا من الجدول لعرض تفاصيله هنا.
      </div>
    )
  }

  const reviewChecklist = [
    {
      title: 'هذا البلاغ يطابق معايير الجودة',
      passed: report.description.trim().length >= 10,
    },
    {
      title: 'صور مرفقة واضحة',
      passed: Boolean(report.imageUrl),
    },
    {
      title: 'خرائط مرفقة',
      passed: Boolean(report.location),
    },
    {
      title: 'معلومات مكتملة',
      passed: Boolean(report.type || report.typeAr),
    },
  ]

  const reviewScore = getAiReviewScore(report)

  return (
    <article
      dir="rtl"
      className="rounded-2xl border border-slate-200/70 bg-white/78 p-3.5 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-slate-950/55 dark:shadow-[0_25px_65px_rgba(2,6,23,0.55)]"
    >
      <h3 className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">
        لوحة تفاصيل البلاغ
      </h3>

      <div className="overflow-hidden rounded-xl border border-slate-200/70 dark:border-white/10">
        <img
          src={report.imageUrl}
          alt={getReportTypeLabel(report)}
          className="h-40 w-full object-cover"
        />
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-base font-extrabold text-slate-800 dark:text-slate-100">
          تفاصيل البلاغ: {getReportTypeLabel(report)}
        </p>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {report.description}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusTone(report.status)}`}>
          {getReportStatusLabel(report.status)}
        </span>
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          {formatArabicDate(report.createdAt)}
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200/70 bg-slate-100/70 p-3 dark:border-white/10 dark:bg-slate-900/50">
        <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
          المراجعة الذكية: {reviewScore}%
        </p>

        <ul className="mt-2 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
          {reviewChecklist.map((item) => (
            <li key={item.title} className="flex items-start gap-2">
              <span
                className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  item.passed
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                }`}
                aria-hidden="true"
              >
                {item.passed ? '✓' : '!'}
              </span>
              <span>{item.title}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => onViewFullDetails?.(report)}
        className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-amber-300/70 bg-amber-500/10 px-3 py-2 text-sm font-bold text-amber-700 transition hover:bg-amber-500/20 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200"
      >
        عرض التفاصيل الكاملة
      </button>
    </article>
  )
}

export default ReportDetailsPanel
