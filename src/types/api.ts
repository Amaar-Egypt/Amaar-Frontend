export interface ApiPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiSuccessEnvelope<TData = unknown> {
  success: true
  message: string
  data?: TData
  pagination?: ApiPagination
}

export interface ApiValidationErrorItem {
  field: string
  message: string
}

export interface ApiErrorEnvelope {
  success: false
  message: string
  errors?: ApiValidationErrorItem[]
}

export type ApiEnvelope<TData = unknown> =
  | ApiSuccessEnvelope<TData>
  | ApiErrorEnvelope
