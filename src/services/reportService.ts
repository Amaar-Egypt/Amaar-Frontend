import apiClient from './apiClient'
import type { ApiEnvelope } from '../types/api'
import type {
  DashboardStats,
  Report,
  ReportClassificationStatus,
  ReportLocation,
  ReportPriority,
  ReportsPagination,
  ReportsQuery,
  ReportStatus,
  ReportTypeCode,
} from '../types/report'
import { normalizeDashboardStats } from '../utils/reportStats'
import {
  extractResponseData,
  extractResponseMessage,
  extractResponsePagination,
} from '../utils/apiResponse'

interface ReportApiModel {
  id: string
  userId?: string | number | null
  description?: string | null
  descriptionAr?: string | null
  imageUrl?: string | null
  type?: ReportTypeCode | null
  typeAr?: string | null
  priority: ReportPriority
  priorityReasonAr?: string | null
  status: ReportStatus
  reviewComment?: string | null
  citizenFixable?: boolean | number | string | null
  aiConfidence?: number | string | null
  classificationStatus?: string | null
  classificationAttempts?: number | string | null
  classificationError?: string | null
  classifiedAt?: string | null
  reviewedBy?: unknown
  reviewedAt?: string | null
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
const CLASSIFICATION_STATUSES: ReportClassificationStatus[] = [
  'pending',
  'processing',
  'completed',
  'failed',
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

const toBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value === 1) {
      return true
    }

    if (value === 0) {
      return false
    }
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    if (!normalized) {
      return null
    }

    if (['true', '1', 'yes'].includes(normalized)) {
      return true
    }

    if (['false', '0', 'no'].includes(normalized)) {
      return false
    }
  }

  return null
}

const pickBooleanField = (source: UnknownObject, keys: string[]): boolean | null => {
  for (const key of keys) {
    const value = toBoolean(source[key])

    if (value !== null) {
      return value
    }
  }

  return null
}

const toConfidenceNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (!trimmed) {
      return null
    }

    const normalized = trimmed.endsWith('%') ? trimmed.slice(0, -1) : trimmed
    const parsed = Number(normalized)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

const pickConfidenceField = (source: UnknownObject, keys: string[]): number | null => {
  for (const key of keys) {
    const value = toConfidenceNumber(source[key])

    if (value !== null) {
      return value
    }
  }

  return null
}

const normalizeClassificationStatus = (
  value: unknown,
): ReportClassificationStatus | null => {
  const normalized = toNonEmptyString(value)?.toLowerCase()

  if (!normalized) {
    return null
  }

  if (CLASSIFICATION_STATUSES.includes(normalized as ReportClassificationStatus)) {
    return normalized as ReportClassificationStatus
  }

  return null
}

const extractUserId = (source: UnknownObject): string | null => {
  const directUserId = pickStringField(source, ['userId', 'user_id'])

  if (directUserId) {
    return directUserId
  }

  const user = source.user
  if (isObject(user)) {
    return pickStringField(user, ['id', '_id', 'userId', 'user_id'])
  }

  return null
}

const extractReviewedBy = (source: UnknownObject): string | null => {
  const directReviewer = source.reviewedBy ?? source.reviewed_by
  const directStringReviewer = toNonEmptyString(directReviewer)

  if (directStringReviewer) {
    return directStringReviewer
  }

  if (isObject(directReviewer)) {
    return pickStringField(directReviewer, [
      'id',
      '_id',
      'name',
      'fullName',
      'full_name',
      'email',
      'username',
    ])
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

const normalizeReport = (raw: ReportApiModel): Report => {
  const source = raw as unknown as UnknownObject
  const normalizedType = isReportTypeCode(raw.type)
    ? raw.type
    : raw.type
      ? 'other'
      : null

  const descriptionAr = pickStringField(source, ['descriptionAr', 'description_ar'])
  const description = toNonEmptyString(raw.description) ?? ''

  return {
    id: raw.id,
    userId: extractUserId(source),
    description,
    descriptionAr,
    imageUrl: toNonEmptyString(raw.imageUrl) ?? '',
    type: normalizedType,
    typeAr: raw.typeAr ?? null,
    priority: raw.priority,
    priorityReasonAr: raw.priorityReasonAr ?? null,
    status: raw.status,
    reviewComment: raw.reviewComment ?? null,
    citizenFixable: pickBooleanField(source, ['citizenFixable', 'citizen_fixable']),
    aiConfidence: pickConfidenceField(source, ['aiConfidence', 'ai_confidence']),
    classificationStatus: normalizeClassificationStatus(
      source.classificationStatus ?? source.classification_status,
    ),
    classificationAttempts: pickNumericField(source, [
      'classificationAttempts',
      'classification_attempts',
    ]),
    classificationError: pickStringField(source, [
      'classificationError',
      'classification_error',
    ]),
    classifiedAt: pickStringField(source, ['classifiedAt', 'classified_at']),
    reviewedBy: extractReviewedBy(source),
    reviewedAt: pickStringField(source, ['reviewedAt', 'reviewed_at']),
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

const getTotalFromPagedResult = (result: ReportsResult): number => {
  return result.pagination?.total ?? result.reports.length
}

const getAuthorityReportsStats = async (): Promise<DashboardStats> => {
  const [
    allReportsResult,
    aiReviewResult,
    humanReviewResult,
    pendingResult,
    inProgressResult,
    resolvedResult,
  ] = await Promise.all([
    listReports({ page: 1, limit: 1 }),
    listReports({ page: 1, limit: 1, status: 'ai_review' }),
    listReports({ page: 1, limit: 1, status: 'human_review' }),
    listReports({ page: 1, limit: 1, status: 'pending' }),
    listReports({ page: 1, limit: 1, status: 'in_progress' }),
    listReports({ page: 1, limit: 1, status: 'resolved' }),
  ])

  return normalizeDashboardStats({
    total: getTotalFromPagedResult(allReportsResult),
    aiReview: getTotalFromPagedResult(aiReviewResult),
    humanReview: getTotalFromPagedResult(humanReviewResult),
    pending: getTotalFromPagedResult(pendingResult),
    inProgress: getTotalFromPagedResult(inProgressResult),
    resolved: getTotalFromPagedResult(resolvedResult),
  })
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
  getAuthorityReportsStats,
  getReportById,
  acceptReport,
  rejectReport,
  updateReport,
}

export default reportService
