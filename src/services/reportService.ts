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
  ReportTypeDefinition,
} from '../types/report'
import { normalizeDashboardStats } from '../utils/reportStats'
import {
  extractResponseData,
  extractResponseMessage,
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

interface ReportTypeApiModel {
  code?: string | null
  type?: string | null
  value?: string | null
  key?: string | null
  id?: string | number | null
  _id?: string | number | null
  label?: string | null
  labelAr?: string | null
  name?: string | null
  nameAr?: string | null
  typeAr?: string | null
  category?: string | null
  categoryAr?: string | null
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
const CLASSIFICATION_STATUSES: ReportClassificationStatus[] = [
  'pending',
  'processing',
  'completed',
  'failed',
]
const PAGINATION_TOTAL_KEYS = [
  'total',
  'totalItems',
  'totalCount',
  'count',
  'total_records',
  'totalRecords',
  'recordsTotal',
]
const PAGINATION_LIMIT_KEYS = [
  'limit',
  'perPage',
  'pageSize',
  'page_size',
  'per_page',
]
const PAGINATION_PAGE_KEYS = [
  'page',
  'currentPage',
  'pageNumber',
  'page_index',
  'pageIndex',
]
const PAGINATION_TOTAL_PAGES_KEYS = [
  'totalPages',
  'pages',
  'pageCount',
  'total_pages',
  'page_count',
]

const isObject = (value: unknown): value is UnknownObject => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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

const REPORTS_SEARCH_PARAM =
  toNonEmptyString(import.meta.env.VITE_REPORTS_SEARCH_PARAM) ?? 'search'

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
  const normalizedType = pickStringField(source, ['type', 'reportType', 'report_type'])
  const normalizedTypeAr = pickStringField(source, [
    'typeAr',
    'type_ar',
    'reportTypeAr',
    'report_type_ar',
  ])

  const descriptionAr = pickStringField(source, ['descriptionAr', 'description_ar'])
  const description = toNonEmptyString(raw.description) ?? ''

  return {
    id: raw.id,
    userId: extractUserId(source),
    description,
    descriptionAr,
    imageUrl: toNonEmptyString(raw.imageUrl) ?? '',
    type: normalizedType as ReportTypeCode | null,
    typeAr: normalizedTypeAr,
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

const normalizeReportsQuery = (
  query?: ReportsQuery,
): Record<string, string | number> | undefined => {
  if (!query) {
    return undefined
  }

  const normalized: Record<string, string | number> = {}

  if (query.status) {
    normalized.status = query.status
  }

  if (query.priority) {
    normalized.priority = query.priority
  }

  const type = toNonEmptyString(query.type)
  if (type) {
    normalized.type = type
  }

  const search = toNonEmptyString(query.search)
  if (search) {
    normalized[REPORTS_SEARCH_PARAM] = search
  }

  const assignedAuth = toNonEmptyString(query.assignedAuth)
  if (assignedAuth) {
    normalized.assignedAuth = assignedAuth
  }

  if (typeof query.page === 'number' && Number.isFinite(query.page)) {
    normalized.page = query.page
  }

  if (typeof query.limit === 'number' && Number.isFinite(query.limit)) {
    normalized.limit = query.limit
  }

  return Object.keys(normalized).length ? normalized : undefined
}

const pickReportsArray = (source: UnknownObject): unknown[] | null => {
  const candidates: unknown[] = [
    source.reports,
    source.items,
    source.results,
    source.data,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
    }
  }

  return null
}

const extractReportsPayload = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload
  }

  if (!isObject(payload)) {
    return []
  }

  const container = payload as UnknownObject
  const direct = pickReportsArray(container)

  if (direct) {
    return direct
  }

  const nestedCandidates = [container.data, container.result]

  for (const candidate of nestedCandidates) {
    if (isObject(candidate)) {
      const nested = pickReportsArray(candidate as UnknownObject)
      if (nested) {
        return nested
      }
    }
  }

  return []
}

const normalizeReportsPagination = (
  source: UnknownObject,
  fallback: { page: number; limit: number },
): ReportsPagination | null => {
  const total = pickNumericField(source, PAGINATION_TOTAL_KEYS)

  if (total === null) {
    return null
  }

  const limit = pickNumericField(source, PAGINATION_LIMIT_KEYS) ?? fallback.limit
  const page = pickNumericField(source, PAGINATION_PAGE_KEYS) ?? fallback.page
  const totalPages =
    pickNumericField(source, PAGINATION_TOTAL_PAGES_KEYS) ??
    Math.max(1, Math.ceil(total / Math.max(1, limit)))

  return {
    total: Math.max(0, Math.trunc(total)),
    limit: Math.max(1, Math.trunc(limit)),
    page: Math.max(1, Math.trunc(page)),
    totalPages: Math.max(1, Math.trunc(totalPages)),
  }
}

