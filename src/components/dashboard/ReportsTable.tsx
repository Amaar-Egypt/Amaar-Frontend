import { useMemo, useState } from 'react'
import type { Report } from '../../types/report'
import type { UserRole } from '../../types/auth'
import ExecutionRejectModal from './ExecutionRejectModal'
import {
  formatArabicDate,
  getPriorityLabel,
  getReportStatusLabel,
  getReportTypeLabel,
  reportPriorityOptions,
  reportTypeOptions,
} from '../../utils/reportPresentation'
import type { ReportPriority, ReportTypeCode } from '../../types/report'

interface ReportsTableProps {
  reports: Report[]
  viewerRole?: UserRole | null
  selectedReportId?: string | null
  actionLoadingById: Record<string, string>
  onAccept: (reportId: string) => void
  onReject: (reportId: string) => void
  onHumanReviewUpdate: (params: {
    reportId: string
    type: ReportTypeCode
    priority: ReportPriority
    assignedAuth?: string
  }) => void
  onHumanReviewApprove: (params: {
    reportId: string
    type: ReportTypeCode
    priority: ReportPriority
    assignedAuth?: string
  }) => void
  onHumanReviewReject: (params: { reportId: string; comment?: string }) => void
  onStartWork: (reportId: string) => void
  onPendingReject: (params: { reportId: string; reason: string }) => Promise<boolean> | boolean
  onResolve: (reportId: string) => void
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

  if (status === 'rejected') {
    return 'border-slate-300/70 bg-slate-500/15 text-slate-700 dark:border-slate-500/45 dark:bg-slate-500/20 dark:text-slate-200'
  }

  return 'border-emerald-300/70 bg-emerald-500/15 text-emerald-700 dark:border-emerald-400/45 dark:bg-emerald-500/18 dark:text-emerald-200'
}

