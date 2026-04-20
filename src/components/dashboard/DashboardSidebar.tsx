import type { ComponentType, SVGProps } from 'react'
import logo from '../../assets/logo.png'
import type { Report } from '../../types/report'
import type { UserRole } from '../../types/auth'
import ReportDetailsPanel from './ReportDetailsPanel'

type DashboardSection = 'home' | 'map' | 'assigned-reports' | 'profile'

interface SidebarItem {
  key: DashboardSection
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}

interface DashboardSidebarProps {
  activeSection: DashboardSection
  onSelectSection: (section: DashboardSection) => void
  selectedReport: Report | null
  viewerRole?: UserRole | null
  isDetailsLoading?: boolean
  detailsErrorMessage?: string | null
  onViewFullDetails?: (report: Report) => void
}

const HomeIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-5h4v5h3.5a1 1 0 0 0 1-1V9.5" />
    </svg>
  )
}

const MapPinIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.74 7-11a7 7 0 1 0-14 0c0 5.26 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.7" />
    </svg>
  )
}

const ReportsIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h8l4 4v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 3v5h5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h4" />
    </svg>
  )
}

const UserIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="8" r="3.2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  )
}

const sidebarItems: SidebarItem[] = [
  { key: 'home', label: 'الرئيسية', Icon: HomeIcon },
  { key: 'map', label: 'الخريطة', Icon: MapPinIcon },
  { key: 'assigned-reports', label: 'البلاغات المسندة', Icon: ReportsIcon },
  { key: 'profile', label: 'الملف الشخصي', Icon: UserIcon },
]

const DashboardSidebar = ({
  activeSection,
  onSelectSection,
  selectedReport,
  viewerRole = null,
  isDetailsLoading = false,
  detailsErrorMessage = null,
  onViewFullDetails,
}: DashboardSidebarProps) => {
  return (
    <aside
      dir="rtl"
      className="h-full self-stretch rounded-3xl border border-slate-200/70 bg-white/78 p-5 shadow-[0_22px_56px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/72 dark:shadow-[0_32px_82px_rgba(2,6,23,0.54)]"
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="mb-4 rounded-2xl border border-slate-200/75 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-200/75 bg-white/90 shadow-[0_10px_24px_rgba(16,185,129,0.16)] dark:border-emerald-500/30 dark:bg-slate-900/65 dark:shadow-[0_14px_30px_rgba(16,185,129,0.18)]">
              <img
                src={logo}
                alt="Amaar"
                className="h-8 w-8 object-contain"
                loading="lazy"
              />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">منصة عمار</p>
              <p className="truncate text-sm font-extrabold text-slate-800 dark:text-slate-100">مركز التحكم الذكي</p>
            </div>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between border-b border-slate-200/70 pb-3 dark:border-white/10">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Navigation</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">لوحة الإدارة</p>
        </div>

        <nav className="space-y-2.5" aria-label="القائمة الجانبية">
          {sidebarItems.map((item) => {
            const isActive = activeSection === item.key

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectSection(item.key)}
                className={`group flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-semibold transition ${
                  isActive
                    ? 'border-emerald-300 bg-gradient-to-l from-emerald-100/95 to-emerald-50/85 text-emerald-700 shadow-sm ring-1 ring-emerald-300/45 dark:border-emerald-500/45 dark:from-emerald-500/25 dark:to-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/30'
                    : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100/70 dark:text-slate-300 dark:hover:border-white/10 dark:hover:bg-white/5'
                }`}
              >
                <span
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-200'
                      : 'bg-slate-200/70 text-slate-500 group-hover:bg-slate-300 dark:bg-white/10 dark:text-slate-300 dark:group-hover:bg-white/20'
                  }`}
                  aria-hidden="true"
                >
                  <item.Icon className="h-4 w-4" />
                </span>

                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="mt-5 flex min-h-0 flex-1 flex-col border-t border-slate-200/70 pt-4 dark:border-white/10">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Details Panel
          </p>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <ReportDetailsPanel
              report={selectedReport}
              viewerRole={viewerRole}
              isLoading={isDetailsLoading}
              errorMessage={detailsErrorMessage}
              onViewFullDetails={onViewFullDetails}
            />
          </div>
        </div>
      </div>
    </aside>
  )
}

export type { DashboardSection }
export default DashboardSidebar
