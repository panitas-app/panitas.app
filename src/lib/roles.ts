export type Role = "admin" | "manager" | "seller" | "viewer" | "reception" | "employee" | "accountant"

export const roleLabels: Record<Role, string> = {
  admin: "Administrador",
  manager: "Encargado",
  seller: "Vendedor",
  viewer: "Visor",
  reception: "Recepción",
  employee: "Empleado",
  accountant: "Contador",
}

export const roleColors: Record<Role, string> = {
  admin: "text-amber-600 bg-amber-50 border-amber-200",
  manager: "text-blue-600 bg-blue-50 border-blue-200",
  seller: "text-emerald-600 bg-emerald-50 border-emerald-200",
  viewer: "text-slate-600 bg-slate-50 border-slate-200",
  reception: "text-purple-600 bg-purple-50 border-purple-200",
  employee: "text-cyan-600 bg-cyan-50 border-cyan-200",
  accountant: "text-rose-600 bg-rose-50 border-rose-200",
}

export const roleHierarchy: Record<Role, number> = {
  admin: 7,
  manager: 6,
  accountant: 5,
  reception: 4,
  seller: 3,
  employee: 2,
  viewer: 1,
}

export function canManage(role: Role): boolean {
  return roleHierarchy[role] >= roleHierarchy.manager
}

export function canEditSettings(role: Role): boolean {
  return role === "admin"
}
