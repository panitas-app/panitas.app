export { ServiceError, isServiceError, serviceError } from "@/services/errors"
export type { ServiceContext, StoreServiceContext, NegocioServiceContext } from "@/services/context"
export { toServiceResponse, createdResponse, jsonSuccess } from "@/services/http"
export { ProductService, generateSku } from "@/services/product.service"
export type { ProductListOptions } from "@/services/product.service"
export { InventoryService } from "@/services/inventory.service"
export type { StockMovementListOptions, InventoryOverviewOptions } from "@/services/inventory.service"
export { CustomerService } from "@/services/customer.service"
export type { CustomerListOptions, CustomerFindOrCreateInput, CustomerMetrics } from "@/services/customer.service"
export { AgendaService } from "@/services/agenda.service"
export type { AppointmentListOptions, AppointmentCreateInput } from "@/services/agenda.service"
export { OrderService } from "@/services/order.service"
export type { OrderListOptions } from "@/services/order.service"
export { SalesService } from "@/services/sales.service"
export type { SalesSummaryOptions, SalesOverview, SalesPeriod } from "@/services/sales.service"
export { ExpenseService } from "@/services/expense.service"
export type { ExpenseCreateInput, ExpenseUpdateInput, ExpenseListOptions } from "@/services/expense.service"
export { CreditService } from "@/services/credit.service"
export type { CreditSummary, CreditDetail, CreditKpis, CreditTimelineEntry, CreditState, CreditStatus } from "@/services/credit.service"
export { CollectionService } from "@/services/collection.service"
export {
  COLLECTION_TEMPLATE_CATEGORIES,
  COLLECTION_CATEGORY_META,
  COLLECTION_LEVELS,
  COLLECTION_TEMPLATE_VARIABLES,
  BUILT_IN_TEMPLATES,
  DEFAULT_PAYMENT_METHODS,
} from "@/services/collection.service"
export type {
  CollectionTemplateCategory,
  CollectionLevel,
  CollectionChannel,
  CollectionContactStatus,
  CollectionTemplateDTO,
  CollectionSettingsDTO,
  RenderedReminder,
  ContactLogDTO,
  CollectionRecommendation,
} from "@/services/collection.service"
export { SupplierService } from "@/services/supplier.service"
export type {
  SupplierSummary,
  SupplierDetail,
  SupplierInvoiceDTO,
  SupplierPaymentDTO,
  SupplierTimelineEntry,
  SupplierKpis,
  SupplierListResult,
  SupplierState,
  SupplierCreateInput,
  SupplierUpdateInput,
  SupplierPurchaseInput,
  SupplierPaymentInput,
} from "@/services/supplier.service"
