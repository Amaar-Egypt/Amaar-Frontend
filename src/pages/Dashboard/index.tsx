import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Pagination from '../../components/common/Pagination'
import DashboardSidebar, {
  type DashboardSection,
} from '../../components/dashboard/DashboardSidebar'
import DashboardTopbar from '../../components/dashboard/DashboardTopbar'
import FixesList from '../../components/dashboard/FixesList'
import ReportsFilters from '../../components/dashboard/ReportsFilters'
import ReportsTable from '../../components/dashboard/ReportsTable'
import StatCard from '../../components/dashboard/StatCard'
import FullReportDetailsModal from '../../components/dashboard/FullReportDetailsModal'
import FullFixDetailsModal from '../../components/dashboard/FullFixDetailsModal'
import HumanReviewModal from '../../components/dashboard/HumanReviewModal'
import useAuth from '../../hooks/useAuth'
import useAuthorityReports from '../../hooks/useAuthorityReports'
import authorityService from '../../services/authorityService'
import reportService from '../../services/reportService'
import type {
  Fix,
  FixesResult,
  FixStatus,
} from '../../types/fix'
import type {
  Report,
  ReportPriority,
  ReportsFilterTab,
  ReportTypeDefinition,
} from '../../types/report'
import type { AuthoritySummary } from '../../types/authority'
import { getApiErrorMessage } from '../../utils/apiResponse'
import { getReportFilterTabs, getReportTypeLabel } from '../../utils/reportPresentation'

const DEFAULT_TYPES_ERROR_MESSAGE = 'تعذر تحميل أنواع البلاغات.'
const DEFAULT_AUTHORITIES_ERROR_MESSAGE = 'تعذر تحميل الجهات المسندة.'
const DEFAULT_FIXES_ERROR_MESSAGE = 'تعذر تحميل الإصلاحات.'
const DEFAULT_FIX_ACTION_ERROR_MESSAGE = 'تعذر تنفيذ الإجراء على الإصلاح.'
const DEFAULT_FIXES_PAGE_SIZE = 20
const FIXES_STATUS_OPTIONS: Array<{ value: 'all' | FixStatus; label: string }> = [
  { value: 'all', label: 'كل الحالات' },
  { value: 'pending', label: 'قيد المراجعة' },
  { value: 'accepted', label: 'مقبول' },
  { value: 'rejected', label: 'مرفوض' },
]

interface SelectOption {
  value: string
  label: string
}

const getReportDisplayLabel = (
  report: Report,
  typeLabelsByCode: Record<string, string>,
) => {
  return getReportTypeLabel(report, typeLabelsByCode)
}

