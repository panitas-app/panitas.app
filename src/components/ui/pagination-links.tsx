import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function PaginationLinks({
  page,
  totalPages,
  total,
  basePath,
  searchParams,
}: {
  page: number
  totalPages: number
  total: number
  basePath: string
  searchParams: Record<string, string>
}) {
  if (totalPages <= 1) return null

  function href(p: number) {
    const params = new URLSearchParams(searchParams)
    if (p === 1) params.delete("page")
    else params.set("page", String(p))
    const qs = params.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  const pages: (number | "...")[] = []
  const maxVisible = 5
  if (totalPages <= maxVisible + 2) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push("...")
    const start = Math.max(2, page - 1)
    const end = Math.min(totalPages - 1, page + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (page < totalPages - 2) pages.push("...")
    pages.push(totalPages)
  }

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <p className="text-xs text-slate-400">
        {total} registro{total !== 1 ? "s" : ""} — Pág. {page} de {totalPages}
      </p>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link href={href(page - 1)} className="inline-flex size-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100">
            <ChevronLeft className="size-4" />
          </Link>
        ) : (
          <span className="inline-flex size-8 items-center justify-center rounded-md text-slate-300">
            <ChevronLeft className="size-4" />
          </span>
        )}
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} className="px-1 text-xs text-slate-400">...</span>
          ) : (
            <Link
              key={p}
              href={href(p)}
              className={`inline-flex size-8 items-center justify-center rounded-md text-xs font-bold ${
                p === page
                  ? "bg-primary text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p}
            </Link>
          )
        )}
        {page < totalPages ? (
          <Link href={href(page + 1)} className="inline-flex size-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100">
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className="inline-flex size-8 items-center justify-center rounded-md text-slate-300">
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </div>
  )
}
