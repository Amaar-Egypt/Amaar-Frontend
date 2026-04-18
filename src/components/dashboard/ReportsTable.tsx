import { useMemo, useState } from 'react'
import type { Report } from '../../types/report'
import type { UserRole } from '../../types/auth'
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
  onManualApprove: (params: {
    reportId: string
    type: ReportTypeCode
    priority: ReportPriority
  }) => void
  onStartWork: (reportId: string) => void
  onEscalate: (params: { reportId: string; comment: string }) => void
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

  return 'border-emerald-300/70 bg-emerald-500/15 text-emerald-700 dark:border-emerald-400/45 dark:bg-emerald-500/18 dark:text-emerald-200'
}

const ReportsTable = ({
  reports,
  viewerRole = null,
  selectedReportId = null,
  actionLoadingById,
  onAccept,
  onReject,
  onManualApprove,
  onStartWork,
  onEscalate,
  onResolve,
  onRowClick,
}: ReportsTableProps) => {
  const canReviewAi = viewerRole === 'admin' || viewerRole === 'authority'
  const canManualClassify = viewerRole === 'admin'
  const canWorkOnAssignedReports = viewerRole === 'authority'

  const [manualValuesById, setManualValuesById] = useState<Record<string, {
    type: ReportTypeCode
    priority: ReportPriority
  }>>({})
  const [escalationCommentById, setEscalationCommentById] = useState<Record<string, string>>({})

  const getManualDraft = useMemo(() => {
    return (report: Report) => {
      return manualValuesById[report.id] ?? {
        type: report.type ?? 'other',
        priority: report.priority,
      }
    }
  }, [manualValuesById])

  return (
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
                const manualDraft = getManualDraft(report)
                const escalationComment = escalationCommentById[report.id] ?? ''

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
                        {getReportStatusLabel(report.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {report.status === 'ai_review' ? (
                        <div className="flex min-w-[220px] flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={Boolean(activeAction) || !canReviewAi}
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
                            disabled={Boolean(activeAction) || !canReviewAi}
                            onClick={(event) => {
                              event.stopPropagation()
                              onReject(report.id)
                            }}
                            className="rounded-lg border border-rose-300/70 bg-rose-500/12 px-3 py-1 text-xs font-bold text-rose-700 transition hover:bg-rose-500/20 disabled:opacity-65 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200"
                          >
                            {activeAction === 'reject-ai' ? 'جارٍ التحويل لبشري...' : 'رفض الذكاء'}
                          </button>

                          {!canReviewAi ? (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              هذه المرحلة متاحة للإدارة أو الجهة المختصة المسندة.
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      {report.status === 'human_review' ? (
                        <div
                          className="min-w-[230px] space-y-2"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <select
                            value={manualDraft.type}
                            disabled={Boolean(activeAction) || !canManualClassify}
                            onChange={(event) => {
                              const nextType = event.target.value as ReportTypeCode
                              setManualValuesById((prev) => ({
                                ...prev,
                                [report.id]: {
                                  ...manualDraft,
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
                              value={manualDraft.priority}
                              disabled={Boolean(activeAction) || !canManualClassify}
                              onChange={(event) => {
                                const nextPriority = event.target.value as ReportPriority
                                setManualValuesById((prev) => ({
                                  ...prev,
                                  [report.id]: {
                                    ...manualDraft,
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

                            <button
                              type="button"
                              disabled={Boolean(activeAction) || !canManualClassify}
                              onClick={() => onManualApprove({
                                reportId: report.id,
                                type: manualDraft.type,
                                priority: manualDraft.priority,
                              })}
                              className="rounded-lg border border-emerald-300/70 bg-emerald-500/12 px-3 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/20 disabled:opacity-65 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200"
                            >
                              {activeAction === 'manual-approve' ? 'جارٍ الاعتماد...' : 'اعتماد يدوي'}
                            </button>
                          </div>

                          {!canManualClassify ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              التصنيف اليدوي متاح للإدارة فقط.
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {report.status === 'pending' ? (
                        <div
                          className="min-w-[230px] space-y-2"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={Boolean(activeAction) || !canWorkOnAssignedReports}
                            onClick={() => onStartWork(report.id)}
                            className="w-full rounded-lg border border-emerald-300/70 bg-emerald-500/12 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/20 disabled:opacity-65 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200"
                          >
                            {activeAction === 'start-work' ? 'جارٍ بدء التنفيذ...' : 'بدء التنفيذ'}
                          </button>

                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={escalationComment}
                              disabled={Boolean(activeAction) || !canWorkOnAssignedReports}
                              onChange={(event) => {
                                setEscalationCommentById((prev) => ({
                                  ...prev,
                                  [report.id]: event.target.value,
                                }))
                              }}
                                placeholder="سبب التحويل للمراجعة البشرية"
                              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-amber-400 dark:border-white/10 dark:bg-slate-900/65 dark:text-slate-200"
                            />
                            <button
                              type="button"
                              disabled={Boolean(activeAction) || !canWorkOnAssignedReports || !escalationComment.trim()}
                              onClick={() => {
                                const comment = escalationComment.trim()

                                if (!comment) {
                                  return
                                }

                                onEscalate({
                                  reportId: report.id,
                                  comment,
                                })

                                setEscalationCommentById((prev) => ({
                                  ...prev,
                                  [report.id]: '',
                                }))
                              }}
                              className="rounded-lg border border-amber-300/70 bg-amber-500/12 px-3 py-1 text-xs font-bold text-amber-700 transition hover:bg-amber-500/20 disabled:opacity-65 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200"
                            >
                                {activeAction === 'escalate' ? 'جارٍ التحويل...' : 'تحويل'}
                            </button>
                          </div>

                          {!canWorkOnAssignedReports ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                التنفيذ والتحويل متاحان للجهة المختصة المسندة فقط.
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {report.status === 'in_progress' ? (
                        <button
                          type="button"
                          disabled={Boolean(activeAction) || !canWorkOnAssignedReports}
                          onClick={(event) => {
                            event.stopPropagation()
                            onResolve(report.id)
                          }}
                          className="rounded-lg border border-indigo-300/70 bg-indigo-500/12 px-3 py-1 text-xs font-bold text-indigo-700 transition hover:bg-indigo-500/20 disabled:opacity-65 dark:border-indigo-400/40 dark:bg-indigo-500/15 dark:text-indigo-200"
                        >
                          {activeAction === 'resolve' ? 'جارٍ إغلاق البلاغ...' : 'إغلاق البلاغ'}
                        </button>
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
  )
}

export default ReportsTable
