import { AxiosError } from 'axios'
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
  applyDashboardStatsTransition,
  createEmptyDashboardStats,
} from '../utils/reportStats'

interface BackendErrorResponse {
  message?: string
  error?: string
}

const DEFAULT_ERROR_MESSAGE = 'حدث خطأ أثناء تحميل البلاغات. حاول مرة أخرى.'
const DEFAULT_ACTION_ERROR_MESSAGE = 'تعذر تنفيذ الإجراء على البلاغ.'
const DEFAULT_PAGE_SIZE = 10

type ReportActionKind =
  | 'accept-ai'
  | 'reject-ai'
  | 'manual-approve'
  | 'start-work'
  | 'escalate'
  | 'resolve'

interface StatusUpdatePayload {
  status: ReportStatus
  type?: ReportTypeCode
  priority?: ReportPriority
  reviewComment?: string
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof AxiosError) {
    const responseData = error.response?.data as BackendErrorResponse | undefined
    return responseData?.message ?? responseData?.error ?? fallback
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
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

interface FetchReportsOptions {
  isManualRefresh?: boolean
  refreshSummary?: boolean
}

const useAuthorityReports = () => {
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
  }, [])

  const refreshCounts = useCallback(async () => {
    setIsCountsLoading(true)

    try {
      const summary = await reportService.getAuthorityReportsStats()
      setCounts(summary)
    } catch {
      // Keep last known counts if summary request fails.
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

    if (refreshSummary) {
      void refreshCounts()
    }

    try {
      // Keep all assigned reports in memory so filters are applied globally
      // before any table pagination is calculated in the page layer.
      const allReports = await reportService.listAllAuthorityReports()
      syncReports(allReports)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, DEFAULT_ERROR_MESSAGE))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [refreshCounts, syncReports])

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
  }) => {
    setActionErrorMessage(null)
    setActionLoadingById((prev) => ({ ...prev, [reportId]: action }))

    const currentReport = reportsRef.current.find((report) => report.id === reportId)

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

      if (currentReport) {
        setCounts((previousCounts) =>
          previousCounts.total > 0
            ? applyDashboardStatsTransition(
                previousCounts,
                currentReport.status,
                nextStatus,
              )
            : previousCounts,
        )
      }
    } catch (error) {
      setActionErrorMessage(getErrorMessage(error, DEFAULT_ACTION_ERROR_MESSAGE))
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
      const currentReport = reportsRef.current.find((report) => report.id === reportId)
      const nextStatus = response?.status ?? 'pending'

      syncReports(
        reportsRef.current.map((report) =>
          report.id === reportId
            ? applyReportTransition(report, nextStatus)
            : report,
        ),
      )

      if (currentReport) {
        setCounts((previousCounts) =>
          previousCounts.total > 0
            ? applyDashboardStatsTransition(
                previousCounts,
                currentReport.status,
                nextStatus,
              )
            : previousCounts,
        )
      }
    } catch (error) {
      setActionErrorMessage(getErrorMessage(error, DEFAULT_ACTION_ERROR_MESSAGE))
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
      const currentReport = reportsRef.current.find((report) => report.id === reportId)
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

      if (currentReport) {
        setCounts((previousCounts) =>
          previousCounts.total > 0
            ? applyDashboardStatsTransition(
                previousCounts,
                currentReport.status,
                nextStatus,
              )
            : previousCounts,
        )
      }
    } catch (error) {
      setActionErrorMessage(getErrorMessage(error, DEFAULT_ACTION_ERROR_MESSAGE))
    } finally {
      setActionLoadingById((prev) => {
        const next = { ...prev }
        delete next[reportId]
        return next
      })
    }
  }, [syncReports])

  const manualApproveReport = useCallback(async ({
    reportId,
    type,
    priority,
  }: {
    reportId: string
    type: ReportTypeCode
    priority: ReportPriority
  }) => {
    await performStatusUpdate({
      reportId,
      action: 'manual-approve',
      payload: {
        status: 'pending',
        type,
        priority,
      },
      fallbackStatus: 'pending',
      fallbackPatch: {
        type,
        priority,
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

  const escalateReport = useCallback(async ({
    reportId,
    comment,
  }: {
    reportId: string
    comment: string
  }) => {
    const normalizedComment = comment.trim()

    await performStatusUpdate({
      reportId,
      action: 'escalate',
      payload: {
        status: 'human_review',
        reviewComment: normalizedComment,
      },
      fallbackStatus: 'human_review',
      fallbackReviewComment: normalizedComment,
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
    manualApproveReport,
    startWorkOnReport,
    escalateReport,
    resolveReport,
    isLoading,
    isRefreshing,
    errorMessage,
    actionErrorMessage,
    actionLoadingById,
  }
}

export default useAuthorityReports
