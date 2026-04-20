import apiClient from './apiClient'
import type { ApiEnvelope } from '../types/api'
import type {
  DashboardStats,
  Report,
  ReportLocation,
  ReportPriority,
  ReportsPagination,
  ReportsQuery,
  ReportStatus,
  ReportTypeCode,
} from '../types/report'
import {
  calculateDashboardStatsFromReports,
  normalizeDashboardStats,
} from '../utils/reportStats'
import {
  extractResponseData,
  extractResponseMessage,
  extractResponsePagination,
} from '../utils/apiResponse'

interface ReportApiModel {
  id: string
  description: string
  imageUrl: string
  type?: ReportTypeCode | null
  typeAr?: string | null
  priority: ReportPriority
  priorityReasonAr?: string | null
  status: ReportStatus
  reviewComment?: string | null
  location?: ReportLocation | null
  createdAt: string
  assignedAuth?: string | null
}

interface ReviewActionData {
  id: string
  status: ReportStatus
  reviewComment?: string | null
}

interface ReportsResult {
  reports: Report[]
  pagination: ReportsPagination | null
}

type UnknownObject = Record<string, unknown>

interface UpdateReportPayload {
  status?: ReportStatus
  type?: ReportTypeCode
  priority?: ReportPriority
  assignedAuth?: string
  description?: string
  reviewComment?: string
}

const DEFAULT_REJECT_COMMENT = 'تم رفض البلاغ من الجهة المختصة.'
const STATS_FETCH_PAGE_SIZE = 100
const SUMMARY_ENDPOINTS = [
  '/reports/summary',
  '/reports/stats',
  '/reports/dashboard-summary',
]
const REPORT_TYPE_CODES: ReportTypeCode[] = [
  'pothole',
  'garbage',
  'broken_cable_electric',
  'broken_cable_telecom',
  'streetlight',
  'sewage',
  'water_leak',
  'gas_leak',
  'traffic_signal',
  'sidewalk_damage',
  'fallen_tree',
  'road_obstruction',
  'manhole_cover',
  'transformer',
  'other',
]

const isObject = (value: unknown): value is UnknownObject => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isReportTypeCode = (value: unknown): value is ReportTypeCode => {
  return (
    typeof value === 'string' &&
    REPORT_TYPE_CODES.includes(value as ReportTypeCode)
  )
}

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return null
}

const pickStringField = (source: UnknownObject, keys: string[]): string | null => {
  for (const key of keys) {
    const value = toNonEmptyString(source[key])

    if (value) {
      return value
    }
  }

  return null
}

