export const AGENT_PERMISSIONS = [
  "inventory.read",
  "inventory.create",
  "inventory.update",
  "inventory.delete",
  "product.read",
  "product.create",
  "product.update",
  "product.delete",
  "sales.read",
  "sales.create",
  "sales.refund",
  "order.read",
  "order.create",
  "order.update",
  "order.cancel",
  "customer.read",
  "customer.create",
  "agenda.read",
  "agenda.create",
  "agenda.cancel",
  "report.read",
  "subscription.read",
] as const

export type AgentPermission = (typeof AGENT_PERMISSIONS)[number]

export const READ_ONLY_PERMISSIONS: AgentPermission[] = [
  "inventory.read",
  "product.read",
  "sales.read",
  "order.read",
  "customer.read",
  "agenda.read",
  "report.read",
  "subscription.read",
]

export function isAgentPermission(value: string): value is AgentPermission {
  return (AGENT_PERMISSIONS as readonly string[]).includes(value)
}

export function hasPermission(
  permissions: AgentPermission[],
  required: AgentPermission
): boolean {
  return permissions.includes(required)
}
