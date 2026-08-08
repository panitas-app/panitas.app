import { describe, expect, it, vi, beforeEach } from "vitest"
import { executeAction } from "@/lib/conversational-actions/executor"
import type { ExecutorDeps } from "@/lib/conversational-actions/executor"
import type { FinancialIndicators } from "@/lib/financial-intelligence"

const ctx = { storeId: "store-1", userId: "user-1", role: "admin", plan: "business", storeName: "Mi Tienda" }
const runtime = {
  userId: "user-1",
  storeId: "store-1",
  negocioId: null,
  plan: "business",
  role: "admin",
  permissions: ["report.read"],
}

function finIndicators(over: Partial<FinancialIndicators> = {}): FinancialIndicators {
  return {
    period: "month",
    label: "este mes",
    revenue: 2000,
    previousRevenue: 1000,
    revenueDeltaPct: 100,
    expenses: 600,
    previousExpenses: 300,
    expensesDeltaPct: 100,
    netFlow: 1400,
    totalPending: 800,
    recoveredInPeriod: 300,
    recoveryRate: 50,
    overdueCredits: 1,
    overdueCreditAmount: 120,
    dueNext7DaysCollect: 200,
    topDebtors: [{ name: "Juan Pérez", pending: 500 }],
    totalPayable: 400,
    paidToSuppliersInPeriod: 150,
    overdueSupplierInvoices: 0,
    overdueSupplierAmount: 0,
    dueNext7DaysPay: 100,
    topPayableSuppliers: [{ name: "Mercantil", outstanding: 250, dueDate: null }],
    ...over,
  }
}

function finInsight(id: string, title: string, priority: "alta" | "media" | "baja" = "media") {
  return { id, category: id, title, priority, value: 100, actions: [] }
}

function makeDeps(overrides: Record<string, unknown> = {}) {
  const financialService = {
    getIndicators: vi.fn().mockResolvedValue(finIndicators()),
    getInsights: vi.fn().mockResolvedValue([finInsight("creditos_vencidos", "Tienes un crédito vencido", "alta")]),
    periodRange: undefined,
  }
  return {
    financialService,
    expenseService: {
      list: vi.fn().mockResolvedValue({
        expenses: [
          { id: "e1", category: "compras", amount: 400, description: "mercadería", date: new Date(), createdAt: new Date(), updatedAt: new Date(), storeId: "store-1", subcategory: "", notes: null, paymentMethod: "cash", vendor: "", documentRef: "", isDeductible: false, isRecurring: false },
        ],
        total: 1,
      }),
    },
    toolExecutor: { execute: vi.fn() },
    ...overrides,
  } as unknown as ExecutorDeps
}

function run(deps: ExecutorDeps, actionId: string, known: Record<string, string> = {}) {
  return executeAction(deps, { actionId, known, message: "", ctx, runtime })
}

describe("Acciones de Inteligencia Financiera (FASE 6D)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("salud_financiera muestra ingresos vs gastos del mes", async () => {
    const deps = makeDeps()
    const res = await run(deps, "salud_financiera")
    expect(deps.financialService.getIndicators).toHaveBeenCalledWith(ctx, "month")
    expect(res.rich?.kind).toBe("summary")
    expect(res.rich?.blocks.some((b) => b.kind === "kpi")).toBe(true)
    expect(res.reply).toContain("tus ingresos")
    expect(res.reply).toContain("por cobrar")
  })

  it("salud_financiera advierte cuando el flujo es negativo", async () => {
    const deps = makeDeps({
      financialService: { getIndicators: vi.fn().mockResolvedValue(finIndicators({ netFlow: -300, revenue: 600, expenses: 900 })), getInsights: vi.fn().mockResolvedValue([]) },
    })
    const res = await run(deps, "salud_financiera")
    expect(res.reply).toContain("superaron tus ingresos")
    expect(res.rich?.blocks.some((b) => b.kind === "monitor" && b.tone === "danger")).toBe(true)
  })

  it("que_revisar_hoy devuelve insights priorizados", async () => {
    const deps = makeDeps()
    const res = await run(deps, "que_revisar_hoy")
    expect(deps.financialService.getIndicators).toHaveBeenCalledWith(ctx, "week")
    expect(deps.financialService.getInsights).toHaveBeenCalledWith(ctx, "week")
    expect(res.reply).toContain("el más urgente")
  })

  it("que_revisar_hoy responde positivo sin insights", async () => {
    const deps = makeDeps({
      financialService: { getIndicators: vi.fn().mockResolvedValue(finIndicators()), getInsights: vi.fn().mockResolvedValue([]) },
    })
    const res = await run(deps, "que_revisar_hoy")
    expect(res.reply).toContain("No hay alertas")
  })

  it("por_cobrar_vs_pagar compara ambos totales", async () => {
    const deps = makeDeps()
    const res = await run(deps, "por_cobrar_vs_pagar")
    expect(deps.financialService.getIndicators).toHaveBeenCalledWith(ctx, "month")
    expect(res.reply).toContain("por cobrar")
    expect(res.reply).toContain("por pagar")
    expect(res.rich?.blocks.some((b) => b.kind === "kpi")).toBe(true)
  })

  it("principales_gastos agrega gastos del mes por categoría", async () => {
    const deps = makeDeps()
    const res = await run(deps, "principales_gastos")
    const call = deps.expenseService.list.mock.calls[0]
    expect(call[0]).toBe(ctx)
    expect(typeof call[1].from).toBe("string")
    expect(res.reply).toContain("compras")
    expect(res.reply).toContain("$400")
  })

  it("principales_gastos responde positivo sin gastos", async () => {
    const deps = makeDeps({
      expenseService: { list: vi.fn().mockResolvedValue({ expenses: [], total: 0 }) },
    })
    const res = await run(deps, "principales_gastos")
    expect(res.reply).toContain("No tienes gastos registrados este mes")
  })

  it("clientes_mayor_deuda lista los deudores principales", async () => {
    const deps = makeDeps()
    const res = await run(deps, "clientes_mayor_deuda")
    expect(res.reply).toContain("Juan Pérez")
    expect(res.rich?.blocks.some((b) => b.kind === "list")).toBe(true)
  })

  it("clientes_mayor_deuda responde positivo sin deudores", async () => {
    const deps = makeDeps({
      financialService: { getIndicators: vi.fn().mockResolvedValue(finIndicators({ topDebtors: [] })), getInsights: vi.fn().mockResolvedValue([]) },
    })
    const res = await run(deps, "clientes_mayor_deuda")
    expect(res.reply).toContain("No tienes deudas pendientes")
  })

  it("proveedores_pagar_primero lista los proveedores con mayor saldo", async () => {
    const deps = makeDeps()
    const res = await run(deps, "proveedores_pagar_primero")
    expect(res.reply).toContain("Mercantil")
    expect(res.rich?.blocks.some((b) => b.kind === "list")).toBe(true)
  })

  it("proveedores_pagar_primero responde positivo sin deuda", async () => {
    const deps = makeDeps({
      financialService: { getIndicators: vi.fn().mockResolvedValue(finIndicators({ topPayableSuppliers: [] })), getInsights: vi.fn().mockResolvedValue([]) },
    })
    const res = await run(deps, "proveedores_pagar_primero")
    expect(res.reply).toContain("No tienes cuentas pendientes con proveedores")
  })
})
