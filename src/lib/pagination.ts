export function getPaginationParams(searchParams: URLSearchParams, defaultTake = 20) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const take = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || String(defaultTake))))
  const skip = (page - 1) * take
  return { skip, take, page }
}

export function paginatedResponse<T>(data: T[], total: number, page: number, take: number) {
  return {
    data,
    total,
    page,
    totalPages: Math.ceil(total / take),
    hasMore: page * take < total,
  }
}
