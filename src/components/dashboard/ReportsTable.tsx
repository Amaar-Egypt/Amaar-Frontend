import { useState } from 'react'
import type { Report } from '../../types/report'
import type { UserRole } from '../../types/auth'
import AiRejectModal from './AiRejectModal.tsx'
import {
  formatArabicDate,
  getPriorityLabel,
  getReportStatusLabel,
  getReportTypeLabel,
} from '../../utils/reportPresentation'

interface ReportsTableProps {
  reports: Report[]
  viewerRole?: UserRole | null
  selectedReportId?: string | null
  typeLabelsByCode?: Record<string, string>
  fixesCountByReportId: Record<string, number>
  fixesCountLoadingByReportId: Record<string, boolean>
  fixesCountErrorByReportId: Record<string, string>
  actionLoadingById: Record<string, string>
  onAccept: (reportId: string) => void
  onReject: (params: { reportId: string; reason: string }) => Promise<boolean> | boolean
  onApproveHumanReview: (report: Report) => void
  onOpenHumanReview: (report: Report) => void
  onStartWork: (reportId: string) => void
  onResolve: (reportId: string) => void
  onOpenReportFixes: (report: Report) => void
  onRowClick?: (report: Report) => void
}

const getPriorityClassName = (priority: Report['priority']) => {
  if (priority === 'critical' || priority === 'high') {
    return 'text-rose-700 dark:text-rose-300'
  }

  if (priority === 'medium') {
    return 'text-amber-700 dark:text-amber-300'
  }

  return 'text-emerald-700 dark:text-emerald-300'
}

const getStatusClassName = (status: Report['status']) => {
  if (status === 'ai_review') {
    return 'border-amber-300/70 bg-amber-500/15 text-amber-700 dark:border-amber-400/45 dark:bg-amber-500/18 dark:text-amber-200'
  }

  if (status === 'human_review') {
    return 'border-rose-300/70 bg-rose-500/15 text-rose-700 dark:border-rose-400/45 dark:bg-rose-500/18 dark:text-rose-200'
  }

  return 'border-emerald-300/70 bg-emerald-500/15 text-emerald-700 dark:border-emerald-400/45 dark:bg-emerald-500/18 dark:text-emerald-200'
}