const extractAssignedAuthorityId = (raw: ReportApiModel): string | null => {
  const source = raw as unknown as UnknownObject

  const directField = pickStringField(source, [
    'assignedAuth',
    'assignedTo',
    'assigned_to',
    'authority',
    'authorityName',
    'authority_name',
    'assignedAuthorityId',
    'assigned_authority_id',
    'authorityId',
    'authority_id',
  ])

  if (directField) {
    return directField
  }

  const assignedAuthority = source.assignedAuthority
  if (isObject(assignedAuthority)) {
    const nestedField = pickStringField(assignedAuthority, [
      'id',
      '_id',
      'authorityId',
      'authority_id',
      'authorityCode',
      'authority_code',
      'name',
      'displayName',
      'display_name',
    ])

    if (nestedField) {
      return nestedField
    }
  }

  const assignedAuthObject = source.assignedAuth
  if (isObject(assignedAuthObject)) {
    const nestedField = pickStringField(assignedAuthObject, [
      'id',
      '_id',
      'authorityId',
      'authority_id',
      'authorityCode',
      'authority_code',
      'name',
      'displayName',
      'display_name',
    ])

    if (nestedField) {
      return nestedField
    }
  }

  return null
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

const pickNumericField = (
  source: UnknownObject,
  keys: string[],
): number | null => {
  for (const key of keys) {
    const value = toNumber(source[key])

    if (value !== null) {
      return value
    }
  }

  return null
}

const normalizeSummarySource = (source: UnknownObject): DashboardStats | null => {
  const total = pickNumericField(source, ['total', 'totalReports', 'reportsTotal'])

  const aiReview = pickNumericField(source, [
    'aiReview',
    'ai_review',
    'underAiReview',
    'inAiReview',
  ])

  const humanReview = pickNumericField(source, [
    'humanReview',
    'human_review',
    'manualReview',
    'inHumanReview',
  ])

  const pending = pickNumericField(source, [
    'pending',
    'readyForWork',
    'classifiedPendingWork',
  ])

  const inProgress = pickNumericField(source, [
    'inProgress',
    'in_progress',
    'activeWork',
  ])

  const resolved = pickNumericField(source, [
    'resolved',
    'completed',
    'closed',
  ])

  if (
    total === null ||
    aiReview === null ||
    humanReview === null ||
    pending === null ||
    inProgress === null ||
    resolved === null
  ) {
    return null
  }

  return normalizeDashboardStats({
    total,
    aiReview,
    humanReview,
    pending,
    inProgress,
    resolved,
  })
}

const extractSummaryFromPayload = (payload: unknown): DashboardStats | null => {
  if (!isObject(payload)) {
    return null
  }

  const candidates: UnknownObject[] = [payload]

  const data = payload.data
  if (isObject(data)) {
    candidates.push(data)

    const nestedSummary = data.summary
    if (isObject(nestedSummary)) {
      candidates.push(nestedSummary)
    }

    const nestedStats = data.stats
    if (isObject(nestedStats)) {
      candidates.push(nestedStats)
    }
  }

  const summary = payload.summary
  if (isObject(summary)) {
    candidates.push(summary)
  }

  const stats = payload.stats
  if (isObject(stats)) {
    candidates.push(stats)
  }

  for (const candidate of candidates) {
    const normalized = normalizeSummarySource(candidate)

    if (normalized) {
      return normalized
    }
  }

  return null
}

const normalizeReport = (raw: ReportApiModel): Report => {
  const normalizedType = isReportTypeCode(raw.type)
    ? raw.type
    : raw.type
      ? 'other'
      : null

  return {
    id: raw.id,
    description: raw.description,
    imageUrl: raw.imageUrl,
    type: normalizedType,
    typeAr: raw.typeAr ?? null,
    priority: raw.priority,
    priorityReasonAr: raw.priorityReasonAr ?? null,
    status: raw.status,
    reviewComment: raw.reviewComment ?? null,
    location: raw.location ?? null,
    createdAt: raw.createdAt,
    assignedAuth: extractAssignedAuthorityId(raw),
  }
}

const hasReportIdentity = (value: unknown): value is ReportApiModel => {
  return isObject(value) && typeof value.id === 'string'
}

const listReports = async (query?: ReportsQuery): Promise<ReportsResult> => {
  const response = await apiClient.get<ApiEnvelope<ReportApiModel[]> | ReportApiModel[]>('/reports', {
    params: query,
  })

  const payload = extractResponseData<ReportApiModel[] | ReportApiModel>(response.data)
  const rawList = Array.isArray(payload)
    ? payload
    : payload
      ? [payload]
      : []

  return {
    reports: rawList.map(normalizeReport),
    pagination: extractResponsePagination<ReportsPagination>(response.data) ?? null,
  }
}

const tryReadSummaryEndpoint = async (): Promise<DashboardStats | null> => {
  for (const endpoint of SUMMARY_ENDPOINTS) {
    try {
      const response = await apiClient.get<unknown>(endpoint)
      const normalized = extractSummaryFromPayload(response.data)

      if (normalized) {
        return normalized
      }
    } catch {
      // Ignore unsupported summary routes and fallback to safe aggregation.
    }
  }

  return null
}

const listAllAuthorityReports = async (): Promise<Report[]> => {
  const firstPage = await listReports({
    page: 1,
    limit: STATS_FETCH_PAGE_SIZE,
  })

  if (!firstPage.pagination || firstPage.pagination.totalPages <= 1) {
    return firstPage.reports
  }

  const mergedReports = [...firstPage.reports]
  const pageLimit = firstPage.pagination.limit || STATS_FETCH_PAGE_SIZE

  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    const pageResponse = await listReports({
      page,
      limit: pageLimit,
    })

    mergedReports.push(...pageResponse.reports)
  }

  const deduplicatedReports = new Map<string, Report>()

  for (const report of mergedReports) {
    deduplicatedReports.set(report.id, report)
  }

  return Array.from(deduplicatedReports.values())
}

const getAuthorityReportsStats = async (): Promise<DashboardStats> => {
  const summary = await tryReadSummaryEndpoint()

  if (summary) {
    return summary
  }

  const allReports = await listAllAuthorityReports()
  return calculateDashboardStatsFromReports(allReports)
}

const getReportById = async (id: string): Promise<Report> => {
  const response = await apiClient.get<ApiEnvelope<ReportApiModel> | ReportApiModel>(`/reports/${id}`)
  const reportPayload = extractResponseData<ReportApiModel>(response.data)

  if (reportPayload && hasReportIdentity(reportPayload)) {
    return normalizeReport(reportPayload)
  }

  throw new Error(extractResponseMessage(response.data) ?? 'تعذر تحميل تفاصيل البلاغ.')
}

const acceptReport = async (id: string): Promise<ReviewActionData | null> => {
  const response = await apiClient.patch<ApiEnvelope<ReviewActionData>>(`/reports/${id}/accept`)
  return extractResponseData<ReviewActionData>(response.data)
}

const rejectReport = async (
  id: string,
  comment: string = DEFAULT_REJECT_COMMENT,
): Promise<ReviewActionData | null> => {
  const response = await apiClient.patch<ApiEnvelope<ReviewActionData>>(`/reports/${id}/reject`, {
    comment,
  })

  return extractResponseData<ReviewActionData>(response.data)
}

const updateReport = async (
  id: string,
  payload: UpdateReportPayload,
): Promise<Report | null> => {
  const response = await apiClient.patch<ApiEnvelope<ReportApiModel>>(`/reports/${id}`, payload)
  const reportPayload = extractResponseData<ReportApiModel>(response.data)

  if (!reportPayload || !hasReportIdentity(reportPayload)) {
    return null
  }

  return normalizeReport(reportPayload)
}

const reportService = {
  listReports,
  listAllAuthorityReports,
  getAuthorityReportsStats,
  getReportById,
  acceptReport,
  rejectReport,
  updateReport,
}

export default reportService
