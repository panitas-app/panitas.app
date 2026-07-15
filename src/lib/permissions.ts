import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Role } from "@/lib/roles"

export type { Role }

export type StoreInfo = {
  store: {
    id: string
    name: string
    slug: string
    logo: string | null
    banner: string | null
    plan: string
    planType: string
    planStatus: string
    planStartDate: Date | null
    planExpirationDate: Date | null
    primaryColor: string
    whatsapp: string | null
    phone: string | null
    address: string | null
    storeHours: string | null
    description: string | null
    template: string
    tutorialCompleted: boolean
    email: string | null
    domain: string | null
    instagram: string | null
    facebook: string | null
    tiktok: string | null
    twitter: string | null
    youtube: string | null
    linkedin: string | null
    posPin: string | null
    creditDays: string
    isActive: boolean
    userId: string
    negocioId: string | null
    shippingCost: number
    freeShippingActive: boolean
    freeShippingMinAmount: number
    createdAt: Date
    updatedAt: Date
  }
  role: Role
  memberId: string
  userId: string
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tienda"
}

async function autoCreateStore(userId: string): Promise<StoreInfo | null> {
  try {
    // 1. Buscar o crear Negocio
    let negocio = await prisma.negocio.findUnique({ where: { userId } })
    if (!negocio) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
      const name = user?.name || "Mi Tienda"
      const slug = slugify(name) + "-" + userId.slice(0, 6)

      // Asegurar que existan los planes por defecto
      for (const p of [
        { id: "agenda", nombre: "agenda", label: "Agenda", precioUsd: 15, precioUsdAnual: 150, sortOrder: 1 },
        { id: "comercio", nombre: "comercio", label: "Emprendedor", precioUsd: 25, precioUsdAnual: 250, sortOrder: 2 },
        { id: "mayorista", nombre: "mayorista", label: "Mayorista", precioUsd: 45, precioUsdAnual: 450, sortOrder: 3 },
        { id: "basico", nombre: "basico", label: "Agenda", precioUsd: 15, precioUsdAnual: 150, sortOrder: 1 },
        { id: "negocio", nombre: "negocio", label: "Emprendedor", precioUsd: 25, precioUsdAnual: 250, sortOrder: 2 },
        { id: "empresarial", nombre: "empresarial", label: "Mayorista", precioUsd: 45, precioUsdAnual: 450, sortOrder: 3 },
      ]) {
        await prisma.plan.upsert({
          where: { id: p.id },
          update: {},
          create: { ...p, descripcion: "", activo: true },
        })
      }

      negocio = await prisma.negocio.create({
        data: {
          nombre: name,
          slug,
          planId: "comercio",
          modalidad: null,
          planEstado: "pendiente",
          planVencimiento: null,
          userId,
        },
      })
    }

    // 2. Buscar o crear Store
    let store = await prisma.store.findUnique({ where: { userId } })
    if (!store) {
      const name = negocio.nombre
      const slug = negocio.slug
      const planType = negocio.modalidad === "tienda" ? "tienda"
        : negocio.modalidad === "agenda" ? "agenda"
        : negocio.planId === "agenda" ? "agenda"
        : negocio.planId === "negocio" ? "negocio"
        : negocio.planId === "empresarial" ? "empresa"
        : "tienda"

      store = await prisma.store.create({
        data: {
          name,
          slug,
          userId,
          negocioId: negocio.id,
          plan: "free",
          planType,
          planStatus: "pendiente",
        },
      })
    }

    // 3. Buscar o crear StoreMember
    let member = await prisma.storeMember.findFirst({
      where: { storeId: store.id, userId },
      include: { store: true },
    })

    if (!member) {
      member = await prisma.storeMember.create({
        data: {
          storeId: store.id,
          userId,
          role: "admin",
        },
        include: { store: true },
      })
    }

    return {
      store: member.store,
      role: member.role as Role,
      memberId: member.id,
      userId,
    }
  } catch (e) {
    console.error("auto-create store failed:", e)
    return null
  }
}


export async function getCurrentStore(): Promise<StoreInfo | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  let member = await prisma.storeMember.findFirst({
    where: { userId: session.user.id },
    include: { store: true },
  })

  if (!member) {
    const ownedStore = await prisma.store.findUnique({
      where: { userId: session.user.id },
    })

    if (ownedStore) {
      try {
        member = await prisma.storeMember.create({
          data: {
            storeId: ownedStore.id,
            userId: session.user.id,
            role: "admin",
          },
          include: { store: true },
        })
      } catch (e) {
        console.error("Failed to auto-heal store admin membership:", e)
        return {
          store: ownedStore,
          role: "admin" as Role,
          memberId: "owner-fallback",
          userId: session.user.id,
        }
      }
    }
  }

  if (!member) {
    const created = await autoCreateStore(session.user.id)
    if (created) return created
  }

  if (!member) return null

  return {
    store: member.store,
    role: member.role as Role,
    memberId: member.id,
    userId: member.userId,
  }
}

export async function requireRole(allowedRoles: Role[]): Promise<StoreInfo> {
  const current = await getCurrentStore()
  if (!current) {
    throw new Error("No tienes acceso a esta tienda")
  }
  if (!allowedRoles.includes(current.role)) {
    throw new Error("No tienes permisos para realizar esta acción")
  }

  const negocio = current.store.negocioId
    ? await prisma.negocio.findUnique({ where: { id: current.store.negocioId } })
    : null

  if (negocio && negocio.planEstado !== "activo" && negocio.planEstado !== "pendiente" && negocio.planEstado !== "trial") {
    throw new Error(
      "Tu plan está pendiente de pago. Actívalo para empezar a usar todas las funciones."
    )
  }

  return current
}

// ─── Negocio helpers ───

export type NegocioInfo = {
  id: string
  planId: string
  modalidad: string | null
  planEstado: string
  planVencimiento: Date | null
  userId: string
}

export async function getCurrentNegocio(): Promise<NegocioInfo | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const negocio = await prisma.negocio.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      planId: true,
      modalidad: true,
      planEstado: true,
      planVencimiento: true,
      userId: true,
    },
  })

  return negocio
}

export async function requireNegocio(): Promise<NegocioInfo> {
  const negocio = await getCurrentNegocio()
  if (!negocio) {
    throw new Error("No tienes un negocio registrado. Completa el registro primero.")
  }
  return negocio
}

