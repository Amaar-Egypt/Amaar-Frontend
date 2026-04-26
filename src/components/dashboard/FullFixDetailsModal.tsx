import { useEffect, useState } from 'react'
import type { Fix, FixStatus } from '../../types/fix'
import { formatArabicDate } from '../../utils/reportPresentation'

interface FullFixDetailsModalProps {
  isOpen: boolean
  fix: Fix | null
  reportLabel: string
  canReview: boolean
  isAccepting?: boolean
  isRejecting?: boolean
  actionErrorMessage?: string | null
  onAccept: (fix: Fix) => Promise<void> | void
  onReject: (fix: Fix, comment: string) => Promise<void> | void
  onClose: () => void
}

const FALLBACK_TEXT = 'غير متوفر'
const REQUIRED_REJECT_COMMENT_MESSAGE = 'سبب الرفض مطلوب.'

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

const normalizeText = (value: string | null | undefined) => {
  if (!value) {
    return FALLBACK_TEXT
  }

  const trimmed = value.trim()
  return trimmed || FALLBACK_TEXT
}

const FullFixDetailsModal = ({
  isOpen,
  fix,
  reportLabel,
  canReview,
  isAccepting = false,
  isRejecting = false,
  actionErrorMessage = null,
  onAccept,
  onReject,
  onClose,
}: FullFixDetailsModalProps) => {
  const [isRejectFormOpen, setIsRejectFormOpen] = useState(false)
  const [rejectComment, setRejectComment] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setIsRejectFormOpen(false)
    setRejectComment('')
    setValidationError(null)
  }, [isOpen, fix?.id])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isAccepting && !isRejecting) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, isAccepting, isRejecting, onClose])

  if (!isOpen || !fix) {
    return null
  }

  const isPending = fix.status === 'pending'
  const canExecuteReviewAction = canReview && isPending && !isAccepting && !isRejecting

  const handleRejectSubmit = async () => {
    const normalizedComment = rejectComment.trim()

    if (!normalizedComment) {
      setValidationError(REQUIRED_REJECT_COMMENT_MESSAGE)
      return
    }

    setValidationError(null)
    await onReject(fix, normalizedComment)
  }

  return (
    <div dir="rtl" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="إغلاق نافذة تفاصيل الإصلاح"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={() => {
          if (!isAccepting && !isRejecting) {
            onClose()
          }
        }}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="التفاصيل الكاملة للإصلاح"
        className="relative z-10 w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/88 shadow-[0_35px_90px_rgba(2,6,23,0.6)]"
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
          <h3 className="text-lg font-extrabold text-slate-100 sm:text-xl">التفاصيل الكاملة للإصلاح</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isAccepting || isRejecting}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/5 text-slate-200 transition hover:bg-white/15 disabled:opacity-60"
          >
            ×
          </button>
        </header>

        <div className="max-h-[80vh] overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
                {fix.imageUrl ? (
                  <img
                    src={fix.imageUrl}
                    alt="صورة الإصلاح"
                    className="h-72 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-72 items-center justify-center text-sm font-semibold text-slate-400">
                    {FALLBACK_TEXT}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-4">
                <h4 className="text-sm font-bold text-slate-100">وصف الإصلاح</h4>
                <p className="mt-2 text-sm leading-7 text-slate-300">{normalizeText(fix.description)}</p>
              </div>

              {fix.comment ? (
                <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-4">
                  <h4 className="text-sm font-bold text-slate-100">ملاحظة المراجعة</h4>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{normalizeText(fix.comment)}</p>
                </div>
              ) : null}
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/55 p-4 text-sm text-slate-300">
              <h4 className="text-sm font-extrabold text-slate-100">بيانات الإصلاح</h4>

              <p>
                البلاغ المرتبط: <span className="font-semibold text-slate-100">{reportLabel}</span>
              </p>
              <p>
                صاحب الإصلاح: <span className="font-semibold text-slate-100">{FALLBACK_TEXT}</span>
              </p>
              <p>
                الحالة: <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getFixStatusTone(fix.status)}`}>
                  {FIX_STATUS_LABELS[fix.status]}
                </span>
              </p>
              <p>
                النقاط: <span className="font-semibold text-slate-100">{fix.pointsAwarded}</span>
              </p>
              <p>
                تاريخ الإنشاء: <span className="font-semibold text-slate-100">{formatArabicDate(fix.createdAt)}</span>
              </p>
              <p>
                آخر تحديث: <span className="font-semibold text-slate-100">{formatArabicDate(fix.updatedAt)}</span>
              </p>

              <div className="space-y-2 border-t border-white/10 pt-3">
                <p className="text-xs text-slate-400">
                  {canReview
                    ? (isPending ? 'يمكنك مراجعة هذا الإصلاح الآن.' : 'تمت مراجعة هذا الإصلاح بالفعل.')
                    : 'المراجعة متاحة لمستخدمي الإدارة والجهة المختصة فقط.'}
                </p>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => onAccept(fix)}
                    disabled={!canExecuteReviewAction}
                    className="rounded-xl border border-emerald-300/70 bg-emerald-500/12 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200"
                  >
                    {isAccepting ? 'جارٍ القبول...' : 'قبول'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRejectFormOpen((prev) => !prev)}
                    disabled={!canExecuteReviewAction}
                    className="rounded-xl border border-rose-300/70 bg-rose-500/12 px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200"
                  >
                    رفض
                  </button>
                </div>

                {isRejectFormOpen ? (
                  <div className="space-y-2 rounded-xl border border-white/10 bg-slate-950/45 p-3">
                    <label htmlFor="fix-reject-comment" className="block text-xs font-semibold text-slate-300">
                      سبب رفض الإصلاح
                    </label>

                    <textarea
                      id="fix-reject-comment"
                      value={rejectComment}
                      disabled={isRejecting || isAccepting}
                      onChange={(event) => {
                        setRejectComment(event.target.value)
                        if (validationError) {
                          setValidationError(null)
                        }
                      }}
                      placeholder="اكتب سبب الرفض هنا..."
                      className="min-h-24 w-full resize-y rounded-xl border border-white/15 bg-slate-900/65 px-3 py-2 text-sm text-slate-100 outline-none ring-emerald-500/40 transition focus:ring"
                    />

                    {validationError ? (
                      <p className="text-xs font-semibold text-rose-300">{validationError}</p>
                    ) : null}

                    <button
                      type="button"
                      onClick={handleRejectSubmit}
                      disabled={!canExecuteReviewAction || isRejecting}
                      className="w-full rounded-xl border border-rose-300/70 bg-rose-500/12 px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200"
                    >
                      {isRejecting ? 'جارٍ الرفض...' : 'تأكيد الرفض'}
                    </button>
                  </div>
                ) : null}

                {actionErrorMessage ? (
                  <p className="rounded-xl border border-rose-400/45 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-200">
                    {actionErrorMessage}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default FullFixDetailsModal