const ReportsTable = ({
  reports,
  viewerRole = null,
  selectedReportId = null,
  typeLabelsByCode = {},
  fixesCountByReportId,
  fixesCountLoadingByReportId,
  fixesCountErrorByReportId,
  actionLoadingById,
  onAccept,
  onReject,
  onApproveHumanReview,
  onOpenHumanReview,
  onStartWork,
  onResolve,
  onOpenReportFixes,
  onRowClick,
}: ReportsTableProps) => {
  const isAuthorityViewer = viewerRole === 'authority'
  const isAdminViewer = viewerRole === 'admin'
  const canHandleAiReview = isAuthorityViewer || isAdminViewer

  const [aiRejectReportId, setAiRejectReportId] = useState<string | null>(null)

  const isAiRejectSubmitting = Boolean(
    aiRejectReportId && actionLoadingById[aiRejectReportId] === 'reject-ai',
  )

  const closeAiRejectModal = () => {
    if (isAiRejectSubmitting) {
      return
    }

    setAiRejectReportId(null)
  }

  const handleConfirmAiReject = async (reason: string) => {
    if (!aiRejectReportId) {
      return
    }

    const didSucceed = await Promise.resolve(onReject({
      reportId: aiRejectReportId,
      reason,
    }))

    if (didSucceed) {
      setAiRejectReportId(null)
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/75 shadow-[0_20px_46px_rgba(15,23,42,0.1)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_30px_75px_rgba(2,6,23,0.5)]">
        <div className="overflow-x-auto">
          <table dir="rtl" className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-100/75 text-slate-700 dark:bg-slate-950/45 dark:text-slate-200">
            <tr>
              <th className="px-4 py-3 text-right font-bold">صورة</th>
              <th className="px-4 py-3 text-right font-bold">نوع البلاغ</th>
              <th className="px-4 py-3 text-right font-bold">الأولوية</th>
              <th className="px-4 py-3 text-right font-bold">التاريخ</th>
              <th className="px-4 py-3 text-right font-bold">الحالة</th>
              <th className="px-4 py-3 text-right font-bold">الإصلاحات</th>
              <th className="px-4 py-3 text-right font-bold">الإجراء</th>
            </tr>
          </thead>

          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400"
                >
                  لا توجد بلاغات مطابقة للفلاتر الحالية.
                </td>
              </tr>
            ) : (
              reports.map((report) => {
                const activeAction = actionLoadingById[report.id]
                const isSelected = selectedReportId === report.id
                const isFixesCountLoading = Boolean(fixesCountLoadingByReportId[report.id])
                const fixesCountError = fixesCountErrorByReportId[report.id]
                const fixesCount = fixesCountByReportId[report.id]
                return (
                  <tr
                    key={report.id}
                    onClick={() => onRowClick?.(report)}
                    onKeyDown={(event) => {
                      if (!onRowClick) {
                        return
                      }

                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onRowClick(report)
                      }
                    }}
                    role={onRowClick ? 'button' : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    className={`border-t border-slate-200/70 text-slate-700 transition dark:border-white/8 dark:text-slate-200 ${
                      isSelected
                        ? 'bg-emerald-500/10 dark:bg-emerald-500/12'
                        : 'hover:bg-slate-100/65 dark:hover:bg-white/5'
                    } ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="h-10 w-10 overflow-hidden rounded-lg border border-slate-200/80 bg-slate-100 dark:border-white/10 dark:bg-slate-800">
                        <img
                          src={report.imageUrl}
                          alt={getReportTypeLabel(report, typeLabelsByCode)}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{getReportTypeLabel(report, typeLabelsByCode)}</td>
                    <td className={`px-4 py-3 text-xs font-bold sm:text-sm ${getPriorityClassName(report.priority)}`}>
                      {getPriorityLabel(report.priority)}
                    </td>
                    <td className="px-4 py-3 text-xs sm:text-sm">{formatArabicDate(report.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClassName(report.status)}`}>
                        {getReportStatusLabel(report.status, viewerRole)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onOpenReportFixes(report)
                        }}
                        className="inline-flex min-w-[72px] items-center justify-center rounded-lg border border-cyan-300/70 bg-cyan-500/12 px-3 py-1 text-xs font-bold text-cyan-700 transition hover:bg-cyan-500/20 dark:border-cyan-400/45 dark:bg-cyan-500/15 dark:text-cyan-200"
                        title="عرض إصلاحات البلاغ"
                      >
                        {isFixesCountLoading
                          ? '...'
                          : fixesCountError
                            ? 'تعذر التحميل'
                            : `${typeof fixesCount === 'number' ? fixesCount : 0}`}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {report.status === 'ai_review' ? (
                        <div className="flex min-w-[220px] flex-wrap items-center gap-2">
                          {canHandleAiReview ? (
                            <>
                              <button
                                type="button"
                                disabled={Boolean(activeAction)}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onAccept(report.id)
                                }}
                                className="rounded-lg border border-emerald-300/70 bg-emerald-500/12 px-3 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/20 disabled:opacity-65 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200"
                              >
                                {activeAction === 'accept-ai' ? 'جارٍ اعتماد الذكاء...' : 'اعتماد الذكاء'}
                              </button>

                              <button
                                type="button"
                                disabled={Boolean(activeAction)}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setAiRejectReportId(report.id)
                                }}
                                className="rounded-lg border border-rose-300/70 bg-rose-500/12 px-3 py-1 text-xs font-bold text-rose-700 transition hover:bg-rose-500/20 disabled:opacity-65 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200"
                              >
                                {activeAction === 'reject-ai' ? 'جارٍ التحويل لبشري...' : 'رفض الذكاء'}
                              </button>
                            </>
                            ) : null}
                        </div>
                      ) : null}

                      {report.status === 'human_review' ? (
                        isAdminViewer ? (
                          <div
                            className="flex min-w-[220px] flex-wrap items-center gap-2"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              disabled={Boolean(activeAction) || !report.assignedAuth || !report.type}
                              onClick={() => onApproveHumanReview(report)}
                              className="rounded-lg border border-emerald-300/70 bg-emerald-500/12 px-3 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/20 disabled:opacity-65 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200"
                              title={
                                !report.assignedAuth || !report.type
                                  ? 'يرجى تحديد نوع البلاغ والجهة المسندة قبل الإرسال للتنفيذ.'
                                  : undefined
                              }
                            >
                              {activeAction === 'approve-human' ? 'جارٍ الإرسال للتنفيذ...' : 'إرسال للتنفيذ'}
                            </button>

                            <button
                              type="button"
                              disabled={Boolean(activeAction)}
                              onClick={() => onOpenHumanReview(report)}
                              className="rounded-lg border border-cyan-300/70 bg-cyan-500/12 px-3 py-1 text-xs font-bold text-cyan-700 transition hover:bg-cyan-500/20 disabled:opacity-65 dark:border-cyan-400/40 dark:bg-cyan-500/15 dark:text-cyan-200"
                            >
                              {activeAction === 'manual-review' ? 'جارٍ تحديث المراجعة...' : 'تحديث المراجعة'}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                              تم تحويل البلاغ للمراجعة البشرية
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              بانتظار مراجعة الإدارة.
                            </p>
                          </div>
                        )
                      ) : null}

                      {report.status === 'pending' ? (
                        isAuthorityViewer ? (
                          <div className="flex min-w-[220px] flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={Boolean(activeAction)}
                              onClick={(event) => {
                                event.stopPropagation()
                                onStartWork(report.id)
                              }}
                              className="rounded-lg border border-emerald-300/70 bg-emerald-500/12 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/20 disabled:opacity-65 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200"
                            >
                              {activeAction === 'start-work' ? 'جارٍ بدء التنفيذ...' : 'بدء التنفيذ'}
                            </button>
                          </div>
                        ) : null
                      ) : null}

                      {report.status === 'in_progress' ? (
                        isAuthorityViewer ? (
                          <button
                            type="button"
                            disabled={Boolean(activeAction)}
                            onClick={(event) => {
                              event.stopPropagation()
                              onResolve(report.id)
                            }}
                            className="rounded-lg border border-indigo-300/70 bg-indigo-500/12 px-3 py-1 text-xs font-bold text-indigo-700 transition hover:bg-indigo-500/20 disabled:opacity-65 dark:border-indigo-400/40 dark:bg-indigo-500/15 dark:text-indigo-200"
                          >
                            {activeAction === 'resolve' ? 'جارٍ إغلاق البلاغ...' : 'إغلاق البلاغ'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            قيد التنفيذ لدى الجهة المختصة.
                          </span>
                        )
                      ) : null}

                      {report.status === 'resolved' ? (
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          مكتمل
                        </span>
                      ) : null}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
          </table>
        </div>
      </div>

      <AiRejectModal
        isOpen={Boolean(aiRejectReportId)}
        isSubmitting={isAiRejectSubmitting}
        onClose={closeAiRejectModal}
        onConfirm={handleConfirmAiReject}
      />
    </>
  )
}

export default ReportsTable
