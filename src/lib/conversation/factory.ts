/**
 * Factory del Conversation Engine (FASE 3C + 3D).
 *
 * Cablea el Agent Core por defecto (FASE 3A + OpenRouter) con el ConversationService,
 * el Memory System (FASE 3D) y el Business Context Builder. Único punto de wiring;
 * los tests inyectan dependencias mockeadas directamente.
 */
import { createDefaultAgentCore, createAgentAiProvider, AgenticToolRunner } from "@/lib/agent-core"
import { createIntelligenceLayer, ConfirmationSystem } from "@/lib/agent-intel"
import { buildToolRegistry, ToolExecutor } from "@/lib/agent/tools"
import { ConversationService } from "@/services/conversation.service"
import { MemoryManager } from "@/lib/agent/memory"
import { ConversationManager } from "@/lib/conversations"
import { BusinessProfileBuilder } from "@/lib/agent/profile"
import { BusinessContextBuilder } from "@/lib/agent/context"
import { ConversationalActionsEngine } from "@/lib/conversational-actions"
import { createBusinessMemoryEngine } from "@/lib/business-memory"
import { FinancialEngine, defaultFinancialCache } from "@/lib/financial-intelligence"
import { ProductService, CustomerService, OrderService, ExpenseService, SalesService, CreditService, CollectionService, SupplierService } from "@/services"
import { ConversationEngine } from "./engine"

function createActionsEngine(): ConversationalActionsEngine {
  return new ConversationalActionsEngine({
    executor: {
      productService: new ProductService(),
      customerService: new CustomerService(),
      orderService: new OrderService(),
      expenseService: new ExpenseService(),
      salesService: new SalesService(),
      creditService: new CreditService(),
      collectionService: new CollectionService(),
      supplierService: new SupplierService(),
      financialService: new FinancialEngine({}, defaultFinancialCache),
      toolExecutor: new ToolExecutor({ registry: buildToolRegistry() }),
    },
  })
}

export function createConversationEngine(): ConversationEngine {
  const memory = new MemoryManager()
  const context = new BusinessContextBuilder({
    profile: new BusinessProfileBuilder(),
    memory,
  })

  // FASE 3E: mismo AIProvider para el Agent Core y para el Tool Calling Nativo.
  const provider = createAgentAiProvider()
  const registry = buildToolRegistry()
  const executor = new ToolExecutor({ registry })
  const agentic = new AgenticToolRunner({
    provider,
    registry,
    executor,
    confirmation: new ConfirmationSystem(),
  })

  return new ConversationEngine({
    agent: createDefaultAgentCore({ provider }),
    conversations: new ConversationService(),
    memory,
    context,
    intelligence: createIntelligenceLayer(),
    conversational: new ConversationManager(),
    actions: createActionsEngine(),
    businessMemory: createBusinessMemoryEngine(),
    agentic,
  })
}
