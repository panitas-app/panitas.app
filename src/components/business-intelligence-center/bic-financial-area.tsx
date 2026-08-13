"use client"

import { Receipt, Target, TrendingDown, TrendingUp, Wallet } from "lucide-react"

import GastosPage from "@/components/dashboard/gastos-page"
import PuntoEquilibrioTab from "@/components/dashboard/punto-equilibrio-tab"
import {
  computeCashFlow,
  computeMargin,
  computeProfit,
  interpretBreakEven,
  interpretFinancialHealth,
  type FinancialHealthSnapshot,
} from "@/lib/business-intelligence-center"
import type { BicBalance, BicBreakeven } from "./bic-data"
import { BicMoney, BicProgressBar, BicSectionTitle, PanitasInterpretation } from "./bic-shared"

/**
 * Área Salud Financiera del Business Intelligence Center (FASE 5A).
 *
 * Hero de ingresos, gastos, utilidad, margen y punto de equilibrio del mes,
 * con interpretación conversacional de Panitas. Debajo, el registro de gastos
 * y el punto de equilibrio en detalle.
 */
export function BicFinancialArea({ balance, breakeven }: { balance: BicBalance; breakeven: BicBreakeven | null }) {
  const profit = computeProfit(balance.monthRevenue, balance.monthExpenses)
  const marginPercent = computeMargin(profit, balance.monthRevenue)
  const cashFlow = computeCashFlow(balance.monthRevenue, balance.monthExpenses)

  const snapshot: FinancialHealthSnapshot = {
    monthRevenue: balance.monthRevenue,
    monthExpenses: balance.monthExpenses,
    monthOrders: balance.monthOrders,
    profit,
    marginPercent,
    breakEven: breakeven?.gastosFijos ?? 0,
    breakEvenPercent: breakeven?.porcentaje ?? 0,
    cashFlow,
  }

  const profitable = profit >= 0

  return (
    <div className="space-y-6">
      <PanitasInterpretation text={interpretFinancialHealth(snapshot)} />

      {/* Hero financiero del mes */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <TrendingUp className="size-3.5 text-success" /> Ingresos del mes
          </p>
          <p className="mt-1 font-heading text-2xl font-extrabold text-foreground">
            <BicMoney value={balance.monthRevenue} />
          </p>
          <p className="text-xs text-muted-foreground">
            {balance.monthOrders} pedido{balance.monthOrders === 1 ? "" : "s"} cobrados
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <TrendingDown className="size-3.5 text-destructive" /> Gastos del mes
          </p>
          <p className="mt-1 font-heading text-2xl font-extrabold text-foreground">
            <BicMoney value={balance.monthExpenses} />
          </p>
          <p className="text-xs text-muted-foreground">
            {breakeven ? `${breakeven.categorias.length} categoría${breakeven.categorias.length === 1 ? "" : "s"}` : "Registrados en gastos"}
          </p>
        </div>

        <div
          className={`rounded-2xl border p-4 ${
            profitable ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5"
          }`}
        >
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Wallet className="size-3.5" /> Utilidad del mes
          </p>
          <p className={`mt-1 font-heading text-2xl font-extrabold ${profitable ? "text-success" : "text-destructive"}`}>
            {profitable ? "+" : ""}
            <BicMoney value={profit} />
          </p>
          <p className="text-xs text-muted-foreground">Margen neto {marginPercent.toFixed(1)}%</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Target className="size-3.5" /> Punto de equilibrio
          </p>
          <p className="mt-1 font-heading text-2xl font-extrabold text-foreground">
            {breakeven ? `${breakeven.porcentaje}%` : "—"}
          </p>
          <div className="mt-2">
            <BicProgressBar
              value={breakeven?.porcentaje ?? 0}
              max={100}
              tone={breakeven && breakeven.porcentaje >= 100 ? "success" : "default"}
            />
          </div>
        </div>
      </div>

      {/* Resumen de equilibrio */}
      {breakeven && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {interpretBreakEven(breakeven.ventasMes, breakeven.gastosFijos, breakeven.balance)}
          </p>
          <p className="text-xs font-semibold text-muted-foreground">
            Gastos fijos del mes: <BicMoney value={breakeven.gastosFijos} />
          </p>
        </div>
      )}

      {/* Registro y control de gastos */}
      <section className="space-y-4">
        <BicSectionTitle
          icon={<Receipt className="size-4.5" />}
          title="Gastos"
          description="Registro, presupuestos y control de gastos del negocio"
        />
        <GastosPage />
      </section>

      {/* Punto de equilibrio en detalle */}
      <section className="space-y-4">
        <BicSectionTitle
          icon={<Target className="size-4.5" />}
          title="Punto de Equilibrio"
          description="Cobertura de costos fijos con tus ventas"
        />
        <PuntoEquilibrioTab />
      </section>
    </div>
  )
}
