export {
  AGENT_PERMISSIONS,
  READ_ONLY_PERMISSIONS,
  hasPermission,
  isAgentPermission,
} from "@/lib/agent/permissions/permissions"
export type { AgentPermission } from "@/lib/agent/permissions/permissions"
export {
  AGENT_ROLES,
  AGENT_ROLE_DEFINITIONS,
  permissionsForRole,
} from "@/lib/agent/permissions/agent.roles"
export type { AgentRole, AgentRoleDefinition } from "@/lib/agent/permissions/agent.roles"
