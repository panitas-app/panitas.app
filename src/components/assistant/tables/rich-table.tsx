"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { RichBlock } from "@/lib/conversational-actions"
import { iconByName } from "@/components/assistant/renderers/icons"
import { TONE } from "@/components/assistant/renderers/styles"
import { filterByColumns, filterRows, paginate, sortRows, type SortDirection } from "@/components/assistant/tables/table-logic"

type Row = Array<string | number>

/** Tabla inteligente (FASE 5E): orden, búsqueda, filtros, paginación y filas expandibles. */
export function RichTable({ block }: { block: Extract<RichBlock, { kind: "table" }> }) {
  const columns = block.headers
  const allRows = block.rows
  const expandRows = block.expandRows ?? []

  const [sort, setSort] = React.useState<{ index: number; dir: "asc" | "desc" } | null>(null)
  const [query, setQuery] = React.useState("")
  const [filters] = React.useState<Record<number, string>>({})
  const [page, setPage] = React.useState(1)
  const [expanded, setExpanded] = React.useState<Set<number>>(() => new Set())

  const pageSize = block.pageSize ?? 8
  const hasSort = block.sortable === true
  const hasSearch = block.searchable === true
  const hasFilters = block.filterable === true
  const hasPagination = block.paginated === true
  const hasExpand = block.expandable === true
  const totalColumns = columns.length + (hasExpand ? 1 : 0)

  let rows: Row[] = allRows
  if (hasFilters && Object.keys(filters).length > 0) rows = filterByColumns(rows, filters)
  if (hasSearch) rows = filterRows(rows, query)
  if (hasSort && sort) rows = sortRows(rows, sort.index, sort.dir)

  const totalPages = hasPagination ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1
  const safePage = Math.min(Math.max(1, page), totalPages)
  const visible = hasPagination ? paginate(rows, safePage, pageSize).pageRows : rows

  const toggleSort = (index: number) => {
    setSort((prev) => (prev?.index === index ? { index, dir: prev.dir === "asc" ? "desc" : "asc" } : { index, dir: "asc" }))
  }

  const toggleExpand = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const hasAny = rows.length > 0
  const hasVisibleAny = visible.length > 0

  return (
    <Card className="rounded-2xl border bg-card/60" data-slot="assistant-table">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 px-4 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          {block.icon ? (() => { const Icon = iconByName(block.icon); return Icon ? <Icon className="size-4 text-muted-foreground" aria-hidden /> : null })() : null}
          <CardTitle className="text-sm font-semibold">{block.title}</CardTitle>
          {block.badge ? <Badge variant="secondary">{block.badge}</Badge> : null}
        </div>
        {hasSearch ? (
          <input
            type="search"
            aria-label={`Buscar en ${block.title}`}
            placeholder="Buscar…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
            className="h-8 w-full rounded-md border border-border/60 bg-card/70 px-2.5 text-xs outline-none focus:border-ring sm:w-52"
          />
        ) : null}
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((header, i) => (
                  <TableHead key={i} className="whitespace-nowrap">
                    {hasSort && hasAny ? (
                      <button type="button" onClick={() => toggleSort(i)} className="inline-flex items-center gap-1 hover:text-foreground">
                        {header}
                        <span aria-hidden className="text-[10px]">{sort?.index === i ? (sort.dir === "asc" ? "↑" : "↓") : "⇅"}</span>
                      </button>
                    ) : (
                      header
                    )}
                  </TableHead>
                ))}
                {hasExpand ? <TableHead className="w-8" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {!hasVisibleAny ? (
                <TableRow>
                  <TableCell colSpan={totalColumns} className="h-16 text-center text-muted-foreground">
                    Sin resultados
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((row, ri) => {
                  const globalIndex = hasPagination ? (safePage - 1) * pageSize + ri : ri
                  const isOpen = hasExpand && expanded.has(globalIndex)
                  const rowTone = block.rowTone?.[globalIndex] ? TONE[block.rowTone[globalIndex]].text : ""
                  return (
                    <React.Fragment key={globalIndex}>
                      <TableRow>
                        {row.map((cell, ci) => (
                          <TableCell key={ci} className={cn("max-w-[220px] truncate", rowTone)}>
                            {formatCell(cell)}
                          </TableCell>
                        ))}
                        {hasExpand ? (
                          <TableCell className="w-8 p-1 text-right">
                            <Button type="button" variant="ghost" size="icon-xs" onClick={() => toggleExpand(globalIndex)} aria-label={isOpen ? "Contraer fila" : "Expandir fila"}>
                              <span aria-hidden className="text-xs">{isOpen ? "−" : "+"}</span>
                            </Button>
                          </TableCell>
                        ) : null}
                      </TableRow>
                      {isOpen && expandRows[globalIndex] ? (
                        <TableRow>
                          <TableCell colSpan={totalColumns} className="border-l-2 border-primary/40 bg-muted/30">
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                              {expandRows[globalIndex].map((item, ei) => (
                                <div key={ei} className="flex items-baseline gap-2">
                                  <dt className="text-muted-foreground">{item.label}</dt>
                                  <dd className="font-medium text-foreground">{formatCell(item.value)}</dd>
                                </div>
                              ))}
                            </dl>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </React.Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {hasPagination && totalPages > 1 ? (
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
            <span className="text-xs text-muted-foreground">
              Página {safePage} de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Anterior
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Siguiente
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function formatCell(value: string | number): string {
  if (typeof value === "number") return new Intl.NumberFormat("es-VE").format(value)
  return value
}

export type { SortDirection }
