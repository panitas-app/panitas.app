import { prisma } from "@/lib/prisma"

export function createAuditEntry(data: {
  action: string
  entity: string
  entityId?: string
  metadata?: Record<string, unknown>
  userId?: string
  storeId?: string
}) {
  return prisma.auditLog.create({
    data: {
      action: data.action,
      entity: data.entity,
      entityId: data.entityId || null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      userId: data.userId || null,
      storeId: data.storeId || null,
    },
  })
}
