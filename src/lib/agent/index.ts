import "@/lib/agent/setup"

export { executeTool, getTool, listTools, registerTool } from "@/lib/agent/registry"
export { routeAgentIntent } from "@/lib/agent/router"
export { setupAgentTools } from "@/lib/agent/setup"

export {
  AGENT_PERMISSIONS,
  AGENT_ROLES,
  AGENT_ROLE_DEFINITIONS,
  READ_ONLY_PERMISSIONS,
  hasPermission,
  isAgentPermission,
  permissionsForRole,
} from "@/lib/agent/permissions"
export type { AgentPermission, AgentRole, AgentRoleDefinition } from "@/lib/agent/permissions"

export { buildAgentContext, buildBusinessContext, buildConversationContext, buildUserContext, addMessage, lastMessages, recordAction } from "@/lib/agent/context"
export type { BusinessContext, ConversationContext, UserContext, ConversationMessage } from "@/lib/agent/context"

export { agentMemory, ShortTermMemory, createLongTermMemory } from "@/lib/agent/memory"
export type { LongTermMemory, LongTermMemoryStore } from "@/lib/agent/memory"

export { agentAudit, AgentAuditService, InMemoryAgentAuditStore } from "@/lib/agent/audit"
export type { AgentAuditRecord, AgentAuditResult, AgentAuditStore } from "@/lib/agent/audit"

export { availableTools } from "@/lib/agent/tools"

export type { AgentContext, AgentTool, AgentToolInput, AgentToolResult, AgentToolInputSchema } from "@/lib/agent/types"
