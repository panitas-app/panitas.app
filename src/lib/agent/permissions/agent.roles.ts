import {
  AGENT_PERMISSIONS,
  READ_ONLY_PERMISSIONS,
  type AgentPermission,
} from "@/lib/agent/permissions/permissions"

export type AgentRole = "admin" | "manager" | "assistant" | "seller"

export const AGENT_ROLES: AgentRole[] = ["admin", "manager", "assistant", "seller"]

export type AgentRoleDefinition = {
  id: AgentRole
  name: string
  description: string
}

export const AGENT_ROLE_DEFINITIONS: Record<AgentRole, AgentRoleDefinition> = {
  admin: {
    id: "admin",
    name: "Administrador",
    description: "Acceso total: acciones críticas, refunds, cancelaciones y configuración",
  },
  manager: {
    id: "manager",
    name: "Manager",
    description: "Opera el negocio: crea productos y ventas, modifica agenda e inventario",
  },
  assistant: {
    id: "assistant",
    name: "Asistente",
    description: "Consulta información y atiende clientes sin acciones destructivas",
  },
  seller: {
    id: "seller",
    name: "Vendedor",
    description: "Vende y consulta stock, clientes y pedidos en el punto de venta",
  },
}

const ADMIN_PERMISSIONS: AgentPermission[] = [...AGENT_PERMISSIONS]

const MANAGER_PERMISSIONS: AgentPermission[] = AGENT_PERMISSIONS.filter(
  (p) => !["inventory.delete", "product.delete", "sales.refund", "order.cancel"].includes(p)
)

const ASSISTANT_PERMISSIONS: AgentPermission[] = [
  "inventory.read",
  "product.read",
  "sales.read",
  "order.read",
  "customer.read",
  "customer.create",
  "agenda.read",
  "agenda.create",
  "report.read",
  "subscription.read",
]

const SELLER_PERMISSIONS: AgentPermission[] = [
  "inventory.read",
  "product.read",
  "sales.read",
  "sales.create",
  "order.read",
  "order.create",
  "customer.read",
  "customer.create",
  "agenda.read",
]

const ROLE_PERMISSIONS: Record<string, AgentPermission[]> = {
  admin: ADMIN_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  assistant: ASSISTANT_PERMISSIONS,
  seller: SELLER_PERMISSIONS,
}

export function permissionsForRole(role: string): AgentPermission[] {
  const resolved = ROLE_PERMISSIONS[role]
  if (resolved) return [...resolved]
  if (role === "owner" || role === "superadmin") return [...ADMIN_PERMISSIONS]
  return [...READ_ONLY_PERMISSIONS]
}
