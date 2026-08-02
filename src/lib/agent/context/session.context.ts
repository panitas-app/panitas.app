import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { permissionsForRole } from "@/lib/agent/permissions"
import type { AgentContext } from "@/lib/agent/types"
import { buildBusinessContext } from "@/lib/agent/context/business.context"
import { buildUserContext } from "@/lib/agent/context/user.context"

export async function buildAgentContext(): Promise<AgentContext | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const member = await prisma.storeMember.findFirst({
    where: { userId: session.user.id },
    include: { store: true },
  })

  if (!member) return null

  const negocio = member.store.negocioId
    ? await prisma.negocio.findUnique({
        where: { id: member.store.negocioId },
        select: { id: true, nombre: true, pais: true, modalidad: true, planEstado: true },
      })
    : null

  const permissions = permissionsForRole(member.role)

  return {
    userId: session.user.id,
    storeId: member.store.id,
    negocioId: negocio?.id ?? null,
    plan: member.store.plan,
    role: member.role,
    permissions,
    user: buildUserContext(
      { name: session.user.name, email: session.user.email },
      member.role,
      permissions
    ),
    business: buildBusinessContext(member.store, negocio),
  }
}
