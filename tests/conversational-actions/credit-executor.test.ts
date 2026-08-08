import { describe, expect, it, vi, beforeEach } from "vitest"
import { executeAction, ActionInputError } from "@/lib/conversational-actions/executor"
import type { ExecutorDeps } from "@/lib/conversational-actions/executor"
import type { CreditSummary } from "@/services/credit.service"

const ctx = { storeId: "store-1", userId: "user-1", role: "admin", plan: "business", storeName: "Mi Tienda" }
const runtime = {
  userId: "user-1",
  storeId: "store-1",
  negocioId: null,
  plan: "business",
  role: "admin",
  permissions: ["report.read"],
}

function credit(over: Partial<CreditSummary>): CreditSummary {
  return {
    orderId: "o1",
    orderNumber: "ORD-1001",
    customerName: "Juan Pérez",
    customerPhone: "+584120000000",
    createdAt: new Date().toISOString(),
    total: 300,
    downPayment: 0,
    totalCredito: 300,
    paid: 0,
    pending: 300,
    paidPercent: 0,
    state: "overdue",
    creditStatus: "active",
    installmentsTotal: 3,
    paidInstallments: 0,
    nextDueDate: new Date().toISOString(),
    nextAmount: 100,
    overdueDays: 10,
    lastPaymentAt: null,
    ...over,
  }
}

function makeDeps(overrides: Record<string, unknown> = {}) {
  return {
    customerService: {
      list: vi.fn().mockResolvedValue({ customers: [{ id: "c1", name: "Juan Pérez", phone: "+584120000000" }], total: 1 }),
    },
    creditService: {
      list: vi.fn().mockResolvedValue({ kpis: { totalPending: 300, activeCredits: 1, overdueCredits: 1, overdueAmount: 300, dueNext7Days: 0, recoveredThisMonth: 0, recoveryRate: 0 }, credits: [credit({})] }),
      listByCustomer: vi.fn().mockResolvedValue([credit({})]),
      getDetail: vi.fn().mockResolvedValue({ ...credit({}), items: [], payments: [], installments: [], timeline: [] }),
      registerPayment: vi.fn().mockResolvedValue({ id: "pay1", amount: 100 }),
    },
    toolExecutor: { execute: vi.fn() },
    ...overrides,
  } as unknown as ExecutorDeps
}

function run(deps: ExecutorDeps, actionId: string, known: Record<string, string> = {}) {
  return executeAction(deps, { actionId, known, message: "", ctx, runtime })
}

describe("Acciones de cobranza (FASE 6A)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("consultar_vencidos lista los créditos vencidos con su monto", async () => {
    const deps = makeDeps()
    const res = await run(deps, "consultar_vencidos")
    expect(deps.creditService.list).toHaveBeenCalledWith(ctx, { status: "overdue", limit: 20 })
    expect(res.rich?.blocks.some((b) => b.kind === "monitor")).toBe(true)
    expect(res.rich?.blocks.some((b) => b.kind === "list")).toBe(true)
    expect(res.reply).toContain("vencido")
  })

  it("consultar_vencidos responde positivo cuando no hay vencidos", async () => {
    const deps = makeDeps({
      creditService: { list: vi.fn().mockResolvedValue({ kpis: { totalPending: 0, activeCredits: 0, overdueCredits: 0, overdueAmount: 0, dueNext7Days: 0, recoveredThisMonth: 0, recoveryRate: 0 }, credits: [] }) },
    })
    const res = await run(deps, "consultar_vencidos")
    expect(res.reply).toContain("No tienes créditos vencidos")
  })

  it("quien_debe_mas devuelve el mayor deudor", async () => {
    const deps = makeDeps({
      creditService: {
        list: vi.fn().mockResolvedValue({
          kpis: { totalPending: 600, activeCredits: 2, overdueCredits: 2, overdueAmount: 600, dueNext7Days: 0, recoveredThisMonth: 0, recoveryRate: 0 },
          credits: [
            credit({ orderId: "o1", customerName: "Juan Pérez", pending: 500 }),
            credit({ orderId: "o2", orderNumber: "ORD-1002", customerName: "María López", pending: 100 }),
          ],
        }),
      },
    })
    const res = await run(deps, "quien_debe_mas")
    expect(res.rich?.blocks.some((b) => b.kind === "table")).toBe(true)
    expect(res.reply).toContain("Juan Pérez")
  })

  it("proximos_vencimientos lista créditos upcoming", async () => {
    const deps = makeDeps({
      creditService: {
        list: vi.fn().mockResolvedValue({
          kpis: { totalPending: 100, activeCredits: 1, overdueCredits: 0, overdueAmount: 0, dueNext7Days: 100, recoveredThisMonth: 0, recoveryRate: 0 },
          credits: [credit({ state: "upcoming", pending: 100 })],
        }),
      },
    })
    const res = await run(deps, "proximos_vencimientos")
    expect(deps.creditService.list).toHaveBeenCalledWith(ctx, { status: "upcoming", limit: 20 })
    expect(res.rich?.blocks.some((b) => b.kind === "list")).toBe(true)
    expect(res.reply).toContain("por vencer")
  })

  it("total_pendiente devuelve el resumen KPI", async () => {
    const deps = makeDeps()
    const res = await run(deps, "total_pendiente")
    expect(deps.creditService.list).toHaveBeenCalledWith(ctx, { status: "all", limit: 100 })
    expect(res.rich?.blocks.some((b) => b.kind === "kpi")).toBe(true)
    expect(res.reply).toContain("$300.00")
  })

  it("registrar_abono aplica el abono al crédito del cliente", async () => {
    const deps = makeDeps()
    const res = await run(deps, "registrar_abono", { cliente: "Juan Pérez", monto: "100", metodo: "cash" })
    expect(deps.creditService.listByCustomer).toHaveBeenCalledWith(ctx, "c1")
    expect(deps.creditService.registerPayment).toHaveBeenCalledWith(ctx, expect.objectContaining({ orderId: "o1", amount: 100, method: "cash" }))
    expect(deps.creditService.getDetail).toHaveBeenCalled()
    expect(res.rich?.kind).toBe("card")
    expect(res.reply).toContain("Juan Pérez")
  })

  it("registrar_abono rechaza un monto inválido", async () => {
    const deps = makeDeps()
    await expect(run(deps, "registrar_abono", { cliente: "Juan Pérez", monto: "abc" })).rejects.toThrow(ActionInputError)
  })

  it("registrar_abono informa cuando el cliente no tiene créditos", async () => {
    const deps = makeDeps({
      creditService: { listByCustomer: vi.fn().mockResolvedValue([]), registerPayment: vi.fn() },
    })
    await expect(run(deps, "registrar_abono", { cliente: "Juan Pérez", monto: "100" })).rejects.toThrow(/no tiene créditos activos/)
  })

  it("registrar_abono exige el cliente", async () => {
    const deps = makeDeps()
    await expect(run(deps, "registrar_abono", { monto: "100" })).rejects.toThrow(ActionInputError)
  })
})
