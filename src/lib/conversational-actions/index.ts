/**
 * Conversational Actions (FASE 5D) — API pública.
 *
 * Capa de orquestación que convierte solicitudes en lenguaje natural en
 * operaciones de negocio ejecutadas sobre las tools 3B existentes y los
 * services 1B, con completado de parámetros multi-turno, confirmaciones y
 * respuestas enriquecidas. No crea tools nuevas en el registro 3B.
 */
export { ACTION_CATALOG, getAction } from "./catalog"
export { normalize, detectAction } from "./detector"
export type { DetectionMatch } from "./detector"
export {
  extractAmount,
  extractQuantity,
  extractAfter,
  extractSaleItems,
  extractPaymentMethod,
  extractPeriod,
  extractPhone,
  extractDiscount,
  extractCredit,
  extractTerm,
  extractProductRef,
  extractExpenseRef,
  extractOrderRef,
  extractKnownParams,
  missingParams,
  nextPrompt,
  validateParamValue,
  isShortAnswer,
  inferStockType,
} from "./params"
export {
  card,
  summary,
  table,
  textBlock,
  money,
  productCard,
  saleSummary,
  productsTable,
  expenseCard,
  expensesTable,
  customerCard,
  customersTable,
  customerHistory,
  ordersTable,
  orderCard,
  salesSummary,
  salesOverviewSummary,
  expensesSummary,
  cardBlock,
  tableBlock,
  kpiBlock,
  chartBlock,
  listBlock,
  monitorBlock,
  quickActionsBlock,
  financialBlock,
} from "./rich"
export {
  executeAction,
  ActionInputError,
  ActionExecutionError,
} from "./executor"
export type { ExecutorDeps, ExecutionResult, ExecutorInput } from "./executor"
export { ConversationalActionsEngine } from "./engine"
export type { ActionsSession, ActionsEngineInput, ActionsEngineDeps } from "./engine"
export type {
  ActionDomain,
  ConfirmationLevel,
  ActionParam,
  ConversationalAction,
  KnownParams,
  ActionResultData,
  RichBlock,
  RichResponse,
  ActionsTurnResult,
  ActionDeps,
  ActionRuntimeContext,
  QuickAction,
  BlockTone,
  TextBlock,
  TableBlock,
  CardBlock,
  SummaryBlock,
  KpiBlock,
  ChartBlock,
  ListBlock,
  MonitorBlock,
  QuickActionsBlock,
  FinancialBlock,
} from "./types"
export { ACTION_DOMAINS } from "./types"