const extractReportsPagination = (
  payload: unknown,
  fallback: { page: number; limit: number },
): ReportsPagination | null => {
  if (!isObject(payload)) {
    return null
  }

  const container = payload as UnknownObject
  const pagination = container.pagination

  if (isObject(pagination)) {
    const normalized = normalizeReportsPagination(pagination, fallback)
    if (normalized) {
      return normalized
    }
  }

  const meta = container.meta ?? container.metadata

  if (isObject(meta)) {
    const metaPagination = (meta as UnknownObject).pagination

    if (isObject(metaPagination)) {
      const normalized = normalizeReportsPagination(metaPagination, fallback)
      if (normalized) {
        return normalized
      }
    }

    const normalized = normalizeReportsPagination(meta as UnknownObject, fallback)
    if (normalized) {
      return normalized
    }
  }

  return normalizeReportsPagination(container, fallback)
}

const extractReportTypesPayload = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload
  }

  if (!isObject(payload)) {
    return []
  }

  const container = payload as UnknownObject
  const candidates: unknown[] = [
    container.types,
    container.reportTypes,
    container.items,
    container.results,
    container.data,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
    }
  }

  return []
}

const normalizeReportTypeDefinition = (raw: unknown): ReportTypeDefinition | null => {
  if (typeof raw === 'string') {
    const code = toNonEmptyString(raw)

    if (!code) {
      return null
    }

    return {
      code,
      label: code,
    }
  }

  if (!isObject(raw)) {
    return null
  }

  const source = raw as ReportTypeApiModel & UnknownObject

  const code = pickStringField(source, ['code', 'type', 'value', 'key', 'id', '_id'])

  if (!code) {
    return null
  }

  const label =
    pickStringField(source, [
      'labelAr',
      'typeAr',
      'nameAr',
      'categoryAr',
      'label',
      'name',
      'type',
      'value',
      'code',
    ]) ?? code

  return {
    code,
    label,
  }
}

const listReportTypes = async (): Promise<ReportTypeDefinition[]> => {
  const response = await apiClient.get<ApiEnvelope<unknown> | unknown>('/reports/types')
  const payload = extractResponseData<unknown>(response.data)
  const rawList = extractReportTypesPayload(payload)

  const dedupedByCode = new Map<string, ReportTypeDefinition>()

  for (const rawType of rawList) {
    const normalized = normalizeReportTypeDefinition(rawType)

    if (!normalized || dedupedByCode.has(normalized.code)) {
      continue
    }

    dedupedByCode.set(normalized.code, normalized)
  }

  return Array.from(dedupedByCode.values())
}

const listReports = async (query?: ReportsQuery): Promise<ReportsResult> => {
  const normalizedQuery = normalizeReportsQuery(query)

  const response = await apiClient.get<ApiEnvelope<ReportApiModel[]> | ReportApiModel[]>('/reports', {
    params: normalizedQuery,
  })

  const payload = extractResponseData<unknown>(response.data) ?? response.data
  const rawList = extractReportsPayload(payload) as ReportApiModel[]
  const fallbackPagination = {
    page: query?.page ?? 1,
    limit: query?.limit ?? Math.max(1, rawList.length),
  }
  const pagination =
    extractReportsPagination(response.data, fallbackPagination) ??
    extractReportsPagination(payload, fallbackPagination) ??
    null

  return {
    reports: rawList.map(normalizeReport),
    pagination,
  }
}

const getTotalFromPagedResult = (result: ReportsResult): number => {
  return result.pagination?.total ?? 0
}

const getAuthorityReportsStats = async (
  scopeQuery?: Pick<ReportsQuery, 'assignedAuth' | 'priority' | 'type' | 'search'>,
): Promise<DashboardStats> => {
  const assignedAuth = toNonEmptyString(scopeQuery?.assignedAuth)
  const priority = scopeQuery?.priority
  const type = toNonEmptyString(scopeQuery?.type)
  const search = toNonEmptyString(scopeQuery?.search)
  const scopedQuery: Pick<ReportsQuery, 'assignedAuth' | 'priority' | 'type' | 'search'> = {}

  if (assignedAuth) {
    scopedQuery.assignedAuth = assignedAuth
  }

  if (priority) {
    scopedQuery.priority = priority
  }

  if (type) {
    scopedQuery.type = type
  }

  if (search) {
    scopedQuery.search = search
  }

  const [
    allReportsResult,
    aiReviewResult,
    humanReviewResult,
    pendingResult,
    inProgressResult,
    resolvedResult,
  ] = await Promise.all([
    listReports({ ...scopedQuery, page: 1, limit: 1 }),
    listReports({ ...scopedQuery, page: 1, limit: 1, status: 'ai_review' }),
    listReports({ ...scopedQuery, page: 1, limit: 1, status: 'human_review' }),
    listReports({ ...scopedQuery, page: 1, limit: 1, status: 'pending' }),
    listReports({ ...scopedQuery, page: 1, limit: 1, status: 'in_progress' }),
    listReports({ ...scopedQuery, page: 1, limit: 1, status: 'resolved' }),
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
  listReportTypes,
  listReports,
  getAuthorityReportsStats,
  getReportById,
  acceptReport,
  rejectReport,
  updateReport,
}

export default reportService
