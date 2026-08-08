import type { FinancialIndicators } from "@/lib/financial-intelligence"

/** Fábrica de indicadores financieros con valores por defecto (FASE 6D). */
export function makeIndicators(overrides: Partial<FinancialIndicators> = {}): FinancialIndicators {
  return {
    period: "week",
    label: "esta semana",
    revenue: 1000,
    previousRevenue: 900,
    revenueDeltaPct: 11.11,
    expenses: 400,
    previousExpenses: 300,
    expensesDeltaPct: 33.33,
    netFlow: 600,
    totalPending: 500,
    recoveredInPeriod: 200,
    recoveryRate: 60,
    overdueCredits: 0,
    overdueCreditAmount: 0,
    dueNext7DaysCollect: 0,
    topDebtors: [],
    totalPayable: 300,
    paidToSuppliersInPeriod: 100,
    overdueSupplierInvoices: 0,
    overdueSupplierAmount: 0,
    dueNext7DaysPay: 0,
    topPayableSuppliers: [],
    ...overrides,
  }
}
