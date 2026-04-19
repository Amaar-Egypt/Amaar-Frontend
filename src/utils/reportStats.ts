import type { DashboardStats, Report, ReportStatus } from '../types/report'

type StatsBucket = 'aiReview' | 'humanReview' | 'pending' | 'inProgress' | 'resolved' | 'rejected' | null

export const createEmptyDashboardStats = (): DashboardStats => {
  return {
    total: 0,
    aiReview: 0,
    humanReview: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    rejected: 0,
  }
}

const toSafeCount = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.trunc(value))
}

export const normalizeDashboardStats = (
  stats: DashboardStats,
): DashboardStats => {
  return {
    total: toSafeCount(stats.total),
    aiReview: toSafeCount(stats.aiReview),
    humanReview: toSafeCount(stats.humanReview),
    pending: toSafeCount(stats.pending),
    inProgress: toSafeCount(stats.inProgress),
    resolved: toSafeCount(stats.resolved),
    rejected: toSafeCount(stats.rejected),
  }
}

export const getStatsBucketForStatus = (status: ReportStatus): StatsBucket => {
  switch (status) {
    case 'ai_review':
      return 'aiReview'
    case 'human_review':
      return 'humanReview'
    case 'pending':
      return 'pending'
    case 'in_progress':
      return 'inProgress'
    case 'resolved':
      return 'resolved'
    case 'rejected':
      return 'rejected'
    default:
      return null
  }
}

export const calculateDashboardStatsFromReports = (reports: Report[]) => {
  const stats = createEmptyDashboardStats()

  for (const report of reports) {
    stats.total += 1

    const bucket = getStatsBucketForStatus(report.status)

    if (bucket) {
      stats[bucket] += 1
    }
  }

  return normalizeDashboardStats(stats)
}

export const applyDashboardStatsTransition = (
  currentStats: DashboardStats,
  previousStatus: ReportStatus,
  nextStatus: ReportStatus,
) => {
  const previousBucket = getStatsBucketForStatus(previousStatus)
  const nextBucket = getStatsBucketForStatus(nextStatus)

  if (!previousBucket || !nextBucket || previousBucket === nextBucket) {
    return currentStats
  }

  const nextStats = {
    ...currentStats,
    [previousBucket]: currentStats[previousBucket] - 1,
    [nextBucket]: currentStats[nextBucket] + 1,
  }

  return normalizeDashboardStats(nextStats)
}
