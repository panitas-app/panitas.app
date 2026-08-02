import { PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"

/**
 * Business Repository (FASE 3D).
 *
 * Lectura de Store / Negocio / User para construir el Business Profile y el
 * contexto empresarial. El `storeId`/`negocioId` SIEMPRE provienen de la sesión
 * autenticada (nunca del input del usuario): aislamiento de negocio.
 */
export class BusinessRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  getStore(storeId: string) {
    return this.db.store.findUnique({ where: { id: storeId } })
  }

  getNegocio(negocioId: string | null | undefined) {
    if (!negocioId) return Promise.resolve(null)
    return this.db.negocio.findUnique({ where: { id: negocioId } })
  }

  getUser(userId: string) {
    return this.db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    })
  }
}
