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
  { id: "agenda", nombre: "agenda", label: "Agenda", precioUsd: 14.99, precioUsdAnual: 149.90, sortOrder: 1 },
  { id: "comercio", nombre: "comercio", label: "Emprendedor", precioUsd: 19.99, precioUsdAnual: 199.90, sortOrder: 2 },
  { id: "mayorista", nombre: "mayorista", label: "Mayorista", precioUsd: 49.99, precioUsdAnual: 499.90, sortOrder: 3 },
  { id: "basico", nombre: "basico", label: "Agenda", precioUsd: 14.99, precioUsdAnual: 149.90, sortOrder: 1 },
  { id: "negocio", nombre: "negocio", label: "Emprendedor", precioUsd: 19.99, precioUsdAnual: 199.90, sortOrder: 2 },
  { id: "empresarial", nombre: "empresarial", label: "Mayorista", precioUsd: 49.99, precioUsdAnual: 499.90, sortOrder: 3 },
]

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tienda"
}

async function ensurePlanExists(planId: string) {
  const def = PLAN_DEFINITIONS.find((p) => p.id === planId)
  if (!def) return
  try {
    const existing = await prisma.plan.findUnique({ where: { id: planId } })
    if (!existing) {
      await prisma.plan.create({
        data: { ...def, descripcion: "", activo: true },
      })
    }
  } catch (err: any) {
    if (err?.code !== "P2002") console.error("[ensurePlanExists] plan create failed:", err)
  }
}

async function getUniqueSlug(base: string): Promise<string> {
  let slug = slugify(base)
  let counter = 0
  while (true) {
    const candidate = counter === 0 ? slug : `${slug}-${counter}`
    const negocioExists = await prisma.negocio.findUnique({ where: { slug: candidate } })
    const storeExists = await prisma.store.findUnique({ where: { slug: candidate } })
    if (!negocioExists && !storeExists) return candidate
    counter++
  }
}

async function createStoreForUser(userId: string, userName: string, planId: string, cfg: { modalidad: string | null; planType: string; hasAgenda: boolean }) {
  const slug = await getUniqueSlug(userName)

  const negocio = await prisma.negocio.create({
    data: {
      nombre: userName,
      slug,
      planId,
      modalidad: cfg.modalidad,
      planEstado: "pendiente",
      planVencimiento: null,
      userId,
    },
  })

  const store = await prisma.store.create({
    data: {
      name: userName,
      slug,
      plan: "free",
      planStatus: "pendiente",
      planType: cfg.planType,
      userId,
      negocioId: negocio.id,
    },
  })

  await prisma.storeMember.create({
    data: {
      storeId: store.id,
      userId,
      role: "admin",
    },
  })

  if (cfg.hasAgenda) {
    await prisma.agenda.create({
      data: {
        nombre: "Mi Agenda",
        slug: slug + "-agenda",
        negocioId: negocio.id,
      },
    }).catch(() => {})
  }

  return store
}

export async function applyPlanSelection(planParam: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "No autenticado" }
  const userId = session.user.id

  const resolved = resolvePlanId(planParam)
  const cfg = planToConfig[resolved]
  if (!cfg) return { success: false, error: "Plan no válido" }

  // Ensure plans exist in DB
  await ensurePlanExists(resolved)

  // Find or create store
  let store = await prisma.store.findUnique({
    where: { userId },
    select: { id: true, planType: true, negocioId: true, slug: true, name: true },
  })

  if (!store) {
    // User registered but has no store yet — create it now
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
    const userName = user?.name || "Mi Tienda"
    store = await createStoreForUser(userId, userName, resolved, cfg)
    if (!store) return { success: false, error: "No se pudo crear la tienda" }
    return { success: true }
  }

  // Update existing store planType
  try {
    await prisma.store.update({ where: { id: store.id }, data: { planType: cfg.planType } })
  } catch (e) {
    console.error("[applyPlanSelection] store.update failed:", e)
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
