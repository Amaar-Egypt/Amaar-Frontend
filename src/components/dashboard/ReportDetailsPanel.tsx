import type { Report } from '../../types/report'
import type { UserRole } from '../../types/auth'
import {
  formatArabicDate,
  getReportStatusLabel,
  getReportTypeLabel,
} from '../../utils/reportPresentation'
import {
  getAiReviewOutcomeLabel,
  getAiReviewOutcomeMessage,
  getClassificationStatusLabel,
  hasClassificationFailure,
} from '../../utils/reportAiReviewPresentation'

interface ReportDetailsPanelProps {
  report: Report | null
  viewerRole?: UserRole | null
  typeLabelsByCode?: Record<string, string>
  isLoading?: boolean
  errorMessage?: string | null
  emptyMessage?: string
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

const MAX_SUMMARY_DESCRIPTION_LENGTH = 120

const formatAiConfidence = (aiConfidence: Report['aiConfidence']) => {
  if (aiConfidence === null || !Number.isFinite(aiConfidence)) {
    return 'غير متوفر'
  }

  const normalizedConfidence = aiConfidence >= 0 && aiConfidence <= 1
    ? aiConfidence * 100
    : aiConfidence

  const boundedConfidence = Math.max(0, Math.min(100, normalizedConfidence))
  return `${Math.round(boundedConfidence)}%`
}

const getSummaryDescription = (report: Report) => {
  const sourceText = report.descriptionAr ?? report.description
  const normalized = sourceText.trim()

  if (!normalized) {
    return 'غير متوفر'
  }

  if (normalized.length <= MAX_SUMMARY_DESCRIPTION_LENGTH) {
    return normalized
  }

  return `${normalized.slice(0, MAX_SUMMARY_DESCRIPTION_LENGTH).trim()}...`
}

const ReportDetailsPanel = ({
  report,
  viewerRole = null,
  typeLabelsByCode = {},
  isLoading = false,
  errorMessage = null,
  emptyMessage,
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
    const message = emptyMessage ?? 'اختر بلاغًا من الجدول لعرض تفاصيله هنا.'

    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-4 text-sm text-slate-600 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-300">
        {message}
      </div>
    )
  }

  const confidenceLabel = formatAiConfidence(report.aiConfidence)
  const classificationStatusLabel = getClassificationStatusLabel(report.classificationStatus)
  const hasReviewFailure = hasClassificationFailure(report)
  const reviewOutcomeLabel = getAiReviewOutcomeLabel(report)
  const reviewOutcomeMessage = getAiReviewOutcomeMessage(report)
  const displayedDescription = getSummaryDescription(report)

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
          alt={getReportTypeLabel(report, typeLabelsByCode)}
          className="h-40 w-full object-cover"
        />
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-base font-extrabold text-slate-800 dark:text-slate-100">
          تفاصيل البلاغ: {getReportTypeLabel(report, typeLabelsByCode)}
        </p>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {displayedDescription}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusTone(report.status)}`}>
          {getReportStatusLabel(report.status, viewerRole)}
        </span>
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          {formatArabicDate(report.createdAt)}
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200/70 bg-slate-100/70 p-3 dark:border-white/10 dark:bg-slate-900/50">
        <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
          ثقة المراجعة الذكية: {confidenceLabel}
        </p>

        <div className="mt-2 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
          <p>
            حالة التصنيف: <span className="font-semibold">{classificationStatusLabel}</span>
          </p>

          <p className={`rounded-lg border px-2.5 py-2 text-xs font-semibold ${
            hasReviewFailure
              ? 'border-rose-300/70 bg-rose-500/10 text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200'
              : 'border-emerald-300/70 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200'
          }`}>
            {reviewOutcomeLabel}: {reviewOutcomeMessage}
          </p>
        </div>
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
