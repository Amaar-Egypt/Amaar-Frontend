import { useCallback, useRef, useState } from 'react'
import reportService from '../services/reportService'
import type {
  DashboardStats,
  Report,
  ReportPriority,
  ReportsFilterTab,
  ReportStatus,
  ReportTypeCode,
} from '../types/report'
import {
  calculateDashboardStatsFromReports,
  createEmptyDashboardStats,
} from '../utils/reportStats'
import { getApiErrorMessage } from '../utils/apiResponse'
import type { AuthUser } from '../types/auth'

const DEFAULT_ERROR_MESSAGE = 'حدث خطأ أثناء تحميل البلاغات. حاول مرة أخرى.'
const DEFAULT_ACTION_ERROR_MESSAGE = 'تعذر تنفيذ الإجراء على البلاغ.'
const DEFAULT_HUMAN_REVIEW_REJECT_COMMENT = 'تم رفض البلاغ بعد المراجعة البشرية.'
const DEFAULT_PENDING_REJECT_REASON_ERROR = 'سبب رفض التنفيذ مطلوب.'
const DEFAULT_PAGE_SIZE = 10
const isReportVisibilityDebugEnabled =
  import.meta.env.DEV || import.meta.env.VITE_DEBUG_REPORT_VISIBILITY === 'true'

type ReportActionKind =
  | 'accept-ai'
  | 'reject-ai'
  | 'reject-execution'
  | 'human-update'
  | 'human-approve'
  | 'human-reject'
  | 'start-work'
  | 'resolve'

interface StatusUpdatePayload {
  status?: ReportStatus
  type?: ReportTypeCode
  priority?: ReportPriority
  assignedAuth?: string
  reviewComment?: string
  rejectionReason?: string
}

interface FetchReportsOptions {
  isManualRefresh?: boolean
  refreshSummary?: boolean
}

interface UseAuthorityReportsOptions {
  viewer: AuthUser | null
}

const AUTHORITY_VISIBLE_STATUSES: ReportStatus[] = [
  'ai_review',
  'human_review',
  'pending',
  'in_progress',
  'resolved',
  'rejected',
]

const normalizeIdentifier = (value: string | null | undefined) => {
  if (!value) {
    return null
  }

  const normalized = value.trim().toLowerCase()
  return normalized || null
}

const filterReportsForViewer = (allReports: Report[], viewer: AuthUser | null) => {
  if (!viewer || viewer.role !== 'authority') {
    return allReports
  }

  const viewerAuthorityId = normalizeIdentifier(viewer.authorityId)
  const viewerUserId = normalizeIdentifier(viewer.id)

  const allowedAuthorityKey = viewerAuthorityId ?? viewerUserId

  if (!allowedAuthorityKey) {
    return []
  }

  return allReports.filter((report) => {
    if (!AUTHORITY_VISIBLE_STATUSES.includes(report.status)) {
      return false
    }

    const reportAuthorityKey = normalizeIdentifier(report.assignedAuth)

    if (!reportAuthorityKey) {
      return false
    }

    return reportAuthorityKey === allowedAuthorityKey
  })
}

const applyReportTransition = (
  report: Report,
  nextStatus: ReportStatus,
  reviewComment?: string,
  patch?: Partial<Report>,
) => {
  const nextReport: Report = {
    ...report,
    ...patch,
    status: nextStatus,
  }

  if (typeof reviewComment !== 'undefined') {
    nextReport.reviewComment = reviewComment
  }

  return {
    ...nextReport,
  }
}