const ReportsTable = ({
  reports,
  viewerRole = null,
  selectedReportId = null,
  actionLoadingById,
  onAccept,
  onReject,
  onHumanReviewUpdate,
  onHumanReviewApprove,
  onHumanReviewReject,
  onStartWork,
  onPendingReject,
  onResolve,
  onRowClick,
}: ReportsTableProps) => {
  const isAuthorityViewer = viewerRole === 'authority'
  const isAdminViewer = viewerRole === 'admin'
  const canHandleAiReview = isAuthorityViewer || isAdminViewer

  const [humanReviewValuesById, setHumanReviewValuesById] = useState<Record<string, {
    type: ReportTypeCode
    priority: ReportPriority
    assignedAuth: string
  }>>({})
  const [humanReviewRejectCommentById, setHumanReviewRejectCommentById] = useState<Record<string, string>>({})
  const [pendingRejectReportId, setPendingRejectReportId] = useState<string | null>(null)

  const getHumanReviewDraft = useMemo(() => {
    return (report: Report) => {
      return humanReviewValuesById[report.id] ?? {
        type: report.type ?? 'other',
        priority: report.priority,
        assignedAuth: report.assignedAuth ?? '',
      }
    }
  }, [humanReviewValuesById])

  const isPendingRejectSubmitting = Boolean(
    pendingRejectReportId && actionLoadingById[pendingRejectReportId] === 'reject-execution',
  )

  const closePendingRejectModal = () => {
    if (isPendingRejectSubmitting) {
      return
    }

    setPendingRejectReportId(null)
  }

  const handleConfirmPendingReject = async (reason: string) => {
    if (!pendingRejectReportId) {
      return
    }

    const didSucceed = await Promise.resolve(onPendingReject({
      reportId: pendingRejectReportId,
      reason,
    }))

    if (didSucceed) {
      setPendingRejectReportId(null)
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
              <th className="px-4 py-3 text-right font-bold">الإجراء</th>
            </tr>
          </thead>

          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400"
                >
                  لا توجد بلاغات مطابقة للفلاتر الحالية.
                </td>
              </tr>
            ) : (
              reports.map((report) => {
                const activeAction = actionLoadingById[report.id]
                const isSelected = selectedReportId === report.id
                const humanReviewDraft = getHumanReviewDraft(report)
                const rejectComment = humanReviewRejectCommentById[report.id] ?? ''

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
                          alt={getReportTypeLabel(report)}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{getReportTypeLabel(report)}</td>
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
                                  onReject(report.id)
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
                            className="min-w-[300px] space-y-2"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            <select
                              value={humanReviewDraft.type}
                              disabled={Boolean(activeAction)}
                              onChange={(event) => {
                                const nextType = event.target.value as ReportTypeCode
                                setHumanReviewValuesById((prev) => ({
                                  ...prev,
                                  [report.id]: {
                                    ...humanReviewDraft,
                                    type: nextType,
                                  },
                                }))
                              }}
                              className="w-full rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-slate-900/65 dark:text-slate-200"
                            >
                              {reportTypeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center gap-2">
                              <select
                                value={humanReviewDraft.priority}
                                disabled={Boolean(activeAction)}
                                onChange={(event) => {
                                  const nextPriority = event.target.value as ReportPriority
                                  setHumanReviewValuesById((prev) => ({
                                    ...prev,
                                    [report.id]: {
                                      ...humanReviewDraft,
                                      priority: nextPriority,
                                    },
                                  }))
                                }}
                                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-slate-900/65 dark:text-slate-200"
                              >
                                {reportPriorityOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>

                              <input
                                type="text"
                                value={humanReviewDraft.assignedAuth}
                                disabled={Boolean(activeAction)}
                                onChange={(event) => {
                                  setHumanReviewValuesById((prev) => ({
                                    ...prev,
                                    [report.id]: {
                                      ...humanReviewDraft,
                                      assignedAuth: event.target.value,
                                    },
                                  }))
                                }}
                                placeholder="معرّف الجهة"
                                className="min-w-0 w-32 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-slate-900/65 dark:text-slate-200"
                              />
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                disabled={Boolean(activeAction)}
                                onClick={() => onHumanReviewUpdate({
                                  reportId: report.id,
                                  type: humanReviewDraft.type,
                                  priority: humanReviewDraft.priority,
                                  assignedAuth: humanReviewDraft.assignedAuth.trim() || undefined,
                                })}
                                className="rounded-lg border border-cyan-300/70 bg-cyan-500/12 px-3 py-1 text-xs font-bold text-cyan-700 transition hover:bg-cyan-500/20 disabled:opacity-65 dark:border-cyan-400/40 dark:bg-cyan-500/15 dark:text-cyan-200"
                              >
                                {activeAction === 'human-update' ? 'جارٍ تحديث المراجعة...' : 'تحديث المراجعة'}
                              </button>

                              <button
                                type="button"
                                disabled={Boolean(activeAction)}
                                onClick={() => onHumanReviewApprove({
                                  reportId: report.id,
                                  type: humanReviewDraft.type,
                                  priority: humanReviewDraft.priority,
                                  assignedAuth: humanReviewDraft.assignedAuth.trim() || undefined,
                                })}
                                className="rounded-lg border border-emerald-300/70 bg-emerald-500/12 px-3 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/20 disabled:opacity-65 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200"
                              >
                                {activeAction === 'human-approve' ? 'جارٍ الاعتماد النهائي...' : 'اعتماد نهائي'}
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={rejectComment}
                                disabled={Boolean(activeAction)}
                                onChange={(event) => {
                                  setHumanReviewRejectCommentById((prev) => ({
                                    ...prev,
                                    [report.id]: event.target.value,
                                  }))
                                }}
                                placeholder="سبب الرفض البشري (اختياري)"
                                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-rose-400 dark:border-white/10 dark:bg-slate-900/65 dark:text-slate-200"
                              />

                              <button
                                type="button"
                                disabled={Boolean(activeAction)}
                                onClick={() => onHumanReviewReject({
                                  reportId: report.id,
                                  comment: rejectComment.trim() || undefined,
                                })}
                                className="rounded-lg border border-rose-300/70 bg-rose-500/12 px-3 py-1 text-xs font-bold text-rose-700 transition hover:bg-rose-500/20 disabled:opacity-65 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200"
                              >
                                {activeAction === 'human-reject' ? 'جارٍ رفض البلاغ...' : 'رفض البلاغ'}
                              </button>
                            </div>
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

                            <button
                              type="button"
                              disabled={Boolean(activeAction)}
                              onClick={(event) => {
                                event.stopPropagation()
                                setPendingRejectReportId(report.id)
                              }}
                              className="rounded-lg border border-rose-300/70 bg-rose-500/12 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-500/20 disabled:opacity-65 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200"
                            >
                              {activeAction === 'reject-execution' ? 'جارٍ التحويل للمراجعة...' : 'رفض التنفيذ'}
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

                      {report.status === 'rejected' ? (
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          مرفوض
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

      <ExecutionRejectModal
        isOpen={Boolean(pendingRejectReportId)}
        isSubmitting={isPendingRejectSubmitting}
        onClose={closePendingRejectModal}
        onConfirm={handleConfirmPendingReject}
      />
    </>
  )
}

export default ReportsTable
