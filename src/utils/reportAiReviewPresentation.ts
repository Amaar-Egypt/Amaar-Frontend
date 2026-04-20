import type { Report, ReportClassificationStatus } from '../types/report'

const FALLBACK_TEXT = 'غير متوفر'

const classificationStatusLabelMap: Record<ReportClassificationStatus, string> = {
  pending: 'بانتظار التصنيف',
  processing: 'جاري التصنيف',
  completed: 'مكتمل',
  failed: 'فشل التصنيف',
}

const hasNonEmptyClassificationError = (classificationError: string | null) => {
  return Boolean(classificationError?.trim())
}

export const hasClassificationFailure = (report: Report) => {
  return (
    report.classificationStatus === 'failed' ||
    hasNonEmptyClassificationError(report.classificationError)
  )
}

export const getClassificationStatusLabel = (
  status: Report['classificationStatus'],
) => {
  if (!status) {
    return FALLBACK_TEXT
  }

  return classificationStatusLabelMap[status]
}

export const getAiReviewOutcomeLabel = (report: Report) => {
  if (hasClassificationFailure(report)) {
    return 'سبب التحويل للمراجعة البشرية'
  }

  return 'نتيجة التصنيف الذكي'
}

export const getAiReviewOutcomeMessage = (report: Report) => {
  if (hasClassificationFailure(report)) {
    if (report.status === 'human_review') {
      return 'فشل التصنيف التلقائي بسبب ضغط على خدمة الذكاء الاصطناعي، وتم إرسال البلاغ للمراجعة البشرية.'
    }

    if (report.status === 'ai_review') {
      return 'تعذر إتمام مراجعة الذكاء الاصطناعي حاليًا، وتم تحويل البلاغ للمراجعة البشرية.'
    }

    return 'الذكاء الاصطناعي لم يتمكن من تصنيف البلاغ حاليًا، وسيتم مراجعته بشريًا بواسطة المسؤول المختص.'
  }

  switch (report.classificationStatus) {
    case 'completed':
      return 'تمت مراجعة البلاغ آليًا بنجاح، ويمكن متابعة الإجراء وفق حالة البلاغ الحالية.'
    case 'processing':
      return 'جاري تنفيذ المراجعة الذكية للبلاغ، وسيتم تحديث النتيجة تلقائيًا.'
    case 'pending':
      return 'بانتظار استكمال المراجعة الذكية، وسيتم تحديث النتيجة فور توفرها.'
    default:
      if (report.status === 'human_review') {
        return 'البلاغ قيد المراجعة البشرية لضمان دقة القرار النهائي.'
      }

      return 'سيتم عرض نتيجة التصنيف الذكي فور توفرها.'
  }
}