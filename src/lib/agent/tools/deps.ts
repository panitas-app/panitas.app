/**
 * Dependencias del Tool System (FASE 3B).
 *
 * Permite inyectar services en las tools (tests) y mantiene la regla de capas:
 * las tools solo dependen de la capa de servicios / analytics.
 */
import type { ProductService } from "@/services/product.service"
import type { CategoryService } from "@/services/category.service"
import type { InventoryService } from "@/services/inventory.service"
import type { SalesService } from "@/services/sales.service"
import type { CustomerService } from "@/services/customer.service"
import type { OrderService } from "@/services/order.service"
import type { BusinessSummaryGenerator } from "@/lib/business-intelligence"
import type { RecommendationService } from "@/lib/recommendations"
import type { KnowledgeService } from "@/lib/knowledge"
import type { AttentionService } from "@/lib/attention"

export interface ToolDeps {
  productService?: ProductService
  categoryService?: CategoryService
  inventoryService?: InventoryService
  salesService?: SalesService
  customerService?: CustomerService
  orderService?: OrderService
  /** Generador de resumen del negocio (FASE 4B), inyectable en tests. */
  businessMonitor?: BusinessSummaryGenerator
  /** Servicio de recomendaciones operativas (FASE 4D), inyectable en tests. */
  recommendationService?: RecommendationService
  /** Base de Conocimiento (FASE 7D), inyectable en tests. */
  knowledgeService?: KnowledgeService
  /** Sistema de Atención (FASE 8C), inyectable en tests. */
  attentionService?: AttentionService
}
