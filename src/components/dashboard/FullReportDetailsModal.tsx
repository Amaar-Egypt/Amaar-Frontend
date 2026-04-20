import { useEffect, useState } from 'react'
import reportService from '../../services/reportService'
import type { Report } from '../../types/report'
import {
  formatArabicDate,
  getPriorityLabel,
  getReportTypeLabel,
} from '../../utils/reportPresentation'
import {
  getAiReviewOutcomeLabel,
  getAiReviewOutcomeMessage,
  getClassificationStatusLabel,
} from '../../utils/reportAiReviewPresentation'
import { getApiErrorMessage } from '../../utils/apiResponse'

interface FullReportDetailsModalProps {
  isOpen: boolean
  reportId: string | null
  onClose: () => void
}

const FALLBACK_TEXT = 'غير متوفر'
const DEFAULT_ERROR_MESSAGE = 'تعذر تحميل تفاصيل البلاغ.'

const normalizeText = (value: string | null | undefined) => {
  if (!value) {
    return FALLBACK_TEXT
  }

  const trimmed = value.trim()
  return trimmed || FALLBACK_TEXT
}

const formatDateOrFallback = (value: string | null | undefined) => {
  if (!value) {
    return FALLBACK_TEXT
  }

  return formatArabicDate(value)
}

const formatConfidence = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) {
    return FALLBACK_TEXT
  }

  const normalized = value >= 0 && value <= 1 ? value * 100 : value
  const bounded = Math.max(0, Math.min(100, normalized))
  return `${Math.round(bounded)}%`
}

const formatLocation = (report: Report) => {
  if (!report.location) {
    return FALLBACK_TEXT
  }

  return `${report.location.lat} ، ${report.location.lng}`
}

const FullReportDetailsModal = ({ isOpen, reportId, onClose }: FullReportDetailsModalProps) => {
  const [report, setReport] = useState<Report | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !reportId) {
      return
    }

    let isMounted = true
    setIsLoading(true)
    setErrorMessage(null)
    setReport(null)

    const loadReport = async () => {
      try {
        const nextReport = await reportService.getReportById(reportId)

        if (!isMounted) {
          return
        }

        setReport(nextReport)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setReport(null)
        setErrorMessage(getApiErrorMessage(error, DEFAULT_ERROR_MESSAGE))
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadReport()

    return () => {
      isMounted = false
    }
  }, [isOpen, reportId])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div dir="rtl" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="إغلاق نافذة تفاصيل البلاغ"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="التفاصيل الكاملة للبلاغ"
        className="relative z-10 w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/88 shadow-[0_35px_90px_rgba(2,6,23,0.6)]"
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
          <h3 className="text-lg font-extrabold text-slate-100 sm:text-xl">التفاصيل الكاملة للبلاغ</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/5 text-slate-200 transition hover:bg-white/15"
          >
            ×
          </button>
        </header>

        <div className="max-h-[80vh] overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm font-semibold text-slate-300">
              جاري تحميل التفاصيل الكاملة...
            </p>
          ) : null}

          {errorMessage ? (
            <p className="rounded-2xl border border-rose-400/45 bg-rose-500/15 px-4 py-4 text-sm font-semibold text-rose-200">
              {errorMessage}
            </p>
          ) : null}

          {!isLoading && !errorMessage && report ? (
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
                  {report.imageUrl ? (
                    <img
                      src={report.imageUrl}
                      alt={getReportTypeLabel(report)}
                      className="h-72 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-72 items-center justify-center text-sm font-semibold text-slate-400">
                      {FALLBACK_TEXT}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-4">
                  <h4 className="text-sm font-bold text-slate-100">الوصف بالعربية</h4>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{normalizeText(report.descriptionAr)}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-4">
                  <h4 className="text-sm font-bold text-slate-100">الوصف الأصلي</h4>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{normalizeText(report.description)}</p>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/55 p-4 text-sm text-slate-300">
                <h4 className="text-sm font-extrabold text-slate-100">بيانات البلاغ</h4>

                <p>نوع البلاغ: <span className="font-semibold text-slate-100">{getReportTypeLabel(report)}</span></p>
                <p>الأولوية: <span className="font-semibold text-slate-100">{getPriorityLabel(report.priority)}</span></p>
                <p>سبب الأولوية: <span className="font-semibold text-slate-100">{normalizeText(report.priorityReasonAr)}</span></p>
                <p>قابل للإصلاح من المواطن: <span className="font-semibold text-slate-100">{report.citizenFixable === null ? FALLBACK_TEXT : report.citizenFixable ? 'نعم' : 'لا'}</span></p>
                <p>ثقة الذكاء الاصطناعي: <span className="font-semibold text-slate-100">{formatConfidence(report.aiConfidence)}</span></p>
                <p>حالة التصنيف: <span className="font-semibold text-slate-100">{getClassificationStatusLabel(report.classificationStatus)}</span></p>
                <p>محاولات التصنيف: <span className="font-semibold text-slate-100">{report.classificationAttempts === null ? FALLBACK_TEXT : String(report.classificationAttempts)}</span></p>
                <p>{getAiReviewOutcomeLabel(report)}: <span className="font-semibold text-slate-100">{getAiReviewOutcomeMessage(report)}</span></p>
                <p>تاريخ التصنيف: <span className="font-semibold text-slate-100">{formatDateOrFallback(report.classifiedAt)}</span></p>
                <p>الجهة المسندة: <span className="font-semibold text-slate-100">{normalizeText(report.assignedAuth)}</span></p>
                <p>تعليق المراجعة: <span className="font-semibold text-slate-100">{normalizeText(report.reviewComment)}</span></p>
                <p>تمت المراجعة بواسطة: <span className="font-semibold text-slate-100">{normalizeText(report.reviewedBy)}</span></p>
                <p>تاريخ المراجعة: <span className="font-semibold text-slate-100">{formatDateOrFallback(report.reviewedAt)}</span></p>
                <p>تاريخ الإنشاء: <span className="font-semibold text-slate-100">{formatDateOrFallback(report.createdAt)}</span></p>
                <p>الموقع: <span className="font-semibold text-slate-100">{formatLocation(report)}</span></p>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

export default FullReportDetailsModal
