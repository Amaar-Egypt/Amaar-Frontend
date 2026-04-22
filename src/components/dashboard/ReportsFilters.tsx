import type { ReportPriority, ReportsFilterTab } from '../../types/report'
import type { ReportFilterTabOption } from '../../utils/reportPresentation'
import { reportPriorityOptions } from '../../utils/reportPresentation'

interface SelectOption {
  value: string
  label: string
}

interface ReportsFiltersProps {
  activeTab: ReportsFilterTab
  tabs: ReportFilterTabOption[]
  selectedPriority: 'all' | ReportPriority
  selectedType: 'all' | string
  typeOptions: SelectOption[]
  assignedAuth: string
  authorityOptions: SelectOption[]
  isAdminViewer: boolean
  isAuthoritiesLoading?: boolean
  onChangeTab: (tab: ReportsFilterTab) => void
  onChangePriority: (priority: 'all' | ReportPriority) => void
  onChangeType: (type: 'all' | string) => void
  onChangeAssignedAuth: (value: string) => void
}

const ReportsFilters = ({
  activeTab,
  tabs,
  selectedPriority,
  selectedType,
  typeOptions,
  assignedAuth,
  authorityOptions,
  isAdminViewer,
  isAuthoritiesLoading = false,
  onChangeTab,
  onChangePriority,
  onChangeType,
  onChangeAssignedAuth,
}: ReportsFiltersProps) => {
  return (
    <div dir="rtl" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChangeTab(tab.key)}
              className={`rounded-full border px-4 py-1.5 text-xs font-bold transition ${
                isActive
                  ? 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/20 dark:text-emerald-200'
                  : 'border-slate-200 bg-white/65 text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-300 dark:hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
          الأولوية
          <select
            value={selectedPriority}
            onChange={(event) =>
              onChangePriority(
                event.target.value as 'all' | ReportPriority
              )
            }
            className="rounded-xl border border-slate-200 bg-white/75 px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-400 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-200"
          >
            <option value="all">كل الأولويات</option>

            {reportPriorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
          نوع البلاغ
          <select
            value={selectedType}
            onChange={(event) =>
              onChangeType(event.target.value as 'all' | string)
            }
            className="rounded-xl border border-slate-200 bg-white/75 px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-400 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-200"
          >
            <option value="all">كل الأنواع</option>

            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isAdminViewer ? (
        <div className="grid gap-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            الجهة المسندة
            <select
              value={assignedAuth}
              onChange={(event) => onChangeAssignedAuth(event.target.value)}
              disabled={isAuthoritiesLoading}
              className="rounded-xl border border-slate-200 bg-white/75 px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-200"
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
        </div>
      ) : null}
    </div>
  )
}

export default ReportsFilters