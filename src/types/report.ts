export type ReportPriority = 'critical' | 'high' | 'medium' | 'low'

export type ReportStatus =
  | 'ai_review'
  | 'human_review'
  | 'pending'
  | 'in_progress'
  | 'resolved'
  | 'rejected'

export type ReportTypeCode =
  | 'pothole'
  | 'garbage'
  | 'broken_cable_electric'
  | 'broken_cable_telecom'
  | 'streetlight'
  | 'sewage'
  | 'water_leak'
  | 'gas_leak'
  | 'traffic_signal'
  | 'sidewalk_damage'
  | 'fallen_tree'
  | 'road_obstruction'
  | 'manhole_cover'
  | 'transformer'
  | 'other'

export interface ReportLocation {
  lat: number
  lng: number
}

export interface Report {
  id: string
  description: string
  imageUrl: string
  type: ReportTypeCode | null
  typeAr: string | null
  priority: ReportPriority
  priorityReasonAr: string | null
  status: ReportStatus
  reviewComment: string | null
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
  page?: number
  limit?: number
}

export interface DashboardStats {
  total: number
  aiReview: number
  humanReview: number
  pending: number
  inProgress: number
  resolved: number
  rejected: number
}

export type ReportsFilterTab = 'all' | ReportStatus
