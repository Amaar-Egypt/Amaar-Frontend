import type { Report, ReportsFilterTab, ReportPriority, ReportStatus } from '../types/report'
import type { UserRole } from '../types/auth'

export interface ReportFilterTabOption {
  key: ReportsFilterTab
  label: string
}

const adminReportFilterTabs: ReportFilterTabOption[] = [
  { key: 'all', label: 'الكل' },
  { key: 'ai_review', label: 'مراجعة الذكاء' },
  { key: 'human_review', label: 'مراجعة بشرية' },
  { key: 'pending', label: 'جاهز للتنفيذ' },
  { key: 'in_progress', label: 'قيد التنفيذ' },
  { key: 'resolved', label: 'مكتمل' },
]

const authorityReportFilterTabs: ReportFilterTabOption[] = [
  { key: 'all', label: 'الكل' },
  { key: 'ai_review', label: 'مراجعة الذكاء' },
  { key: 'human_review', label: 'بانتظار مراجعة الإدارة' },
  { key: 'pending', label: 'جاهز للتنفيذ' },
  { key: 'in_progress', label: 'قيد التنفيذ' },
  { key: 'resolved', label: 'مكتمل' },
]

export const getReportFilterTabs = (
  role: UserRole | null | undefined,
): ReportFilterTabOption[] => {
  if (role === 'authority') {
    return authorityReportFilterTabs
  }

  return adminReportFilterTabs
}

const priorityLabelMap: Record<ReportPriority, string> = {
  critical: 'عالية جدًا',
  high: 'عالية',
  medium: 'متوسطة',
  low: 'منخفضة',
}

export const reportPriorityOptions: Array<{ value: ReportPriority; label: string }> = [
  { value: 'critical', label: priorityLabelMap.critical },
  { value: 'high', label: priorityLabelMap.high },
  { value: 'medium', label: priorityLabelMap.medium },
  { value: 'low', label: priorityLabelMap.low },
]

const statusLabelMap: Record<ReportStatus, string> = {
  ai_review: 'مراجعة الذكاء',
  human_review: 'مراجعة بشرية',
  pending: 'معتمد وجاهز للتنفيذ',
  in_progress: 'قيد التنفيذ',
  resolved: 'مكتمل',
}

export const isPendingActionStatus = (status: ReportStatus) => status === 'ai_review'

export const getReportStatusLabel = (
  status: ReportStatus,
  role?: UserRole | null,
) => {
  if (status === 'human_review' && role === 'authority') {
    return 'بانتظار مراجعة الإدارة'
  }

  return statusLabelMap[status]
}

export const getPriorityLabel = (priority: ReportPriority) => priorityLabelMap[priority]

export const getReportTypeLabel = (
  report: Report,
  typeLabelsByCode: Record<string, string> = {},
) => {
  if (report.type) {
    return typeLabelsByCode[report.type] || report.typeAr || report.type
  }

  if (report.typeAr) {
    return report.typeAr
  }
  return 'غير محدد'
}

export const getLocationLabel = (report: Report) => {
  if (!report.location) {
    return 'غير متوفر'
  }

  return `${report.location.lat.toFixed(4)} ، ${report.location.lng.toFixed(4)}`
}

export const formatArabicDate = (date: string) => {
  try {
    return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(date))
  } catch {
    return date
  }
}
