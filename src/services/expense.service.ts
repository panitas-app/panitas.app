import { ExpenseRepository } from "@/repositories/expense.repository"
import { eventService } from "@/events/event.service"
import { fireDomainEvent } from "@/lib/events"
import { serviceError } from "@/services/errors"
import type { StoreServiceContext } from "@/services/context"

export type ExpenseCreateInput = {
  description: string
  amount: number
  category?: string
  subcategory?: string
  date?: Date
  paymentMethod?: string
  vendor?: string
  documentRef?: string
  isDeductible?: boolean
  isRecurring?: boolean
  notes?: string | null
}

export type ExpenseUpdateInput = Partial<Omit<ExpenseCreateInput, "storeId">>

export type ExpenseListOptions = {
  category?: string
  from?: string
  to?: string
  search?: string
  vendor?: string
  take?: number
  skip?: number
}

export class ExpenseService {
  constructor(private readonly repo = new ExpenseRepository()) {}

  async list(ctx: StoreServiceContext, options: ExpenseListOptions = {}) {
    return this.repo.list({
      storeId: ctx.storeId,
      category: options.category,
      from: options.from,
      to: options.to,
      search: options.search,
      vendor: options.vendor,
      take: options.take,
      skip: options.skip,
    })
  }

  async getById(ctx: StoreServiceContext, id: string) {
    const expense = await this.repo.findById(id)
    if (!expense) throw serviceError("Gasto no encontrado", 404)
    if (expense.storeId !== ctx.storeId) throw serviceError("No autorizado", 403)
    return expense
  }

  async create(ctx: StoreServiceContext, input: ExpenseCreateInput) {
    if (!input.description || !input.description.trim()) {
      throw serviceError("La descripción del gasto es obligatoria", 400)
    }
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw serviceError("El monto del gasto debe ser un número positivo", 400)
    }

    const expense = await this.repo.create({
      storeId: ctx.storeId,
      description: input.description.trim(),
      amount: input.amount,
      category: input.category || "otros",
      subcategory: input.subcategory || "",
      date: input.date ?? new Date(),
      paymentMethod: input.paymentMethod || "cash",
      vendor: input.vendor || "",
      documentRef: input.documentRef || "",
      isDeductible: input.isDeductible ?? false,
      isRecurring: input.isRecurring ?? false,
      notes: input.notes ?? null,
    })

    eventService.emit("expense.created", {
      expenseId: expense.id,
      storeId: ctx.storeId,
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
    })

    fireDomainEvent({
      type: "expense.created",
      data: {
        expenseId: expense.id,
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
      },
      aggregateId: expense.id,
      aggregateType: "Expense",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "expense.service",
    })

    return expense
  }

  async update(ctx: StoreServiceContext, id: string, input: ExpenseUpdateInput) {
    const existing = await this.getById(ctx, id)
    const expense = await this.repo.update(id, {
      description: input.description?.trim() || existing.description,
      amount: input.amount ?? existing.amount,
      category: input.category || existing.category,
      subcategory: input.subcategory ?? existing.subcategory,
      date: input.date ?? existing.date,
      paymentMethod: input.paymentMethod || existing.paymentMethod,
      vendor: input.vendor ?? existing.vendor,
      documentRef: input.documentRef ?? existing.documentRef,
      isDeductible: input.isDeductible ?? existing.isDeductible,
      isRecurring: input.isRecurring ?? existing.isRecurring,
      notes: input.notes === undefined ? existing.notes : input.notes,
    })

    fireDomainEvent({
      type: "expense.updated",
      data: {
        expenseId: id,
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
      },
      aggregateId: id,
      aggregateType: "Expense",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "expense.service",
    })

    return expense
  }

  async remove(ctx: StoreServiceContext, id: string) {
    await this.getById(ctx, id)
    await this.repo.remove(id)
    return { removed: true, id }
  }

  /** Totales por categoría de la tienda (para resúmenes). */
  totalsByCategory(ctx: StoreServiceContext) {
    return this.repo.totalsByCategory(ctx.storeId)
  }
}
