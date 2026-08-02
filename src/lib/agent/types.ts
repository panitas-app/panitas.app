import type { AgentPermission } from "@/lib/agent/permissions"
import type { BusinessContext } from "@/lib/agent/context/business.context"
import type { UserContext } from "@/lib/agent/context/user.context"
import type { ConversationContext } from "@/lib/agent/context/conversation.context"

export type AgentContext = {
  userId: string
  storeId: string
  negocioId: string | null
  plan: string
  role: string
  permissions: AgentPermission[]
  user?: UserContext
  business?: BusinessContext
  conversation?: ConversationContext
}

export type AgentToolInput = Record<string, unknown>

export type AgentToolResult = {
  ok: boolean
  data?: unknown
  error?: string
}

export type AgentToolInputSchema = {
  type: "object"
  properties: Record<string, { type: string; description?: string }>
  required?: string[]
}

export type AgentTool = {
  name: string
  description: string
  permissions: AgentPermission[]
  input_schema?: AgentToolInputSchema
  execute: (ctx: AgentContext, input: AgentToolInput) => Promise<AgentToolResult>
}
