import { useEffect, useState } from 'react'

interface AiRejectModalProps {
  isOpen: boolean
  isSubmitting?: boolean
  onConfirm: (reason: string) => Promise<void> | void
  onClose: () => void
}

const REQUIRED_REASON_MESSAGE = 'سبب رفض الذكاء مطلوب.'

const AiRejectModal = ({
  isOpen,
  isSubmitting = false,
  onConfirm,
  onClose,
}: AiRejectModalProps) => {
  const [reason, setReason] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setReason('')
    setValidationError(null)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) {
    return null
  }

  const handleConfirm = async () => {
    const normalizedReason = reason.trim()

    if (!normalizedReason) {
      setValidationError(REQUIRED_REASON_MESSAGE)
      return
    }

    setValidationError(null)
    await onConfirm(normalizedReason)
  }

  return (
    <div dir="rtl" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
        onClick={() => {
          if (!isSubmitting) {
            onClose()
          }
        }}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="سبب رفض الذكاء"
        className="relative w-full max-w-xl rounded-3xl border border-slate-200/75 bg-white/95 p-5 shadow-[0_28px_70px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95 dark:shadow-[0_35px_90px_rgba(2,6,23,0.55)] sm:p-6"
      >
        <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">سبب رفض الذكاء</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          سيتم تحويل البلاغ إلى المراجعة البشرية بعد توثيق سبب الرفض.
        </p>

        <label htmlFor="ai-reject-reason" className="mt-4 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          اكتب سبب الرفض هنا...
        </label>
        <textarea
          id="ai-reject-reason"
          value={reason}
          disabled={isSubmitting}
          onChange={(event) => {
            setReason(event.target.value)
            if (validationError) {
              setValidationError(null)
            }
          }}
          placeholder="اكتب سبب الرفض هنا..."
          className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-slate-300/80 bg-slate-50/90 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-200/60 dark:border-white/10 dark:bg-slate-800/75 dark:text-slate-100 dark:focus:border-rose-400/70 dark:focus:ring-rose-500/20"
        />

        {validationError ? (
          <p className="mt-2 text-xs font-semibold text-rose-700 dark:text-rose-300">{validationError}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-start gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="rounded-xl border border-rose-300/70 bg-rose-500/12 px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-500/20 disabled:opacity-65 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200"
          >
            {isSubmitting ? 'جارٍ التحويل للمراجعة...' : 'تأكيد التحويل'}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-300/75 bg-white/70 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-65 dark:border-white/15 dark:bg-slate-900/65 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            إلغاء
          </button>
        </div>
      </section>
    </div>
  )
}

export default AiRejectModal
