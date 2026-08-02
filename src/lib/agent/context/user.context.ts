import type { AgentPermission } from "@/lib/agent/permissions"

export type UserContext = {
  name?: string | null
  email?: string | null
  role: string
  permissions: AgentPermission[]
  preferences?: Record<string, unknown>
}

export type UserSource = {
  name?: string | null
  email?: string | null
}

export function buildUserContext(
  user: UserSource | null | undefined,
  role: string,
  permissions: AgentPermission[]
): UserContext {
  return {
    name: user?.name ?? null,
    email: user?.email ?? null,
    role,
    permissions: [...permissions],
    preferences: {},
  }
}
