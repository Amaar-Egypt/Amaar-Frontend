interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems?: number
  pageSize?: number
  isLoading?: boolean
  onPageChange: (page: number) => void
}

type PaginationItem = number | 'ellipsis'

const getPaginationItems = (
  currentPage: number,
  totalPages: number,
): PaginationItem[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = new Set<number>([1, totalPages])

  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page > 1 && page < totalPages) {
      pages.add(page)
    }
  }

  const sortedPages = Array.from(pages).sort((a, b) => a - b)
  const items: PaginationItem[] = []

  for (let index = 0; index < sortedPages.length; index += 1) {
    const current = sortedPages[index]
    const previous = sortedPages[index - 1]

    if (previous && current - previous > 1) {
      items.push('ellipsis')
    }

    items.push(current)
  }

  return items
}

const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  isLoading = false,
  onPageChange,
}: PaginationProps) => {
  if (totalPages <= 1) {
    return null
  }

  const paginationItems = getPaginationItems(currentPage, totalPages)

  const from =
    totalItems && pageSize ? (currentPage - 1) * pageSize + 1 : undefined
  const to =
    totalItems && pageSize
      ? Math.min(currentPage * pageSize, totalItems)
      : undefined

  return (
    <div
      dir="rtl"
      className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/55"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          {typeof from === 'number' && typeof to === 'number' && totalItems
            ? `عرض ${from} - ${to} من ${totalItems} بلاغ`
            : `الصفحة ${currentPage} من ${totalPages}`}
        </p>

        <div className="hidden items-center gap-1 sm:flex">
          {paginationItems.map((item, index) => {
            if (item === 'ellipsis') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="inline-flex h-9 w-9 items-center justify-center text-slate-400"
                >
                  ...
                </span>
              )
            }

            const isActive = item === currentPage

            return (
              <button
                key={item}
                type="button"
                disabled={isLoading}
                onClick={() => onPageChange(item)}
                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl border px-3 text-sm font-bold transition ${
                  isActive
                    ? 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/55 dark:bg-emerald-500/20 dark:text-emerald-200'
                    : 'border-slate-200 bg-white/80 text-slate-600 hover:border-slate-300 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-300 dark:hover:bg-white/10'
                }`}
              >
                {item}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={isLoading || currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-55 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-white/10"
        >
          السابق
        </button>

        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
          {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          disabled={isLoading || currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-55 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-white/10"
        >
          التالي
        </button>
      </div>
    </div>
  )
}

export default Pagination
