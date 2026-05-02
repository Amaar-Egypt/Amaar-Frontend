export type ReportPriority = 'critical' | 'high' | 'medium' | 'low'

export type ReportStatus =
  | 'ai_review'
  | 'human_review'
  | 'pending'
  | 'in_progress'
  | 'resolved'

export type ReportClassificationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'

export type ReportTypeCode = string

export interface ReportTypeDefinition {
  code: ReportTypeCode
  label: string
}

export interface ReportLocation {
  lat: number
  lng: number
}

export interface Report {
  id: string
  userId: string | null
  description: string
  descriptionAr: string | null
  imageUrl: string
  type: ReportTypeCode | null
  typeAr: string | null
  priority: ReportPriority
  priorityReasonAr: string | null
  status: ReportStatus
  reviewComment: string | null
  citizenFixable: boolean | null
  aiConfidence: number | null
  classificationStatus: ReportClassificationStatus | null
  classificationAttempts: number | null
  classificationError: string | null
  classifiedAt: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  location: ReportLocation | null
  createdAt: string
  assignedAuth: string | null
}

export interface ReportsPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ReportsQuery {
  status?: ReportStatus
  priority?: ReportPriority
  type?: ReportTypeCode
  search?: string
  assignedAuth?: string
  page?: number
  limit?: number
}

export interface ReportPinsQuery {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
  scale: number
}

export interface ReportPin {
  id: string
  lat: number
  lng: number
  status: ReportStatus
}

export interface ReportPinCluster {
  lat: number
  lng: number
  count: number
}

export interface ReportPinsResultPins {
  mode: 'pins'
  pins: ReportPin[]
}

export interface ReportPinsResultClusters {
  mode: 'clusters'
  clusters: ReportPinCluster[]
  total: number
}

export type ReportPinsResult = ReportPinsResultPins | ReportPinsResultClusters

export interface DashboardStats {
  total: number
  aiReview: number
  humanReview: number
  pending: number
  inProgress: number
  resolved: number
}

export type ReportsFilterTab = 'all' | ReportStatus