const DashboardPage = () => {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [activeSection, setActiveSection] = useState<DashboardSection>('home')
  const [activeFilterTab, setActiveFilterTab] = useState<ReportsFilterTab>('all')
  const [activePriority, setActivePriority] = useState<'all' | ReportPriority>('all')
  const [activeType, setActiveType] = useState<'all' | string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [assignedAuthFilter, setAssignedAuthFilter] = useState('')
  const [reportTypes, setReportTypes] = useState<ReportTypeDefinition[]>([])
  const [authorities, setAuthorities] = useState<AuthoritySummary[]>([])
  const [isReportTypesLoading, setIsReportTypesLoading] = useState(false)
  const [reportTypesErrorMessage, setReportTypesErrorMessage] = useState<string | null>(null)
  const [isAuthoritiesLoading, setIsAuthoritiesLoading] = useState(false)
  const [authoritiesErrorMessage, setAuthoritiesErrorMessage] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isFullDetailsOpen, setIsFullDetailsOpen] = useState(false)
  const [fullDetailsReportId, setFullDetailsReportId] = useState<string | null>(null)
  const [isHumanReviewOpen, setIsHumanReviewOpen] = useState(false)
  const [humanReviewReportId, setHumanReviewReportId] = useState<string | null>(null)
  const [fixesCountByReportId, setFixesCountByReportId] = useState<Record<string, number>>({})
  const [fixesCountLoadingByReportId, setFixesCountLoadingByReportId] = useState<Record<string, boolean>>({})
  const [fixesCountErrorByReportId, setFixesCountErrorByReportId] = useState<Record<string, string>>({})
  const [activeReportFixesReport, setActiveReportFixesReport] = useState<Report | null>(null)
  const [reportFixes, setReportFixes] = useState<Fix[]>([])
  const [isReportFixesLoading, setIsReportFixesLoading] = useState(false)
  const [isReportFixesRefreshing, setIsReportFixesRefreshing] = useState(false)
  const [reportFixesErrorMessage, setReportFixesErrorMessage] = useState<string | null>(null)
  const [myFixes, setMyFixes] = useState<Fix[]>([])
  const [myFixesPagination, setMyFixesPagination] = useState<FixesResult['pagination']>(null)
  const [myFixesPage, setMyFixesPage] = useState(1)
  const [myFixesPageSize, setMyFixesPageSize] = useState(DEFAULT_FIXES_PAGE_SIZE)
  const [isMyFixesLoading, setIsMyFixesLoading] = useState(false)
  const [isMyFixesRefreshing, setIsMyFixesRefreshing] = useState(false)
  const [myFixesErrorMessage, setMyFixesErrorMessage] = useState<string | null>(null)
  const [selectedFix, setSelectedFix] = useState<Fix | null>(null)
  const [fixReportsById, setFixReportsById] = useState<Record<string, Report>>({})
  const [isFullFixDetailsOpen, setIsFullFixDetailsOpen] = useState(false)
  const [fullDetailsFix, setFullDetailsFix] = useState<Fix | null>(null)
  const [fixActionErrorMessage, setFixActionErrorMessage] = useState<string | null>(null)
  const [isAcceptFixLoading, setIsAcceptFixLoading] = useState(false)
  const [isRejectFixLoading, setIsRejectFixLoading] = useState(false)
  const [fixesStatusFilter, setFixesStatusFilter] = useState<'all' | FixStatus>('all')
  const [fixesAuthorityFilter, setFixesAuthorityFilter] = useState('')

  const filterTabs = useMemo(() => getReportFilterTabs(user?.role ?? null), [user?.role])
  const isAdminViewer = user?.role === 'admin'
  const isAuthorityViewer = user?.role === 'authority'
  const isPrivilegedViewer = isAdminViewer || isAuthorityViewer

  const {
    reports,
    counts,
    pagination,
    currentPage,
    pageSize,
    isServerPagination,
    fetchReports,
    acceptReport,
    rejectReport,
    approveHumanReviewReport,
    submitHumanReviewUpdate,
    startWorkOnReport,
    resolveReport,
    isLoading,
    isRefreshing,
    isCountsLoading,
    errorMessage,
    actionErrorMessage,
    actionLoadingById,
  } = useAuthorityReports({ viewer: user ?? null })

  const statusFilter = activeFilterTab === 'all' ? undefined : activeFilterTab
  const priorityFilter = activePriority === 'all' ? undefined : activePriority

  const typeOptions = useMemo(
    () => reportTypes.map((type) => ({
      value: type.code,
      label: type.label,
    })),
    [reportTypes],
  )

  const typeLabelsByCode = useMemo(() => {
    return reportTypes.reduce<Record<string, string>>((acc, type) => {
      acc[type.code] = type.label
      return acc
    }, {})
  }, [reportTypes])

  const typeFilter = useMemo(() => {
    if (activeType !== 'all') {
      return activeType
    }

    return undefined
  }, [activeType])

  const searchQuery = searchTerm.trim() || undefined
  const assignedAuthQuery = isAdminViewer
    ? assignedAuthFilter.trim() || undefined
    : undefined
  const fixesStatusQuery = fixesStatusFilter === 'all' ? undefined : fixesStatusFilter
  const fixesUserQuery = useMemo(() => {
    if (!isAuthorityViewer) {
      return undefined
    }

    return user?.id?.trim() || undefined
  }, [isAuthorityViewer, user?.id])

  const fixesAuthorityQuery = useMemo(() => {
    if (isAdminViewer) {
      return fixesAuthorityFilter.trim() || undefined
    }

    if (isAuthorityViewer) {
      return user?.authorityId?.trim() || undefined
    }

    return undefined
  }, [fixesAuthorityFilter, isAdminViewer, isAuthorityViewer, user?.authorityId])

  const authorityOptions: SelectOption[] = useMemo(
    () => authorities.map((authority) => ({
      value: authority.id,
      label: authority.name,
    })),
    [authorities],
  )

  const authorityLabelsById = useMemo(() => {
    return authorities.reduce<Record<string, string>>((acc, authority) => {
      acc[authority.id] = authority.name
      return acc
    }, {})
  }, [authorities])

  const fixReportLabelById = useMemo(() => {
    const labels: Record<string, string> = {}

    const registerReport = (report: Report | null) => {
      if (!report) {
        return
      }

      labels[report.id] = getReportDisplayLabel(report, typeLabelsByCode)
    }

    for (const report of reports) {
      registerReport(report)
    }

    for (const report of Object.values(fixReportsById)) {
      registerReport(report)
    }

    registerReport(activeReportFixesReport)

    return labels
  }, [activeReportFixesReport, fixReportsById, reports, typeLabelsByCode])

  useEffect(() => {
    let isMounted = true
    setIsReportTypesLoading(true)
    setReportTypesErrorMessage(null)

    const loadReportTypes = async () => {
      try {
        const types = await reportService.listReportTypes()

        if (!isMounted) {
          return
        }

        setReportTypes(types)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setReportTypes([])
        setReportTypesErrorMessage(
          getApiErrorMessage(error, DEFAULT_TYPES_ERROR_MESSAGE),
        )
      } finally {
        if (isMounted) {
          setIsReportTypesLoading(false)
        }
      }
    }

    loadReportTypes()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isPrivilegedViewer) {
      setAuthorities([])
      setAssignedAuthFilter('')
      setAuthoritiesErrorMessage(null)
      return
    }

    let isMounted = true
    setIsAuthoritiesLoading(true)
    setAuthoritiesErrorMessage(null)

    const loadAuthorities = async () => {
      try {
        const list = await authorityService.listAuthorities()

        if (!isMounted) {
          return
        }

        const sortedList = [...list].sort((first, second) =>
          first.name.localeCompare(second.name, 'ar'),
        )

        setAuthorities(sortedList)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setAuthorities([])
        setAuthoritiesErrorMessage(
          getApiErrorMessage(error, DEFAULT_AUTHORITIES_ERROR_MESSAGE),
        )
      } finally {
        if (isMounted) {
          setIsAuthoritiesLoading(false)
        }
      }
    }

    loadAuthorities()

    return () => {
      isMounted = false
    }
  }, [isPrivilegedViewer])

  useEffect(() => {
    if (!isAdminViewer || !assignedAuthFilter) {
      return
    }

    const hasAuthority = authorities.some(
      (authority) => authority.id === assignedAuthFilter,
    )

    if (!hasAuthority) {
      setAssignedAuthFilter('')
    }
  }, [assignedAuthFilter, authorities, isAdminViewer])

  useEffect(() => {
    if (!isAdminViewer) {
      setFixesAuthorityFilter('')
      return
    }

    if (!fixesAuthorityFilter) {
      return
    }

    const hasAuthority = authorities.some(
      (authority) => authority.id === fixesAuthorityFilter,
    )

    if (!hasAuthority) {
      setFixesAuthorityFilter('')
    }
  }, [authorities, fixesAuthorityFilter, isAdminViewer])

  useEffect(() => {
    fetchReports({
      refreshSummary: true,
      page: 1,
      status: statusFilter,
      priority: priorityFilter,
      type: typeFilter,
      search: searchQuery,
      assignedAuth: assignedAuthQuery,
    })
  }, [
    assignedAuthQuery,
    fetchReports,
    priorityFilter,
    searchQuery,
    statusFilter,
    typeFilter,
  ])

  useEffect(() => {
    if (!filterTabs.some((tab) => tab.key === activeFilterTab)) {
      setActiveFilterTab('all')
    }
  }, [activeFilterTab, filterTabs])

  useEffect(() => {
    if (activeType === 'all') {
      return
    }

    if (!typeOptions.some((option) => option.value === activeType)) {
      setActiveType('all')
    }
  }, [activeType, typeOptions])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const handleSelectReport = useCallback((report: Report) => {
    setSelectedReport(report)
  }, [])

  const handleOpenFullDetails = useCallback((report: Report) => {
    setFullDetailsReportId(report.id)
    setIsFullDetailsOpen(true)
  }, [])

  const handleCloseFullDetails = useCallback(() => {
    setIsFullDetailsOpen(false)
  }, [])

  const handleOpenHumanReview = useCallback((report: Report) => {
    setHumanReviewReportId(report.id)
    setIsHumanReviewOpen(true)
  }, [])

  const handleCloseHumanReview = useCallback(() => {
    setIsHumanReviewOpen(false)
    setHumanReviewReportId(null)
  }, [])

  const loadReportFixes = useCallback(async (
    reportId: string,
    isManualRefresh: boolean = false,
  ) => {
    if (isManualRefresh) {
      setIsReportFixesRefreshing(true)
    } else {
      setIsReportFixesLoading(true)
    }

    setReportFixesErrorMessage(null)

    try {
      const response = await reportService.listReportFixes(reportId)
      setReportFixes(response.fixes)
    } catch (error) {
      setReportFixes([])
      setReportFixesErrorMessage(getApiErrorMessage(error, DEFAULT_FIXES_ERROR_MESSAGE))
    } finally {
      setIsReportFixesLoading(false)
      setIsReportFixesRefreshing(false)
    }
  }, [])

  const loadMyFixes = useCallback(async (
    targetPage: number,
    targetLimit: number,
    isManualRefresh: boolean = false,
  ) => {
    if (!user) {
      return
    }

    if (isManualRefresh) {
      setIsMyFixesRefreshing(true)
    } else {
      setIsMyFixesLoading(true)
    }

    setMyFixesErrorMessage(null)

    try {
      const response = await reportService.listFixes({
        user: fixesUserQuery,
        status: fixesStatusQuery,
        authority: fixesAuthorityQuery,
        page: targetPage,
        limit: targetLimit,
      })

      setMyFixes(response.fixes)
      setMyFixesPagination(response.pagination)
      setMyFixesPage(response.pagination?.page ?? targetPage)
      setMyFixesPageSize(response.pagination?.limit ?? targetLimit)
    } catch (error) {
      setMyFixes([])
      setMyFixesPagination(null)
      setMyFixesErrorMessage(getApiErrorMessage(error, DEFAULT_FIXES_ERROR_MESSAGE))
    } finally {
      setIsMyFixesLoading(false)
      setIsMyFixesRefreshing(false)
    }
  }, [fixesAuthorityQuery, fixesStatusQuery, fixesUserQuery, user])

  const handleSelectFix = useCallback((fix: Fix) => {
    setSelectedFix(fix)
  }, [])

  const handleOpenReportFixes = useCallback((report: Report) => {
    setActiveSection('report-fixes')
    setActiveReportFixesReport(report)
    setSelectedFix(null)
    setReportFixes([])
    void loadReportFixes(report.id)
  }, [loadReportFixes])

  const handleCloseReportFixes = useCallback(() => {
    setActiveSection('home')
    setActiveReportFixesReport(null)
    setSelectedFix(null)
    setReportFixes([])
    setReportFixesErrorMessage(null)
    setIsReportFixesLoading(false)
    setIsReportFixesRefreshing(false)
  }, [])

  useEffect(() => {
    if (activeSection !== 'report-fixes') {
      return
    }

    if (reportFixes.length === 0) {
      setSelectedFix(null)
      return
    }

    const stillExists = selectedFix
      ? reportFixes.some((fix) => fix.id === selectedFix.id)
      : false

    if (!stillExists) {
      setSelectedFix(reportFixes[0])
    }
  }, [activeSection, reportFixes, selectedFix])

  useEffect(() => {
    if (activeSection !== 'assigned-reports') {
      return
    }

    if (myFixes.length === 0) {
      setSelectedFix(null)
      return
    }

    const stillExists = selectedFix
      ? myFixes.some((fix) => fix.id === selectedFix.id)
      : false

    if (!stillExists) {
      setSelectedFix(myFixes[0])
    }
  }, [activeSection, myFixes, selectedFix])

  const paginatedReports = reports
  const visibleReportIds = useMemo(
    () => paginatedReports.map((report) => report.id),
    [paginatedReports],
  )

  const totalPages = isServerPagination
    ? Math.max(1, pagination?.totalPages ?? 1)
    : 1

  const effectiveCurrentPage = isServerPagination ? currentPage : 1
  const effectivePageSize = isServerPagination ? (pagination?.limit ?? pageSize) : reports.length
  const effectiveTotalItems = isServerPagination
    ? pagination?.total
    : reports.length
  const myFixesTotalPages = Math.max(1, myFixesPagination?.totalPages ?? 1)
  const myFixesTotalItems = myFixesPagination?.total ?? myFixes.length

  useEffect(() => {
    if (visibleReportIds.length === 0) {
      setFixesCountByReportId({})
      setFixesCountLoadingByReportId({})
      setFixesCountErrorByReportId({})
      return
    }

    let isMounted = true

    const loadingState = visibleReportIds.reduce<Record<string, boolean>>((acc, reportId) => {
      acc[reportId] = true
      return acc
    }, {})

    setFixesCountLoadingByReportId(loadingState)
    setFixesCountErrorByReportId({})

    const loadFixesCounts = async () => {
      const results = await Promise.all(
        visibleReportIds.map(async (reportId) => {
          try {
            const count = await reportService.getReportFixesCount(reportId)

            return {
              reportId,
              count,
              error: null as string | null,
            }
          } catch (error) {
            return {
              reportId,
              count: null as number | null,
              error: getApiErrorMessage(error, 'تعذر تحميل عدد الإصلاحات.'),
            }
          }
        }),
      )

      if (!isMounted) {
        return
      }

      const nextCounts: Record<string, number> = {}
      const nextErrors: Record<string, string> = {}

      for (const result of results) {
        if (typeof result.count === 'number') {
          nextCounts[result.reportId] = result.count
        }

        if (result.error) {
          nextErrors[result.reportId] = result.error
        }
      }

      setFixesCountByReportId(nextCounts)
      setFixesCountErrorByReportId(nextErrors)
      setFixesCountLoadingByReportId({})
    }

    void loadFixesCounts()

    return () => {
      isMounted = false
    }
  }, [visibleReportIds])

  useEffect(() => {
    if (paginatedReports.length === 0) {
      setSelectedReport(null)
      return
    }

    if (!selectedReport) {
      void handleSelectReport(paginatedReports[0])
      return
    }

    const stillVisible = paginatedReports.some(
      (report) => report.id === selectedReport.id,
    )

    if (!stillVisible) {
      void handleSelectReport(paginatedReports[0])
    }
  }, [handleSelectReport, paginatedReports, selectedReport])

  useEffect(() => {
    if (activeSection !== 'assigned-reports' || !user) {
      return
    }

    void loadMyFixes(1, DEFAULT_FIXES_PAGE_SIZE)
  }, [activeSection, loadMyFixes, user])

  useEffect(() => {
    const reportIds = new Set<string>()

    for (const fix of myFixes) {
      reportIds.add(fix.reportId)
    }

    for (const fix of reportFixes) {
      reportIds.add(fix.reportId)
    }

    const missingReportIds = Array.from(reportIds).filter((reportId) => !fixReportsById[reportId])

    if (missingReportIds.length === 0) {
      return
    }

    let isMounted = true

    const loadReports = async () => {
      const loadedReports = await Promise.all(
        missingReportIds.map(async (reportId) => {
          try {
            const report = await reportService.getReportById(reportId)
            return { reportId, report }
          } catch {
            return { reportId, report: null }
          }
        }),
      )

      if (!isMounted) {
        return
      }

      setFixReportsById((prev) => {
        const next = { ...prev }

        for (const loaded of loadedReports) {
          if (loaded.report) {
            next[loaded.reportId] = loaded.report
          }
        }

        return next
      })
    }

    void loadReports()

    return () => {
      isMounted = false
    }
  }, [fixReportsById, myFixes, reportFixes])

  const handlePageChange = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || targetPage === effectiveCurrentPage) {
      return
    }

    fetchReports({
      page: targetPage,
      status: statusFilter,
      priority: priorityFilter,
      type: typeFilter,
      search: searchQuery,
      assignedAuth: assignedAuthQuery,
    })
  }

  const handleRefresh = () => {
    fetchReports({
      isManualRefresh: true,
      refreshSummary: true,
      page: effectiveCurrentPage,
      status: statusFilter,
      priority: priorityFilter,
      type: typeFilter,
      search: searchQuery,
      assignedAuth: assignedAuthQuery,
    })
  }

  const handleRefreshReportFixes = () => {
    if (!activeReportFixesReport) {
      return
    }

    void loadReportFixes(activeReportFixesReport.id, true)
  }

  const handleMyFixesPageChange = (targetPage: number) => {
    if (targetPage < 1 || targetPage > myFixesTotalPages || targetPage === myFixesPage) {
      return
    }

    void loadMyFixes(targetPage, myFixesPageSize)
  }

  const handleRefreshMyFixes = () => {
    void loadMyFixes(myFixesPage, myFixesPageSize, true)
  }

  const handleOpenFixDetails = useCallback((fix: Fix) => {
    setFullDetailsFix(fix)
    setFixActionErrorMessage(null)
    setIsFullFixDetailsOpen(true)
  }, [])

  const sidebarSelectedReport = useMemo(() => {
    if (activeSection === 'report-fixes') {
      return activeReportFixesReport
    }

    return selectedReport
  }, [activeReportFixesReport, activeSection, selectedReport])

  const sidebarDetailsMode = useMemo(() => {
    if (activeSection === 'assigned-reports') {
      return 'none' as const
    }

    return 'report' as const
  }, [activeSection])

  const handleCloseFixDetails = useCallback(() => {
    if (isAcceptFixLoading || isRejectFixLoading) {
      return
    }

    setIsFullFixDetailsOpen(false)
    setFixActionErrorMessage(null)
  }, [isAcceptFixLoading, isRejectFixLoading])

  const applyFixUpdate = useCallback((fixId: string, patch: Partial<Fix>) => {
    setMyFixes((prev) => prev.map((fix) => (fix.id === fixId ? { ...fix, ...patch } : fix)))
    setReportFixes((prev) => prev.map((fix) => (fix.id === fixId ? { ...fix, ...patch } : fix)))
    setSelectedFix((prev) => (prev?.id === fixId ? { ...prev, ...patch } : prev))
    setFullDetailsFix((prev) => (prev?.id === fixId ? { ...prev, ...patch } : prev))
  }, [])

  const handleAcceptFix = useCallback(async (fix: Fix) => {
    if (fix.status !== 'pending') {
      return
    }

    setFixActionErrorMessage(null)
    setIsAcceptFixLoading(true)

    try {
      const response = await reportService.acceptFix(fix.id)
      if (!response || response.status !== 'accepted') {
        setFixActionErrorMessage(DEFAULT_FIX_ACTION_ERROR_MESSAGE)
        return
      }

      applyFixUpdate(fix.id, {
        status: response.status,
      })

      if (activeSection === 'assigned-reports') {
        await loadMyFixes(myFixesPage, myFixesPageSize, true)
      }

      if (activeSection === 'report-fixes' && activeReportFixesReport) {
        await loadReportFixes(activeReportFixesReport.id, true)
      }
    } catch (error) {
      setFixActionErrorMessage(getApiErrorMessage(error, DEFAULT_FIX_ACTION_ERROR_MESSAGE))
    } finally {
      setIsAcceptFixLoading(false)
    }
  }, [
    activeReportFixesReport,
    activeSection,
    applyFixUpdate,
    loadMyFixes,
    loadReportFixes,
    myFixesPage,
    myFixesPageSize,
  ])

  const handleRejectFix = useCallback(async (fix: Fix, comment: string) => {
    if (fix.status !== 'pending') {
      return
    }

    setFixActionErrorMessage(null)
    setIsRejectFixLoading(true)

    try {
      const response = await reportService.rejectFix(fix.id, comment)
      if (!response || response.status !== 'rejected') {
        setFixActionErrorMessage(DEFAULT_FIX_ACTION_ERROR_MESSAGE)
        return
      }

      applyFixUpdate(fix.id, {
        status: response.status,
        comment: response.comment ?? comment,
      })

      if (activeSection === 'assigned-reports') {
        await loadMyFixes(myFixesPage, myFixesPageSize, true)
      }

      if (activeSection === 'report-fixes' && activeReportFixesReport) {
        await loadReportFixes(activeReportFixesReport.id, true)
      }
    } catch (error) {
      setFixActionErrorMessage(getApiErrorMessage(error, DEFAULT_FIX_ACTION_ERROR_MESSAGE))
    } finally {
      setIsRejectFixLoading(false)
    }
  }, [
    activeReportFixesReport,
    activeSection,
    applyFixUpdate,
    loadMyFixes,
    loadReportFixes,
    myFixesPage,
    myFixesPageSize,
  ])

  const renderSectionContent = () => {
    if (activeSection === 'assigned-reports') {
      return (
        <section
          dir="rtl"
          className="space-y-3 rounded-3xl border border-slate-200/70 bg-white/72 p-4 shadow-[0_20px_44px_rgba(15,23,42,0.1)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/68 dark:shadow-[0_30px_75px_rgba(2,6,23,0.5)] sm:p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">إصلاحات</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">عرض الإصلاحات مباشرة من الخادم </p>
            </div>

            <button
              type="button"
              onClick={handleRefreshMyFixes}
              disabled={isMyFixesRefreshing || isMyFixesLoading}
              className="inline-flex items-center justify-center rounded-xl border border-emerald-300/70 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/20 disabled:opacity-65 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200"
            >
              {isMyFixesRefreshing ? 'جاري التحديث...' : 'تحديث الإصلاحات'}
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              حالة الإصلاح
              <select
                value={fixesStatusFilter}
                onChange={(event) => setFixesStatusFilter(event.target.value as 'all' | FixStatus)}
                className="rounded-xl border border-slate-300/70 bg-white/90 px-3 py-2 text-sm text-slate-800 outline-none ring-emerald-500/40 transition focus:ring dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100"
              >
                {FIXES_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {isAdminViewer ? (
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                الجهة
                <select
                  value={fixesAuthorityFilter}
                  onChange={(event) => setFixesAuthorityFilter(event.target.value)}
                  disabled={isAuthoritiesLoading}
                  className="rounded-xl border border-slate-300/70 bg-white/90 px-3 py-2 text-sm text-slate-800 outline-none ring-emerald-500/40 transition focus:ring dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100"
                >
                  <option value="">
                    {isAuthoritiesLoading ? 'جاري تحميل الجهات...' : 'كل الجهات'}
                  </option>
                  {authorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          {myFixesErrorMessage ? (
            <p className="rounded-xl border border-rose-300/60 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:border-rose-300/35 dark:bg-rose-500/12 dark:text-rose-200">
              {myFixesErrorMessage}
            </p>
          ) : null}

          {isAdminViewer && authoritiesErrorMessage ? (
            <p className="rounded-xl border border-amber-300/70 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:border-amber-300/35 dark:bg-amber-500/12 dark:text-amber-200">
              {authoritiesErrorMessage}
            </p>
          ) : null}

          {isMyFixesLoading ? (
            <p className="rounded-2xl border border-slate-200/70 bg-slate-100/70 px-4 py-6 text-center text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-300">
              جاري تحميل الإصلاحات...
            </p>
          ) : myFixes.length === 0 ? (
            <p className="rounded-2xl border border-slate-200/70 bg-slate-100/70 px-4 py-6 text-center text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-300">
              لا توجد إصلاحات مطابقة للفلاتر الحالية.
            </p>
          ) : (
            <div className="space-y-3">
              <FixesList
                fixes={myFixes}
                reportLabelById={fixReportLabelById}
                selectedFixId={selectedFix?.id ?? null}
                onSelectFix={handleSelectFix}
                onViewDetails={handleOpenFixDetails}
              />

              <Pagination
                currentPage={myFixesPage}
                totalPages={myFixesTotalPages}
                totalItems={myFixesTotalItems}
                pageSize={myFixesPageSize}
                isLoading={isMyFixesRefreshing || isMyFixesLoading}
                onPageChange={handleMyFixesPageChange}
              />
            </div>
          )}
        </section>
      )
    }

    if (activeSection === 'report-fixes') {
      return (
        <section
          dir="rtl"
          className="space-y-3 rounded-3xl border border-cyan-300/55 bg-white/72 p-4 shadow-[0_20px_44px_rgba(15,23,42,0.1)] backdrop-blur-xl dark:border-cyan-400/30 dark:bg-slate-900/68 dark:shadow-[0_30px_75px_rgba(2,6,23,0.5)] sm:p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">إصلاحات البلاغ</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeReportFixesReport
                  ? `البلاغ: ${getReportDisplayLabel(activeReportFixesReport, typeLabelsByCode)}`
                  : 'لم يتم تحديد بلاغ حتى الآن.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRefreshReportFixes}
                disabled={!activeReportFixesReport || isReportFixesRefreshing || isReportFixesLoading}
                className="inline-flex items-center justify-center rounded-xl border border-emerald-300/70 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/20 disabled:opacity-65 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200"
              >
                {isReportFixesRefreshing ? 'جاري التحديث...' : 'تحديث الإصلاحات'}
              </button>

              <button
                type="button"
                onClick={handleCloseReportFixes}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-white/10"
              >
                العودة إلى البلاغات
              </button>
            </div>
          </div>

          {!activeReportFixesReport ? (
            <p className="rounded-2xl border border-slate-200/70 bg-slate-100/70 px-4 py-6 text-center text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-300">
              اختر بلاغًا من الجدول ثم اضغط على عدد الإصلاحات لعرض تفاصيله هنا.
            </p>
          ) : (
            <>
              {reportFixesErrorMessage ? (
                <p className="rounded-xl border border-rose-300/60 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:border-rose-300/35 dark:bg-rose-500/12 dark:text-rose-200">
                  {reportFixesErrorMessage}
                </p>
              ) : null}

              {isReportFixesLoading ? (
                <p className="rounded-2xl border border-slate-200/70 bg-slate-100/70 px-4 py-6 text-center text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-300">
                  جاري تحميل إصلاحات البلاغ...
                </p>
              ) : reportFixes.length === 0 ? (
                <p className="rounded-2xl border border-slate-200/70 bg-slate-100/70 px-4 py-6 text-center text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-300">
                  لا توجد إصلاحات مرتبطة بهذا البلاغ.
                </p>
              ) : (
                <div className="space-y-3">
                  <FixesList
                    fixes={reportFixes}
                    reportLabelById={fixReportLabelById}
                    selectedFixId={selectedFix?.id ?? null}
                    onSelectFix={handleSelectFix}
                    onViewDetails={handleOpenFixDetails}
                  />
                </div>
              )}
            </>
          )}
        </section>
      )
    }

    if (activeSection !== 'home') {
      return (
        <section
          dir="rtl"
          className="rounded-3xl border border-slate-200/70 bg-white/75 p-6 shadow-[0_18px_46px_rgba(15,23,42,0.1)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_28px_70px_rgba(2,6,23,0.48)]"
        >
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{activeSection === 'map' ? 'الخريطة' : 'الملف الشخصي'}</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            هذه الواجهة سيتم تطويرها لاحقًا ضمن نفس بنية لوحة التحكم.
          </p>
        </section>
      )
    }

    return (
      <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <StatCard title="إجمالي البلاغات" value={counts.total} tone="neutral" isLoading={isCountsLoading} />
          <StatCard title="مراجعة الذكاء" value={counts.aiReview} tone="warning" isLoading={isCountsLoading} />
          <StatCard
            title="المراجعة البشرية"
            value={counts.humanReview}
            tone="danger"
            isLoading={isCountsLoading}
          />
          <StatCard title="جاهز للتنفيذ" value={counts.pending} tone="neutral" isLoading={isCountsLoading} />
          <StatCard title="قيد التنفيذ" value={counts.inProgress} tone="warning" isLoading={isCountsLoading} />
          <StatCard title="مكتمل" value={counts.resolved} tone="success" isLoading={isCountsLoading} />
        </section>

        <section className="space-y-3 rounded-3xl border border-slate-200/70 bg-white/72 p-4 shadow-[0_20px_44px_rgba(15,23,42,0.1)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/68 dark:shadow-[0_30px_75px_rgba(2,6,23,0.5)] sm:p-5">
          <div dir="rtl" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">قائمة البلاغات</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">إدارة دورة البلاغ من مراجعة الذكاء حتى الإغلاق حسب الصلاحيات</p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center rounded-xl border border-emerald-300/70 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/20 disabled:opacity-65 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200"
            >
              {isRefreshing ? 'جاري التحديث...' : 'تحديث البيانات'}
            </button>
          </div>

          <ReportsFilters
            activeTab={activeFilterTab}
            tabs={filterTabs}
            selectedPriority={activePriority}
            selectedType={activeType}
            typeOptions={typeOptions}
            assignedAuth={assignedAuthFilter}
            authorityOptions={authorityOptions}
            isAdminViewer={isAdminViewer}
            isAuthoritiesLoading={isAuthoritiesLoading}
            onChangeTab={setActiveFilterTab}
            onChangePriority={setActivePriority}
            onChangeType={setActiveType}
            onChangeAssignedAuth={setAssignedAuthFilter}
          />

          {isReportTypesLoading ? (
            <p dir="rtl" className="rounded-xl border border-slate-200/70 bg-slate-100/70 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-300">
              جاري تحميل أنواع البلاغات...
            </p>
          ) : null}

          {reportTypesErrorMessage ? (
            <p dir="rtl" className="rounded-xl border border-amber-300/70 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:border-amber-300/35 dark:bg-amber-500/12 dark:text-amber-200">
              {reportTypesErrorMessage}
            </p>
          ) : null}

          {authoritiesErrorMessage ? (
            <p dir="rtl" className="rounded-xl border border-amber-300/70 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:border-amber-300/35 dark:bg-amber-500/12 dark:text-amber-200">
              {authoritiesErrorMessage}
            </p>
          ) : null}

          {errorMessage ? (
            <p dir="rtl" className="rounded-xl border border-rose-300/60 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:border-rose-300/35 dark:bg-rose-500/12 dark:text-rose-200">
              {errorMessage}
            </p>
          ) : null}

          {actionErrorMessage ? (
            <p dir="rtl" className="rounded-xl border border-amber-300/70 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:border-amber-300/35 dark:bg-amber-500/12 dark:text-amber-200">
              {actionErrorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <p dir="rtl" className="rounded-2xl border border-slate-200/70 bg-slate-100/70 px-4 py-6 text-center text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-300">
              جاري تحميل البلاغات...
            </p>
          ) : (
            <div className="space-y-3">
              <ReportsTable
                reports={paginatedReports}
                viewerRole={user?.role ?? null}
                selectedReportId={selectedReport?.id ?? null}
                typeLabelsByCode={typeLabelsByCode}
                fixesCountByReportId={fixesCountByReportId}
                fixesCountLoadingByReportId={fixesCountLoadingByReportId}
                fixesCountErrorByReportId={fixesCountErrorByReportId}
                actionLoadingById={actionLoadingById}
                onAccept={acceptReport}
                onReject={rejectReport}
                onApproveHumanReview={approveHumanReviewReport}
                onOpenHumanReview={handleOpenHumanReview}
                onStartWork={startWorkOnReport}
                onResolve={resolveReport}
                onOpenReportFixes={handleOpenReportFixes}
                onRowClick={handleSelectReport}
              />

              <Pagination
                currentPage={effectiveCurrentPage}
                totalPages={totalPages}
                totalItems={effectiveTotalItems}
                pageSize={effectivePageSize}
                isLoading={isRefreshing || isLoading}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </section>
      </>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100 font-arabic text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_5%,rgba(16,185,129,0.26),transparent_35%),radial-gradient(circle_at_95%_0%,rgba(14,116,144,0.2),transparent_38%),radial-gradient(circle_at_55%_100%,rgba(251,146,60,0.17),transparent_48%)] dark:bg-[radial-gradient(circle_at_20%_5%,rgba(16,185,129,0.24),transparent_35%),radial-gradient(circle_at_95%_0%,rgba(14,116,144,0.32),transparent_40%),radial-gradient(circle_at_55%_100%,rgba(14,165,233,0.2),transparent_48%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-[size:34px_34px] opacity-30 dark:bg-[linear-gradient(rgba(148,163,184,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.055)_1px,transparent_1px)]" />

      <div className="relative flex min-h-screen w-full items-stretch px-2 py-2 sm:px-4 sm:py-3 lg:px-5 lg:py-4">
        <div className="grid min-h-[calc(100vh-1rem)] w-full items-stretch gap-4 [direction:ltr] lg:grid-cols-[minmax(0,1fr)_22rem]">
          <main className="min-w-0 space-y-4" dir="rtl">
            <DashboardTopbar
              user={user}
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              onLogout={handleLogout}
            />

            {renderSectionContent()}
          </main>

          <DashboardSidebar
            activeSection={activeSection}
            onSelectSection={setActiveSection}
            selectedReport={sidebarSelectedReport}
            detailsMode={sidebarDetailsMode}
            viewerRole={user?.role ?? null}
            typeLabelsByCode={typeLabelsByCode}
            onViewFullDetails={handleOpenFullDetails}
          />
        </div>
      </div>

      <FullReportDetailsModal
        isOpen={isFullDetailsOpen}
        reportId={fullDetailsReportId}
        typeLabelsByCode={typeLabelsByCode}
        authorityLabelsById={authorityLabelsById}
        onClose={handleCloseFullDetails}
      />

      <FullFixDetailsModal
        isOpen={isFullFixDetailsOpen}
        fix={fullDetailsFix}
        reportLabel={fullDetailsFix ? (fixReportLabelById[fullDetailsFix.reportId] ?? 'جاري تحميل بيانات البلاغ...') : 'غير متوفر'}
        canReview={isPrivilegedViewer}
        isAccepting={isAcceptFixLoading}
        isRejecting={isRejectFixLoading}
        actionErrorMessage={fixActionErrorMessage}
        onAccept={handleAcceptFix}
        onReject={handleRejectFix}
        onClose={handleCloseFixDetails}
      />

      <HumanReviewModal
        isOpen={isHumanReviewOpen}
        reportId={humanReviewReportId}
        onClose={handleCloseHumanReview}
        onSubmit={submitHumanReviewUpdate}
      />
    </div>
  )
}

export default DashboardPage
