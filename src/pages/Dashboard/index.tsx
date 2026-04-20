import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Pagination from '../../components/common/Pagination'
import DashboardSidebar, {
  type DashboardSection,
} from '../../components/dashboard/DashboardSidebar'
import DashboardTopbar from '../../components/dashboard/DashboardTopbar'
import ReportsFilters from '../../components/dashboard/ReportsFilters'
import ReportsTable from '../../components/dashboard/ReportsTable'
import StatCard from '../../components/dashboard/StatCard'
import useAuth from '../../hooks/useAuth'
import reportService from '../../services/reportService'
import useAuthorityReports from '../../hooks/useAuthorityReports'
import type { Report, ReportsFilterTab } from '../../types/report'
import {
  getLocationLabel,
  getReportFilterTabs,
  getReportTypeLabel,
} from '../../utils/reportPresentation'

const CLIENT_PAGE_SIZE = 8

const DashboardPage = () => {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [activeSection, setActiveSection] = useState<DashboardSection>('home')
  const [activeFilterTab, setActiveFilterTab] = useState<ReportsFilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [clientPage, setClientPage] = useState(1)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isDetailsLoading, setIsDetailsLoading] = useState(false)
  const [detailsErrorMessage, setDetailsErrorMessage] = useState<string | null>(null)
  const detailsRequestRef = useRef(0)

  const filterTabs = useMemo(() => getReportFilterTabs(user?.role ?? null), [user?.role])
  const isAuthorityViewer = user?.role === 'authority'

  const {
    counts,
    getTabReports,
    fetchReports,
    acceptReport,
    rejectReport,
    updateHumanReviewReport,
    startWorkOnReport,
    rejectPendingExecutionReport,
    resolveReport,
    isLoading,
    isRefreshing,
    isCountsLoading,
    errorMessage,
    actionErrorMessage,
    actionLoadingById,
  } = useAuthorityReports({ viewer: user ?? null })

  useEffect(() => {
    fetchReports({ refreshSummary: true })
  }, [fetchReports])

  useEffect(() => {
    setClientPage(1)
  }, [activeFilterTab, searchQuery])

  useEffect(() => {
    if (!filterTabs.some((tab) => tab.key === activeFilterTab)) {
      setActiveFilterTab('all')
    }
  }, [activeFilterTab, filterTabs])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const handleSelectReport = useCallback(async (report: Report) => {
    setSelectedReport(report)
    setDetailsErrorMessage(null)

    const requestId = detailsRequestRef.current + 1
    detailsRequestRef.current = requestId
    setIsDetailsLoading(true)

    try {
      const fullReport = await reportService.getReportById(report.id)

      if (detailsRequestRef.current !== requestId) {
        return
      }

      setSelectedReport(fullReport)
    } catch {
      if (detailsRequestRef.current !== requestId) {
        return
      }

      setDetailsErrorMessage('تعذر تحميل التفاصيل الكاملة، تم عرض البيانات الأساسية.')
    } finally {
      if (detailsRequestRef.current === requestId) {
        setIsDetailsLoading(false)
      }
    }
  }, [])

  const reportsByFilter = getTabReports(activeFilterTab)

  const filteredReports = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    if (!normalizedSearch) {
      return reportsByFilter
    }

    return reportsByFilter.filter((report) => {
      const haystack = [
        getReportTypeLabel(report),
        getLocationLabel(report),
        report.description,
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [reportsByFilter, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / CLIENT_PAGE_SIZE))

  const safeClientPage = Math.min(clientPage, totalPages)

  useEffect(() => {
    if (clientPage > totalPages) {
      setClientPage(totalPages)
    }
  }, [clientPage, totalPages])

  const paginatedReports = useMemo(() => {
    const startIndex = (safeClientPage - 1) * CLIENT_PAGE_SIZE
    return filteredReports.slice(startIndex, startIndex + CLIENT_PAGE_SIZE)
  }, [filteredReports, safeClientPage])

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

  const effectiveCurrentPage = safeClientPage
  const effectivePageSize = CLIENT_PAGE_SIZE
  const effectiveTotalItems = filteredReports.length

  const handlePageChange = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || targetPage === effectiveCurrentPage) {
      return
    }

    setClientPage(targetPage)
  }

  const handleRefresh = () => {
    fetchReports({
      isManualRefresh: true,
      refreshSummary: true,
    })

    setClientPage(1)
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
            {!isAuthorityViewer ? (
              <StatCard
                title="مراجعة بشرية"
                value={counts.humanReview}
                tone="danger"
                isLoading={isCountsLoading}
              />
            ) : null}
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

          <ReportsFilters activeTab={activeFilterTab} tabs={filterTabs} onChangeTab={setActiveFilterTab} />

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
                actionLoadingById={actionLoadingById}
                onAccept={acceptReport}
                onReject={rejectReport}
                onHumanReviewUpdate={updateHumanReviewReport}
                onStartWork={startWorkOnReport}
                onPendingReject={rejectPendingExecutionReport}
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
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              onLogout={handleLogout}
            />

            {renderSectionContent()}
          </main>

          <DashboardSidebar
            activeSection={activeSection}
            onSelectSection={setActiveSection}
            selectedReport={selectedReport}
            viewerRole={user?.role ?? null}
            isDetailsLoading={isDetailsLoading}
            detailsErrorMessage={detailsErrorMessage}
          />
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
