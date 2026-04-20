import type { Report, ReportsFilterTab, ReportPriority, ReportStatus, ReportTypeCode } from '../types/report'
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

const typeArabicMap: Record<ReportTypeCode, string> = {
  pothole: 'حفرة في الطريق',
  garbage: 'تكدس قمامة',
  broken_cable_electric: 'كابل كهرباء تالف',
  broken_cable_telecom: 'كابل اتصالات تالف',
  streetlight: 'عمود إنارة معطل',
  sewage: 'طفح صرف صحي',
  water_leak: 'تسرب مياه',
  gas_leak: 'تسرب غاز',
  traffic_signal: 'إشارة مرور معطلة',
  sidewalk_damage: 'تلف في الرصيف',
  fallen_tree: 'سقوط شجرة',
  road_obstruction: 'عائق في الطريق',
  manhole_cover: 'غطاء بالوعة مفقود',
  transformer: 'عطل في محول كهرباء',
  other: 'بلاغ عام',
}

export const reportTypeOptions: Array<{ value: ReportTypeCode; label: string }> = [
  { value: 'pothole', label: typeArabicMap.pothole },
  { value: 'garbage', label: typeArabicMap.garbage },
  { value: 'broken_cable_electric', label: typeArabicMap.broken_cable_electric },
  { value: 'broken_cable_telecom', label: typeArabicMap.broken_cable_telecom },
  { value: 'streetlight', label: typeArabicMap.streetlight },
  { value: 'sewage', label: typeArabicMap.sewage },
  { value: 'water_leak', label: typeArabicMap.water_leak },
  { value: 'gas_leak', label: typeArabicMap.gas_leak },
  { value: 'traffic_signal', label: typeArabicMap.traffic_signal },
  { value: 'sidewalk_damage', label: typeArabicMap.sidewalk_damage },
  { value: 'fallen_tree', label: typeArabicMap.fallen_tree },
  { value: 'road_obstruction', label: typeArabicMap.road_obstruction },
  { value: 'manhole_cover', label: typeArabicMap.manhole_cover },
  { value: 'transformer', label: typeArabicMap.transformer },
  { value: 'other', label: typeArabicMap.other },
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

export const getReportTypeLabel = (report: Report) => {
  if (report.typeAr) {
    return report.typeAr
  }

  if (report.type) {
    return typeArabicMap[report.type] ?? typeArabicMap.other
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
