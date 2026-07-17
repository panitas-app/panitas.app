"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { resolvePlanId } from "@/lib/plans"

const planToConfig: Record<string, { modalidad: string | null; planType: string; hasAgenda: boolean }> = {
  agenda: { modalidad: "agenda", planType: "agenda", hasAgenda: true },
  comercio: { modalidad: null, planType: "tienda", hasAgenda: true },
  mayorista: { modalidad: null, planType: "empresa", hasAgenda: false },
}

const PLAN_DEFINITIONS = [
  { id: "agenda", nombre: "agenda", label: "Agenda", precioUsd: 15, precioUsdAnual: 150, sortOrder: 1 },
  { id: "comercio", nombre: "comercio", label: "Emprendedor", precioUsd: 25, precioUsdAnual: 250, sortOrder: 2 },
  { id: "mayorista", nombre: "mayorista", label: "Mayorista", precioUsd: 45, precioUsdAnual: 450, sortOrder: 3 },
  { id: "basico", nombre: "basico", label: "Agenda", precioUsd: 15, precioUsdAnual: 150, sortOrder: 1 },
  { id: "negocio", nombre: "negocio", label: "Emprendedor", precioUsd: 25, precioUsdAnual: 250, sortOrder: 2 },
  { id: "empresarial", nombre: "empresarial", label: "Mayorista", precioUsd: 45, precioUsdAnual: 450, sortOrder: 3 },
]

export async function applyPlanSelection(planParam: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "No autenticado" }
  const userId = session.user.id

  const resolved = resolvePlanId(planParam)
  const cfg = planToConfig[resolved]
  if (!cfg) return { success: false, error: "Plan no válido" }

  const store = await prisma.store.findUnique({ where: { userId }, select: { id: true, planType: true, negocioId: true, slug: true, name: true } })
  if (!store) return { success: false, error: "Tienda no encontrada" }

  // Update store planType
  try {
    await prisma.store.update({ where: { id: store.id }, data: { planType: cfg.planType } })
  } catch (e) {
    console.error("[applyPlanSelection] store.update failed:", e)
  }

  // Ensure plans exist in DB
  for (const p of PLAN_DEFINITIONS) {
    try {
      const existing = await prisma.plan.findUnique({ where: { id: p.id } })
      if (!existing) {
        await prisma.plan.create({ data: { ...p, descripcion: "", activo: true } })
      }
    } catch (err: any) {
      if (err?.code !== "P2002") console.error("[applyPlanSelection] plan create failed:", err)
    }
  }

  // Update or create Negocio
  try {
    if (store.negocioId) {
      const negocio = await prisma.negocio.findUnique({ where: { id: store.negocioId }, select: { planId: true } })
      if (negocio && negocio.planId !== resolved) {
        await prisma.negocio.update({ where: { id: store.negocioId }, data: { planId: resolved, modalidad: cfg.modalidad } })
        if (cfg.hasAgenda) {
          const existing = await prisma.agenda.findFirst({ where: { negocioId: store.negocioId } })
          if (!existing) {
            await prisma.agenda.create({ data: { nombre: "Mi Agenda", slug: store.slug + "-agenda", negocioId: store.negocioId } })
          }
        }
      }
    } else {
      const newNegocio = await prisma.negocio.create({
        data: {
          nombre: store.name,
          slug: store.slug + "-" + userId.slice(0, 6),
          planId: resolved,
          modalidad: cfg.modalidad,
          planEstado: "pendiente",
          planVencimiento: null,
          userId,
        },
      }).catch(async (err: any) => {
        if (err?.code === "P2002") {
          return prisma.negocio.create({
            data: {
              nombre: store.name,
              slug: store.slug + "-" + userId.slice(0, 8),
              planId: resolved,
              modalidad: cfg.modalidad,
              planEstado: "pendiente",
              planVencimiento: null,
              userId,
            },
          })
        }
        throw err
      })
      if (newNegocio && cfg.hasAgenda) {
        await prisma.agenda.create({
          data: { nombre: "Mi Agenda", slug: store.slug + "-agenda", negocioId: newNegocio.id },
        }).catch(() => {})
      }
      await prisma.store.update({ where: { id: store.id }, data: { negocioId: newNegocio.id } })
    }
  } catch (e) {
    console.error("[applyPlanSelection] negocio update failed:", e)
  }

  return { success: true }
}
