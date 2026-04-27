import type { ApiPagination } from './api'

export type FixStatus = 'pending' | 'accepted' | 'rejected'

export interface Fix {
  id: string
  reportId: string
  userId: string | null
  imageUrl: string | null
  description: string | null
  status: FixStatus
  pointsAwarded: number
  comment: string | null
  createdAt: string
  updatedAt: string
}

export interface FixesQuery {
  user?: string
  status?: FixStatus
  authority?: string
  page?: number
  limit?: number
}

export interface ReportFixesResult {
  fixes: Fix[]
  pagination: ApiPagination | null
}

export interface FixesResult {
  fixes: Fix[]
  pagination: ApiPagination | null
}
