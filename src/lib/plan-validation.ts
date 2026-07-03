import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAccesoModulo } from "./plans"

export type ModuloVerifiable = "tienda" | "agenda" | "b2b"

interface NegocioPlanInfo {
  negocioId: string
  planId: string
  modalidad: string | null
  planEstado: string
  planVencimiento: Date | null
}

/**
 * Obtiene el negocio + plan del usuario autenticado.
 * Lanza error si no hay sesión, no tiene negocio, o el plan está suspendido/vencido.
 */
export async function getNegocioActivo(): Promise<NegocioPlanInfo> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("No autenticado")
  }

  const negocio = await prisma.negocio.findUnique({
    where: { userId: session.user.id },
  })

  if (!negocio) {
    throw new Error("No tienes un negocio registrado. Completa el registro primero.")
  }

  if (negocio.planEstado === "suspendido" || negocio.planEstado === "cancelado") {
    throw new Error(`Tu plan está ${negocio.planEstado}. Contacta a soporte para reactivarlo.`)
  }

  if (
    negocio.planEstado === "activo" &&
    negocio.planVencimiento &&
    negocio.planVencimiento < new Date()
  ) {
    throw new Error("Tu plan ha vencido. Renueva tu suscripción para seguir usando Panitas.")
  }

  return {
    negocioId: negocio.id,
    planId: negocio.planId,
    modalidad: negocio.modalidad,
    planEstado: negocio.planEstado,
    planVencimiento: negocio.planVencimiento,
  }
}

/**
 * Verifica que el negocio activo tenga acceso al módulo solicitado.
 * Lanza error si no tiene permiso.
 * Úsalo en API routes antes de cualquier operación CRUD.
 *
 * @example
 * const negocio = await requireModulo("tienda")
 * // luego: prisma.product.findMany({ where: { store: { negocioId: negocio.negocioId } } })
 */
export async function requireModulo(modulo: ModuloVerifiable): Promise<NegocioPlanInfo> {
  const negocio = await getNegocioActivo()

  // Primero validar que el plan no esté vencido/suspendido
  const plan = await prisma.plan.findUnique({ where: { id: negocio.planId } })

  const { allowed, error } = requireAccesoModulo(
    negocio.planId,
    negocio.modalidad,
    modulo
  )

  if (!allowed) {
    throw new Error(error || "Acceso denegado a este módulo según tu plan.")
  }

  return negocio
}

/**
 * Para Server Components: wrapper que redirige en vez de lanzar error.
 */
export async function assertModulo(modulo: ModuloVerifiable): Promise<NegocioPlanInfo | null> {
  try {
    return await requireModulo(modulo)
  } catch {
    return null
  }
}

// ─── Helpers para filtrar queries por negocio ───

/**
 * Construye el where necesario para filtrar por negocio en tablas de Tienda.
 * Asume que la tabla tiene relación: store.negocioId
 */
export function whereNegocioStore(negocioId: string) {
  return { store: { negocioId } }
}

/**
 * Construye el where necesario para filtrar por negocio en tablas de Agenda.
 */
export function whereNegocioAgenda(negocioId: string) {
  return { agenda: { negocioId } }
}

/**
 * Construye el where directo para tablas con negocioId propio.
 */
export function whereNegocioDirect(negocioId: string) {
  return { negocioId }
}
