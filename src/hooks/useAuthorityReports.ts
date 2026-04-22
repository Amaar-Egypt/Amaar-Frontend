import { useCallback, useRef, useState } from 'react'
import reportService from '../services/reportService'
import type {
  DashboardStats,
  Report,
  ReportPriority,
  ReportsPagination,
  ReportStatus,
  ReportTypeCode,
} from '../types/report'
import { createEmptyDashboardStats } from '../utils/reportStats'
import { getApiErrorMessage } from '../utils/apiResponse'
import type { AuthUser } from '../types/auth'

const DEFAULT_ERROR_MESSAGE = 'حدث خطأ أثناء تحميل البلاغات. حاول مرة أخرى.'
const DEFAULT_ACTION_ERROR_MESSAGE = 'تعذر تنفيذ الإجراء على البلاغ.'
const DEFAULT_PENDING_REJECT_REASON_ERROR = 'سبب رفض التنفيذ مطلوب.'
const DEFAULT_PAGE_SIZE = 10

type ReportActionKind =
  | 'accept-ai'
  | 'reject-ai'
  | 'reject-execution'
  | 'human-update'
  | 'start-work'
  | 'resolve'

interface StatusUpdatePayload {
  status?: ReportStatus
  priority?: ReportPriority
  assignedAuth?: string
  reviewComment?: string
}

interface FetchReportsOptions {
  isManualRefresh?: boolean
  refreshSummary?: boolean
  page?: number
  limit?: number
  status?: ReportStatus
  priority?: ReportPriority
  type?: ReportTypeCode
  search?: string
  assignedAuth?: string
}

interface UseAuthorityReportsOptions {
  viewer: AuthUser | null
}

interface ReportsQuerySnapshot {
  page: number
  limit: number
  status?: ReportStatus
  priority?: ReportPriority
  type?: ReportTypeCode
  search?: string
  assignedAuth?: string
}

const resolveAuthorityFilter = (viewer: AuthUser | null): string | undefined => {
  if (!viewer || viewer.role !== 'authority') {
    return undefined
  }

  const authorityId = viewer.authorityId?.trim()
  if (authorityId) {
    return authorityId
  }

  const userId = viewer.id.trim()
  return userId || undefined
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
  const [pagination, setPagination] = useState<ReportsPagination | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCountsLoading, setIsCountsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null)
  const [actionLoadingById, setActionLoadingById] = useState<Record<string, ReportActionKind>>({})

  const reportsRef = useRef<Report[]>([])
  const latestQueryRef = useRef<ReportsQuerySnapshot>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
  })

  const syncReports = useCallback((nextReports: Report[]) => {
    reportsRef.current = nextReports
    setReports(nextReports)
  }, [])

  const refreshCounts = useCallback(async () => {
    setIsCountsLoading(true)
    const assignedAuth = resolveAuthorityFilter(viewer)

    try {
      const summary = await reportService.getAuthorityReportsStats(
        assignedAuth ? { assignedAuth } : undefined,
      )
      setCounts(summary)
    } catch {
      // Keep previous totals if backend stats are unavailable.
    } finally {
      setIsCountsLoading(false)
    }
  }, [viewer])

  const fetchReports = useCallback(async (options: FetchReportsOptions = {}) => {
    const {
      isManualRefresh = false,
      refreshSummary = false,
      page,
      limit,
      status,
      priority,
      type,
      search,
      assignedAuth: requestedAssignedAuth,
    } = options

    const resolvedPage = page ?? 1
    const resolvedLimit = limit ?? pageSize

    if (isManualRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setErrorMessage(null)

    try {
      const resolvedRoleAssignedAuth = resolveAuthorityFilter(viewer)
      const assignedAuth = resolvedRoleAssignedAuth ?? requestedAssignedAuth?.trim()
      const normalizedSearch = search?.trim() || undefined
      const statsScope = {
        assignedAuth,
        priority,
        type,
        search: normalizedSearch,
      }

      latestQueryRef.current = {
        page: resolvedPage,
        limit: resolvedLimit,
        status,
        priority,
        type,
        search: normalizedSearch,
        assignedAuth,
      }

      const pageResponse = await reportService.listReports({
        assignedAuth,
        page: resolvedPage,
        limit: resolvedLimit,
        status,
        priority,
        type,
        search: normalizedSearch,
      })

      const resolvedPaginationPage = pageResponse.pagination?.page ?? resolvedPage
      const resolvedPaginationLimit = pageResponse.pagination?.limit ?? resolvedLimit

      syncReports(pageResponse.reports)
      setCurrentPage(resolvedPaginationPage)
      setPageSize(resolvedPaginationLimit)
      setPagination(pageResponse.pagination)

      latestQueryRef.current = {
        ...latestQueryRef.current,
        page: resolvedPaginationPage,
        limit: resolvedPaginationLimit,
      }

      if (refreshSummary) {
        try {
          const summary = await reportService.getAuthorityReportsStats(statsScope)
          setCounts(summary)
        } catch {
          // Keep previous totals if backend stats are unavailable.
        }
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, DEFAULT_ERROR_MESSAGE))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [pageSize, syncReports, viewer])

  const refreshAfterAction = useCallback(async () => {
    const lastQuery = latestQueryRef.current

    await fetchReports({
      ...lastQuery,
      isManualRefresh: true,
      refreshSummary: true,
    })
  }, [fetchReports])

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

      await refreshAfterAction()

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
  }, [refreshAfterAction, syncReports])

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

      await refreshAfterAction()
    } catch (error) {
      setActionErrorMessage(getApiErrorMessage(error, DEFAULT_ACTION_ERROR_MESSAGE))
    } finally {
      setActionLoadingById((prev) => {
        const next = { ...prev }
        delete next[reportId]
        return next
      })
    }
  }, [refreshAfterAction, syncReports])

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

      await refreshAfterAction()
    } catch (error) {
      setActionErrorMessage(getApiErrorMessage(error, DEFAULT_ACTION_ERROR_MESSAGE))
    } finally {
      setActionLoadingById((prev) => {
        const next = { ...prev }
        delete next[reportId]
        return next
      })
    }
  }, [refreshAfterAction, syncReports])

  const updateHumanReviewReport = useCallback(async ({
    reportId,
    priority,
    assignedAuth,
  }: {
    reportId: string
    priority: ReportPriority
    assignedAuth?: string
  }) => {
    const normalizedAssignedAuth = assignedAuth?.trim()

    await performStatusUpdate({
      reportId,
      action: 'human-update',
      payload: {
        priority,
        assignedAuth: normalizedAssignedAuth,
      },
      fallbackStatus: 'human_review',
      fallbackPatch: {
        priority,
        assignedAuth: normalizedAssignedAuth ?? null,
      },
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

    setActionErrorMessage(null)
    setActionLoadingById((prev) => ({ ...prev, [reportId]: 'reject-execution' }))

    try {
      const response = await reportService.rejectReport(reportId, normalizedReason)
      const nextStatus = response?.status ?? 'human_review'

      syncReports(
        reportsRef.current.map((report) =>
          report.id === reportId
            ? applyReportTransition(
                report,
                nextStatus,
                response?.reviewComment ?? normalizedReason,
              )
            : report,
        ),
      )

      await refreshAfterAction()

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
  }, [refreshAfterAction, syncReports])

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

  const isServerPagination = true

  return {
    reports,
    counts,
    pagination,
    currentPage,
    pageSize,
    isServerPagination,
    isCountsLoading,
    fetchReports,
    refreshCounts,
    acceptReport,
    rejectReport,
    updateHumanReviewReport,
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
