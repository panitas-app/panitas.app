/**
 * Fábricas de acciones rápidas por entidad (FASE 5E).
 *
 * Capa de servidor (lib): devuelven `QuickAction[]` (client-safe) que el
 * executor adjunta a las tarjetas y que el ConversationRenderer convierte en
 * botones. Al pulsarlos, la acción semántica se reenvía al asistente; nunca
 * exponen tool names ni IDs internos.
 */
import type { QuickAction } from "@/lib/conversational-actions"

/** Acciones de un producto: editar, agregar stock y eliminar (destructiva). */
export function productActions(name: string): QuickAction[] {
  const clean = name.trim()
  return [
    { label: "Editar", action: `editar producto ${clean}`, variant: "outline", icon: "pencil" },
    { label: "Agregar stock", action: `agregar stock a ${clean}`, variant: "outline", icon: "package-plus" },
    { label: "Eliminar", action: `eliminar producto ${clean}`, variant: "destructive", icon: "trash-2", confirm: true },
  ]
}

/** Acciones de una venta/pedido: detalle y duplicar. */
export function saleActions(orderNumber: string): QuickAction[] {
  const clean = orderNumber.trim()
  return [
    { label: "Ver detalle", action: `ver el pedido ${clean}`, variant: "outline", icon: "eye" },
    { label: "Duplicar", action: `duplicar pedido ${clean}`, variant: "outline", icon: "copy" },
  ]
}

/** Acciones de un cliente: historial, registrar venta y registrar pago. */
export function customerActions(name: string): QuickAction[] {
  const clean = name.trim()
  return [
    { label: "Historial", action: `ver historial de ${clean}`, variant: "outline", icon: "history" },
    { label: "Registrar venta", action: `registrar venta a ${clean}`, variant: "default", icon: "receipt" },
    { label: "Registrar pago", action: `registrar pago de ${clean}`, variant: "outline", icon: "banknote" },
  ]
}

/** Acciones de un gasto: corregir y eliminar (destructiva). */
export function expenseActions(description: string): QuickAction[] {
  const clean = description.trim() || "ese gasto"
  return [
    { label: "Editar", action: `corregir el gasto ${clean}`, variant: "outline", icon: "pencil" },
    { label: "Eliminar", action: `eliminar el gasto ${clean}`, variant: "destructive", icon: "trash-2", confirm: true },
  ]
}

/** Acciones de un proveedor: comprar de nuevo y ver sus gastos. */
export function vendorActions(name: string): QuickAction[] {
  const clean = name.trim()
  return [
    { label: "Comprar de nuevo", action: `compre a ${clean}`, variant: "outline", icon: "shopping-cart" },
    { label: "Ver gastos", action: `muéstrame los gastos del proveedor ${clean}`, variant: "outline", icon: "search" },
  ]
}
