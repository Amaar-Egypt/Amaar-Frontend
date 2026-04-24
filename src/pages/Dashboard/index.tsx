import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Pagination from '../../components/common/Pagination'
import DashboardSidebar, {
  type DashboardSection,
} from '../../components/dashboard/DashboardSidebar'
import DashboardTopbar from '../../components/dashboard/DashboardTopbar'
import ReportsFilters from '../../components/dashboard/ReportsFilters'
import ReportsTable from '../../components/dashboard/ReportsTable'
import StatCard from '../../components/dashboard/StatCard'
import FullReportDetailsModal from '../../components/dashboard/FullReportDetailsModal'
import HumanReviewModal from '../../components/dashboard/HumanReviewModal'
import useAuth from '../../hooks/useAuth'
import useAuthorityReports from '../../hooks/useAuthorityReports'
import authorityService from '../../services/authorityService'
import reportService from '../../services/reportService'
import type {
  Report,
  ReportPriority,
  ReportsFilterTab,
  ReportTypeDefinition,
} from '../../types/report'
import type { AuthoritySummary } from '../../types/authority'
import { getApiErrorMessage } from '../../utils/apiResponse'
import { getReportFilterTabs } from '../../utils/reportPresentation'

const DEFAULT_TYPES_ERROR_MESSAGE = 'تعذر تحميل أنواع البلاغات.'
const DEFAULT_AUTHORITIES_ERROR_MESSAGE = 'تعذر تحميل الجهات المسندة.'

interface SelectOption {
  value: string
  label: string
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

  const filterTabs = useMemo(() => getReportFilterTabs(user?.role ?? null), [user?.role])
  const isAdminViewer = user?.role === 'admin'

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

  const authorityOptions: SelectOption[] = useMemo(
    () => authorities.map((authority) => ({
      value: authority.id,
      label: authority.name,
    })),
    [authorities],
  )

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
    if (!isAdminViewer) {
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
  }, [isAdminViewer])

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

  const paginatedReports = reports

  const totalPages = isServerPagination
    ? Math.max(1, pagination?.totalPages ?? 1)
    : 1

  const effectiveCurrentPage = isServerPagination ? currentPage : 1
  const effectivePageSize = isServerPagination ? (pagination?.limit ?? pageSize) : reports.length
  const effectiveTotalItems = isServerPagination
    ? pagination?.total
    : reports.length

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

  const renderSectionContent = () => {
    if (activeSection !== 'home') {
      return (
        <section
          dir="rtl"
          className="rounded-3xl border border-slate-200/70 bg-white/75 p-6 shadow-[0_18px_46px_rgba(15,23,42,0.1)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_28px_70px_rgba(2,6,23,0.48)]"
        >
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{activeSection === 'map' ? 'الخريطة' : activeSection === 'assigned-reports' ? 'البلاغات المسندة' : 'الملف الشخصي'}</h2>
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
                actionLoadingById={actionLoadingById}
                onAccept={acceptReport}
                onReject={rejectReport}
                onApproveHumanReview={approveHumanReviewReport}
                onOpenHumanReview={handleOpenHumanReview}
                onStartWork={startWorkOnReport}
                onResolve={resolveReport}
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
            selectedReport={selectedReport}
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
        onClose={handleCloseFullDetails}
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
