import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import authorityService from '../../services/authorityService'
import reportService from '../../services/reportService'
import type { AuthoritySummary } from '../../types/authority'
import type { Report, ReportPriority, ReportTypeDefinition } from '../../types/report'
import { getApiErrorMessage } from '../../utils/apiResponse'
import {
  formatArabicDate,
  getPriorityLabel,
  getReportStatusLabel,
  getReportTypeLabel,
  reportPriorityOptions,
} from '../../utils/reportPresentation'

interface HumanReviewModalProps {
  isOpen: boolean
  reportId: string | null
  onClose: () => void
  onSubmit: (payload: {
    reportId: string
    type: string
    priority: ReportPriority
    assignedAuth: string
    description?: string
    reviewComment?: string
  }) => Promise<boolean>
}

const FALLBACK_TEXT = 'غير متوفر'
const DEFAULT_ERROR_MESSAGE = 'تعذر تحميل تفاصيل البلاغ.'
const DEFAULT_TYPES_ERROR_MESSAGE = 'تعذر تحميل أنواع البلاغات.'
const DEFAULT_AUTHORITIES_ERROR_MESSAGE = 'تعذر تحميل الجهات المسندة.'

const normalizeText = (value: string | null | undefined) => {
  if (!value) {
    return FALLBACK_TEXT
  }

  const trimmed = value.trim()
  return trimmed || FALLBACK_TEXT
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

const HumanReviewModal = ({ isOpen, reportId, onClose, onSubmit }: HumanReviewModalProps) => {
  const [report, setReport] = useState<Report | null>(null)
  const [reportTypes, setReportTypes] = useState<ReportTypeDefinition[]>([])
  const [authorities, setAuthorities] = useState<AuthoritySummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [typesErrorMessage, setTypesErrorMessage] = useState<string | null>(null)
  const [authoritiesErrorMessage, setAuthoritiesErrorMessage] = useState<string | null>(null)

  const [selectedType, setSelectedType] = useState('')
  const [selectedPriority, setSelectedPriority] = useState<ReportPriority | ''>('')
  const [selectedAuthority, setSelectedAuthority] = useState('')
  const [description, setDescription] = useState('')
  const [reviewComment, setReviewComment] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const typeLabelsByCode = useMemo(() => {
    return reportTypes.reduce<Record<string, string>>((acc, type) => {
      acc[type.code] = type.label
      return acc
    }, {})
  }, [reportTypes])

  const authorityOptions = useMemo(() => {
    return authorities.map((authority) => ({
      value: authority.id,
      label: authority.name,
    }))
  }, [authorities])

  useEffect(() => {
    if (!isOpen || !reportId) {
      return
    }

    let isMounted = true
    setIsLoading(true)
    setErrorMessage(null)
    setTypesErrorMessage(null)
    setAuthoritiesErrorMessage(null)
    setReport(null)
    setValidationErrors({})

    const loadData = async () => {
      const [reportResult, typesResult, authoritiesResult] = await Promise.allSettled([
        reportService.getReportById(reportId),
        reportService.listReportTypes(),
        authorityService.listAuthorities(),
      ])

      if (!isMounted) {
        return
      }

      if (reportResult.status === 'rejected') {
        setErrorMessage(getApiErrorMessage(reportResult.reason, DEFAULT_ERROR_MESSAGE))
        setIsLoading(false)
        return
      }

      const reportDetails = reportResult.value

      if (typesResult.status === 'fulfilled') {
        setReportTypes(typesResult.value)
        setTypesErrorMessage(typesResult.value.length ? null : DEFAULT_TYPES_ERROR_MESSAGE)
      } else {
        setReportTypes([])
        setTypesErrorMessage(getApiErrorMessage(typesResult.reason, DEFAULT_TYPES_ERROR_MESSAGE))
      }

      if (authoritiesResult.status === 'fulfilled') {
        const sortedAuthorities = [...authoritiesResult.value].sort((first, second) =>
          first.name.localeCompare(second.name, 'ar'),
        )
        setAuthorities(sortedAuthorities)
        setAuthoritiesErrorMessage(sortedAuthorities.length ? null : DEFAULT_AUTHORITIES_ERROR_MESSAGE)
      } else {
        setAuthorities([])
        setAuthoritiesErrorMessage(getApiErrorMessage(authoritiesResult.reason, DEFAULT_AUTHORITIES_ERROR_MESSAGE))
      }

      setReport(reportDetails)
      const matchedType = reportDetails.type
        ? typesResult.status === 'fulfilled'
          ? typesResult.value.some((type) => type.code === reportDetails.type)
          : false
        : false
      setSelectedType(matchedType ? reportDetails.type ?? '' : '')
      setSelectedPriority(reportDetails.priority)
      const matchedAuthority = reportDetails.assignedAuth
        ? authoritiesResult.status === 'fulfilled'
          ? authoritiesResult.value.some((authority) => authority.id === reportDetails.assignedAuth)
          : false
        : false
      setSelectedAuthority(matchedAuthority ? reportDetails.assignedAuth ?? '' : '')
      setDescription(reportDetails.description ?? '')
      setReviewComment(reportDetails.reviewComment ?? '')
      setIsLoading(false)
    }

    loadData()

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors: Record<string, string> = {}

    if (!selectedType) {
      nextErrors.type = 'يرجى اختيار نوع البلاغ.'
    }

    if (!selectedPriority) {
      nextErrors.priority = 'يرجى تحديد الأولوية.'
    }

    if (!selectedAuthority) {
      nextErrors.assignedAuth = 'يرجى اختيار الجهة المسؤولة.'
    }

    setValidationErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0 || !reportId) {
      return
    }

    setIsSubmitting(true)

    try {
      const didSucceed = await onSubmit({
        reportId,
        type: selectedType,
        priority: selectedPriority as ReportPriority,
        assignedAuth: selectedAuthority,
        description: description.trim() || undefined,
        reviewComment: reviewComment.trim() || undefined,
      })

      if (didSucceed) {
        onClose()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div dir="rtl" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="إغلاق نافذة المراجعة البشرية"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="مراجعة الإدارة للبلاغ"
        className="relative z-10 w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200/70 bg-white/95 shadow-[0_35px_90px_rgba(2,6,23,0.4)] dark:border-white/10 dark:bg-slate-950/90"
      >
        <header className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3 dark:border-white/10 sm:px-6">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">مراجعة الإدارة</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">تحديث البلاغ وإرساله للجهة المختصة</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/70 bg-white/70 text-slate-600 transition hover:bg-slate-100 dark:border-white/15 dark:bg-white/10 dark:text-slate-200"
          >
            ×
          </button>
        </header>

        <div className="max-h-[80vh] overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <p className="rounded-2xl border border-slate-200/70 bg-slate-100/70 px-4 py-8 text-center text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              جاري تحميل تفاصيل البلاغ...
            </p>
          ) : null}

          {errorMessage ? (
            <p className="rounded-2xl border border-rose-300/60 bg-rose-500/10 px-4 py-4 text-sm font-semibold text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200">
              {errorMessage}
            </p>
          ) : null}

          {!isLoading && !errorMessage && report ? (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-100/70 dark:border-white/10 dark:bg-slate-900/60">
                  {report.imageUrl ? (
                    <img
                      src={report.imageUrl}
                      alt={getReportTypeLabel(report, typeLabelsByCode)}
                      className="h-72 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-72 items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-300">
                      {FALLBACK_TEXT}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-200">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">تفاصيل البلاغ</h4>
                  <div className="mt-3 space-y-2">
                    <p>الوصف بالعربية: <span className="font-semibold">{normalizeText(report.descriptionAr)}</span></p>
                    <p>الوصف الأصلي: <span className="font-semibold">{normalizeText(report.description)}</span></p>
                    <p>نوع البلاغ الحالي: <span className="font-semibold">{getReportTypeLabel(report, typeLabelsByCode)}</span></p>
                    <p>الأولوية الحالية: <span className="font-semibold">{getPriorityLabel(report.priority)}</span></p>
                    <p>الحالة الحالية: <span className="font-semibold">{getReportStatusLabel(report.status, 'admin')}</span></p>
                    <p>تاريخ الإنشاء: <span className="font-semibold">{formatArabicDate(report.createdAt)}</span></p>
                    <p>ثقة الذكاء الاصطناعي: <span className="font-semibold">{formatConfidence(report.aiConfidence)}</span></p>
                    <p>موقع البلاغ: <span className="font-semibold">{formatLocation(report)}</span></p>
                    <p>ملاحظات المراجعة: <span className="font-semibold">{normalizeText(report.reviewComment)}</span></p>
                    {report.classificationError ? (
                      <p>خطأ التصنيف: <span className="font-semibold">{normalizeText(report.classificationError)}</span></p>
                    ) : null}
                  </div>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="rounded-2xl border border-slate-200/70 bg-white/85 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/55">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">تحديث بيانات البلاغ</h4>

                  <div className="mt-3 space-y-3">
                    <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      نوع البلاغ
                      <select
                        value={selectedType}
                        onChange={(event) => setSelectedType(event.target.value)}
                        className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-400 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-200"
                      >
                        <option value="">اختر نوع البلاغ</option>
                        {reportTypes.map((type) => (
                          <option key={type.code} value={type.code}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      {validationErrors.type ? (
                        <span className="text-[11px] text-rose-600 dark:text-rose-300">{validationErrors.type}</span>
                      ) : null}
                      {typesErrorMessage ? (
                        <span className="text-[11px] text-amber-600 dark:text-amber-300">{typesErrorMessage}</span>
                      ) : null}
                    </label>

                    <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      الأولوية
                      <select
                        value={selectedPriority}
                        onChange={(event) => setSelectedPriority(event.target.value as ReportPriority | '')}
                        className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-400 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-200"
                      >
                        <option value="">اختر الأولوية</option>
                        {reportPriorityOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {validationErrors.priority ? (
                        <span className="text-[11px] text-rose-600 dark:text-rose-300">{validationErrors.priority}</span>
                      ) : null}
                    </label>

                    <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      الجهة المسندة
                      <select
                        value={selectedAuthority}
                        onChange={(event) => setSelectedAuthority(event.target.value)}
                        className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-400 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-200"
                      >
                        <option value="">اختر الجهة المسندة</option>
                        {authorityOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {validationErrors.assignedAuth ? (
                        <span className="text-[11px] text-rose-600 dark:text-rose-300">{validationErrors.assignedAuth}</span>
                      ) : null}
                      {authoritiesErrorMessage ? (
                        <span className="text-[11px] text-amber-600 dark:text-amber-300">{authoritiesErrorMessage}</span>
                      ) : null}
                    </label>

                    <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      الوصف (اختياري)
                      <textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        rows={3}
                        className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-400 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-200"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      تعليق المراجعة
                      <textarea
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                        rows={3}
                        className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-400 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-200"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl border border-emerald-300/70 bg-emerald-500/12 px-4 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/20 disabled:opacity-65 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200"
                  >
                    {isSubmitting ? 'جاري حفظ المراجعة...' : 'حفظ المراجعة'}
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

export default HumanReviewModal