const useAuthorityReports = ({ viewer }: UseAuthorityReportsOptions) => {
  const [reports, setReports] = useState<Report[]>([])
  const [counts, setCounts] = useState<DashboardStats>(() => createEmptyDashboardStats())
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCountsLoading, setIsCountsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null)
  const [actionLoadingById, setActionLoadingById] = useState<Record<string, ReportActionKind>>({})

  const reportsRef = useRef<Report[]>([])

  const syncReports = useCallback((nextReports: Report[]) => {
    reportsRef.current = nextReports
    setReports(nextReports)
    setCounts(calculateDashboardStatsFromReports(nextReports))
  }, [])

  const refreshCounts = useCallback(async () => {
    setIsCountsLoading(true)

    try {
      setCounts(calculateDashboardStatsFromReports(reportsRef.current))
    } finally {
      setIsCountsLoading(false)
    }
  }, [])

  const fetchReports = useCallback(async (options: FetchReportsOptions = {}) => {
    const { isManualRefresh = false, refreshSummary = false } = options

    if (isManualRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setErrorMessage(null)

    try {
      // Keep reports in memory so role filters are applied globally
      // before table pagination is calculated in the page layer.
      const allReports = await reportService.listAllAuthorityReports()
      const roleAwareReports = filterReportsForViewer(allReports, viewer)

      if (isReportVisibilityDebugEnabled) {
        const reportsSample = allReports.slice(0, 5).map((report) => ({
          id: report.id,
          status: report.status,
          assignedAuth: report.assignedAuth,
        }))

        const normalizedViewerAuthorityId = normalizeIdentifier(viewer?.authorityId)
        const normalizedViewerUserId = normalizeIdentifier(viewer?.id)

        console.log('[useAuthorityReports] visibility debug', {
          viewerRole: viewer?.role ?? null,
          viewerAuthorityId: viewer?.authorityId ?? null,
          normalizedViewerAuthorityId,
          normalizedViewerUserId,
          appliedAuthorityKey: normalizedViewerAuthorityId ?? normalizedViewerUserId,
          totalFetchedReports: allReports.length,
          totalVisibleReports: roleAwareReports.length,
          reportsSample,
        })
      }

      syncReports(roleAwareReports)

      if (refreshSummary) {
        setCounts(calculateDashboardStatsFromReports(roleAwareReports))
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, DEFAULT_ERROR_MESSAGE))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [syncReports, viewer])

  const getTabReports = useCallback(
    (tab: ReportsFilterTab) => {
      if (tab === 'all') {
        return reports
      }

      return reports.filter((report) => report.status === tab)
    },
    [reports],
  )

  const performStatusUpdate = useCallback(async ({
    reportId,
    action,
    payload,
    fallbackStatus,
    fallbackPatch,
    fallbackReviewComment,
  }: {
    reportId: string
    action: ReportActionKind
    payload: StatusUpdatePayload
    fallbackStatus: ReportStatus
    fallbackPatch?: Partial<Report>
    fallbackReviewComment?: string
  }): Promise<boolean> => {
    setActionErrorMessage(null)
    setActionLoadingById((prev) => ({ ...prev, [reportId]: action }))

    try {
      const updatedReport = await reportService.updateReport(reportId, payload)
      const nextStatus = updatedReport?.status ?? fallbackStatus

      if (updatedReport) {
        syncReports(
          reportsRef.current.map((report) =>
            report.id === reportId ? updatedReport : report,
          ),
        )
      } else {
        syncReports(
          reportsRef.current.map((report) =>
            report.id === reportId
              ? applyReportTransition(
                  report,
                  nextStatus,
                  fallbackReviewComment,
                  fallbackPatch,
                )
              : report,
          ),
        )
      }

      return true
    } catch (error) {
      setActionErrorMessage(getApiErrorMessage(error, DEFAULT_ACTION_ERROR_MESSAGE))

      return false
    } finally {
      setActionLoadingById((prev) => {
        const next = { ...prev }
        delete next[reportId]
        return next
      })
    }
  }, [syncReports])

  const acceptReport = useCallback(async (reportId: string) => {
    setActionErrorMessage(null)
    setActionLoadingById((prev) => ({ ...prev, [reportId]: 'accept-ai' }))

    try {
      const response = await reportService.acceptReport(reportId)
      const nextStatus = response?.status ?? 'pending'

      syncReports(
        reportsRef.current.map((report) =>
          report.id === reportId
            ? applyReportTransition(report, nextStatus)
            : report,
        ),
      )
    } catch (error) {
      setActionErrorMessage(getApiErrorMessage(error, DEFAULT_ACTION_ERROR_MESSAGE))
    } finally {
      setActionLoadingById((prev) => {
        const next = { ...prev }
        delete next[reportId]
        return next
      })
    }
  }, [syncReports])

  const rejectReport = useCallback(async (reportId: string) => {
    setActionErrorMessage(null)
    setActionLoadingById((prev) => ({ ...prev, [reportId]: 'reject-ai' }))

    try {
      const response = await reportService.rejectReport(reportId)
      const nextStatus = response?.status ?? 'human_review'

      syncReports(
        reportsRef.current.map((report) =>
          report.id === reportId
            ? applyReportTransition(
                report,
                nextStatus,
                response?.reviewComment ?? report.reviewComment ?? 'تم رفض البلاغ.',
              )
            : report,
        ),
      )
    } catch (error) {
      setActionErrorMessage(getApiErrorMessage(error, DEFAULT_ACTION_ERROR_MESSAGE))
    } finally {
      setActionLoadingById((prev) => {
        const next = { ...prev }
        delete next[reportId]
        return next
      })
    }
  }, [syncReports])

  const updateHumanReviewReport = useCallback(async ({
    reportId,
    type,
    priority,
    assignedAuth,
  }: {
    reportId: string
    type: ReportTypeCode
    priority: ReportPriority
    assignedAuth?: string
  }) => {
    const normalizedAssignedAuth = assignedAuth?.trim()

    await performStatusUpdate({
      reportId,
      action: 'human-update',
      payload: {
        status: 'human_review',
        type,
        priority,
        assignedAuth: normalizedAssignedAuth,
      },
      fallbackStatus: 'human_review',
      fallbackPatch: {
        type,
        priority,
        assignedAuth: normalizedAssignedAuth ?? null,
      },
    })
  }, [performStatusUpdate])

  const approveHumanReviewReport = useCallback(async ({
    reportId,
    type,
    priority,
    assignedAuth,
  }: {
    reportId: string
    type: ReportTypeCode
    priority: ReportPriority
    assignedAuth?: string
  }) => {
    const normalizedAssignedAuth = assignedAuth?.trim()

    await performStatusUpdate({
      reportId,
      action: 'human-approve',
      payload: {
        status: 'pending',
        type,
        priority,
        assignedAuth: normalizedAssignedAuth,
      },
      fallbackStatus: 'pending',
      fallbackPatch: {
        type,
        priority,
        assignedAuth: normalizedAssignedAuth ?? null,
      },
    })
  }, [performStatusUpdate])

  const rejectHumanReviewReport = useCallback(async ({
    reportId,
    comment,
  }: {
    reportId: string
    comment?: string
  }) => {
    const normalizedComment = comment?.trim() || DEFAULT_HUMAN_REVIEW_REJECT_COMMENT

    await performStatusUpdate({
      reportId,
      action: 'human-reject',
      payload: {
        status: 'rejected',
        reviewComment: normalizedComment,
      },
      fallbackStatus: 'rejected',
      fallbackReviewComment: normalizedComment,
    })
  }, [performStatusUpdate])

  const startWorkOnReport = useCallback(async (reportId: string) => {
    await performStatusUpdate({
      reportId,
      action: 'start-work',
      payload: {
        status: 'in_progress',
      },
      fallbackStatus: 'in_progress',
    })
  }, [performStatusUpdate])

  const rejectPendingExecutionReport = useCallback(async ({
    reportId,
    reason,
  }: {
    reportId: string
    reason: string
  }) => {
    const normalizedReason = reason.trim()

    if (!normalizedReason) {
      setActionErrorMessage(DEFAULT_PENDING_REJECT_REASON_ERROR)
      return false
    }

    return performStatusUpdate({
      reportId,
      action: 'reject-execution',
      payload: {
        status: 'human_review',
        reviewComment: normalizedReason,
        rejectionReason: normalizedReason,
      },
      fallbackStatus: 'human_review',
      fallbackReviewComment: normalizedReason,
    })
  }, [performStatusUpdate])

  const resolveReport = useCallback(async (reportId: string) => {
    await performStatusUpdate({
      reportId,
      action: 'resolve',
      payload: {
        status: 'resolved',
      },
      fallbackStatus: 'resolved',
    })
  }, [performStatusUpdate])

  const pagination = null
  const isServerPagination = false
  const currentPage = 1
  const pageSize = DEFAULT_PAGE_SIZE

  return {
    reports,
    counts,
    pagination,
    currentPage,
    pageSize,
    isServerPagination,
    isCountsLoading,
    getTabReports,
    fetchReports,
    refreshCounts,
    acceptReport,
    rejectReport,
    updateHumanReviewReport,
    approveHumanReviewReport,
    rejectHumanReviewReport,
    startWorkOnReport,
    rejectPendingExecutionReport,
    resolveReport,
    isLoading,
    isRefreshing,
    errorMessage,
    actionErrorMessage,
    actionLoadingById,
  }
}

export default useAuthorityReports
