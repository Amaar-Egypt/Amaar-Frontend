import type { ReportsFilterTab } from '../../types/report'
import type { ReportFilterTabOption } from '../../utils/reportPresentation'

interface ReportsFiltersProps {
  activeTab: ReportsFilterTab
  tabs: ReportFilterTabOption[]
  onChangeTab: (tab: ReportsFilterTab) => void
}

const ReportsFilters = ({ activeTab, tabs, onChangeTab }: ReportsFiltersProps) => {
  return (
    <div dir="rtl" className="flex flex-wrap items-center gap-2">
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
  )
}

export default ReportsFilters
