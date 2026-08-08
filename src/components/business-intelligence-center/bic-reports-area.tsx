"use client"

import type { ReactNode } from "react"
import { FileDown, FileSpreadsheet, FileText, Info } from "lucide-react"
import * as XLSX from "xlsx"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { downloadCsv } from "@/lib/export-csv"
import {
  buildBalanceReport,
  buildCustomersReport,
  buildInventoryReport,
  buildMonthlySeriesReport,
  type ReportTable,
} from "@/lib/business-intelligence-center"
import { computeMargin, computeProfit } from "@/lib/business-intelligence-center"
import type { BicBalance, BicBreakeven, BicInventario } from "./bic-data"
import { BicMoney } from "./bic-shared"

function slugifyTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
}

function downloadExcel(table: ReportTable) {
  const sheet = XLSX.utils.aoa_to_sheet([table.headers, ...table.rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, table.title.slice(0, 31))
  XLSX.writeFile(wb, `reporte-${slugifyTitle(table.title)}.xlsx`)
}

function downloadPdf(table: ReportTable) {
  const doc = new jsPDF()
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text(table.title, 14, 18)
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100)
  doc.text("Generado con Panitas · Business Intelligence Center", 14, 24)

  autoTable(doc, {
    startY: 30,
    head: [table.headers],
    body: table.rows,
    theme: "grid",
    headStyles: { fillColor: [24, 75, 191], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    styles: { cellPadding: 2 },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  if (table.summary && table.summary.length > 0) {
    doc.setFontSize(9)
    for (const row of table.summary) {
      doc.setFont("helvetica", "normal")
      doc.setTextColor(80)
      doc.text(row.label, 14, finalY)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(24, 75, 191)
      doc.text(row.value, 60, finalY)
    }
  }

  doc.save(`reporte-${slugifyTitle(table.title)}.pdf`)
}

function ExportCard({
  title,
  description,
  table,
  footer,
}: {
  title: string
  description: string
  table: ReportTable | null
  footer?: ReactNode
}) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm">{title}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {footer}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!table}
            onClick={() => table && downloadCsv(`reporte-${slugifyTitle(table.title)}`, table.headers, table.rows)}
          >
            <FileDown className="size-3.5" /> CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!table}
            onClick={() => table && downloadExcel(table)}
          >
            <FileSpreadsheet className="size-3.5" /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!table}
            onClick={() => table && downloadPdf(table)}
          >
            <FileText className="size-3.5" /> PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Área Reportes del Business Intelligence Center (FASE 5A).
 *
 * Solo exportación: CSV, Excel y PDF de los reportes que ya ves en el panel.
 * Sin listados ni estadísticas duplicadas.
 */
export function BicReportsArea({
  balance,
  inventario,
  breakeven,
}: {
  balance: BicBalance
  inventario: BicInventario | null
  breakeven: BicBreakeven | null
}) {
  const profit = computeProfit(balance.monthRevenue, balance.monthExpenses)
  const marginPercent = computeMargin(profit, balance.monthRevenue)

  const balanceTable = buildBalanceReport({
    monthRevenue: balance.monthRevenue,
    monthExpenses: balance.monthExpenses,
    monthOrders: balance.monthOrders,
    profit,
    marginPercent,
    breakEven: breakeven?.gastosFijos ?? 0,
    breakEvenPercent: breakeven?.porcentaje ?? 0,
    customersTotal: balance.customers.total,
  })

  const seriesTable = buildMonthlySeriesReport(balance.monthlySeries)
  const customersTable = buildCustomersReport(balance.customers)
  const inventoryTable = inventario
    ? buildInventoryReport({
        productCount: inventario.productCount,
        totalCostValue: inventario.totalCostValue,
        totalSellValue: inventario.totalSellValue,
        totalProfit: inventario.totalProfit,
        profitMargin: inventario.profitMargin,
        products: inventario.products,
      })
    : null

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-2xl border border-border/60 bg-card/70 p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-brand-primary" />
        <p>
          Esta sección es solo para exportar. Descarga en CSV, Excel o PDF los reportes que
          construiste en las áreas de Monitor, Operación, Salud Financiera y Análisis.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ExportCard
          title="Resumen del mes"
          description="Ingresos, gastos, utilidad y margen del período en curso"
          table={balanceTable}
          footer={
            <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Utilidad del mes</span>
              <span className="font-semibold">
                <BicMoney value={profit} />
              </span>
            </div>
          }
        />
        <ExportCard
          title="Serie mensual"
          description="Ingresos vs gastos de los últimos 12 meses"
          table={seriesTable}
        />
        <ExportCard
          title="Cartera de clientes"
          description="Totales, nuevos, reincidentes e inactivos"
          table={customersTable}
        />
        <ExportCard
          title="Inventario y márgenes"
          description="Stock, costos, precios y márgenes por producto"
          table={inventoryTable}
        />
      </div>
    </div>
  )
}
