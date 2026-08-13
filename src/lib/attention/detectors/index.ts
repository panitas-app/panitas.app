/**
 * Detectors del Sistema de Atención (FASE 8C) — barrel.
 */
export { detectInventory, type InventoryData, type InventoryRow } from "./inventory"
export { detectCredits, type CreditData, type CreditInstallmentRow } from "./credits"
export { detectSuppliers, type SupplierData, type SupplierInvoiceRow } from "./suppliers"
export { detectOrders, type OrderData, type OrderRow } from "./orders"
export { detectConversations, type ConversationData, type ConversationRow } from "./conversations"
export { detectChannels, type ChannelData, type ChannelConnectionRow } from "./channels"
