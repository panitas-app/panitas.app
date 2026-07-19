import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import { enviarBienvenida, sendEmail } from "@/lib/email"
import { templateVerifyEmail } from "@/lib/email-templates"
import { getPostHogClient } from "@/lib/posthog-server"

const PASSWORD_MIN_LENGTH = 6

const planDefaults: Record<string, { planId: string; modalidad: string | null; planType: string; hasAgenda: boolean }> = {
  agenda: { planId: "agenda", modalidad: "agenda", planType: "agenda", hasAgenda: true },
  comercio: { planId: "comercio", modalidad: null, planType: "tienda", hasAgenda: true },
  mayorista: { planId: "mayorista", modalidad: null, planType: "empresa", hasAgenda: false },
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tienda"
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const { success, remaining, resetIn } = await rateLimit(`register:${ip}`, 3, 15 * 60 * 1000)
    if (!success) {
      return NextResponse.json(
        { error: `Demasiados intentos. Intenta de nuevo en ${Math.ceil(resetIn / 1000)}s` },
        { status: 429, headers: { "Retry-After": String(Math.ceil(resetIn / 1000)) } }
      )
    }

    const { name, email, password, plan } = await req.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
      return NextResponse.json({ error: "Formato de datos inválido" }, { status: 400 })
    }

    const trimmedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json({ error: "Formato de correo inválido" }, { status: 400 })
    }

    const trimmedName = name.trim().slice(0, 100)
    if (trimmedName.length < 2) {
      return NextResponse.json({ error: "El nombre debe tener al menos 2 caracteres" }, { status: 400 })
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return NextResponse.json({
        error: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
      }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } })
    if (existing) {
      return NextResponse.json({ error: "El correo ya está registrado" }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name: trimmedName,
        email: trimmedEmail,
        password: hashedPassword,
      },
    })

    // Auto-create Negocio + Store + Agenda if plan is provided
    const planKey = plan && planDefaults[plan] ? plan : "comercio"
    const cfg = planDefaults[planKey]
    const planSlug = slugify(trimmedName) + "-" + user.id.slice(0, 6)

    try {
      // Ensure Plan record exists in DB (no transactions for Neon HTTP)
      // Use findUnique+create instead of upsert (upsert uses transactions internally)
      const existingPlan = await prisma.plan.findUnique({ where: { id: cfg.planId } })
      if (!existingPlan) {
        try {
          await prisma.plan.create({
            data: {
              id: cfg.planId,
              nombre: cfg.planId,
              label: cfg.planId.charAt(0).toUpperCase() + cfg.planId.slice(1),
              descripcion: "",
              precioUsd: cfg.planId === "agenda" ? 15 : cfg.planId === "comercio" ? 25 : 45,
              precioUsdAnual: cfg.planId === "agenda" ? 150 : cfg.planId === "comercio" ? 250 : 450,
              activo: true,
              sortOrder: cfg.planId === "agenda" ? 1 : cfg.planId === "comercio" ? 2 : 3,
            },
          })
        } catch (err: any) {
          if (err?.code !== "P2002") throw err
        }
      }

      const negocio = await prisma.negocio.create({
        data: {
          nombre: trimmedName,
          slug: planSlug,
          planId: cfg.planId,
          modalidad: cfg.modalidad,
          planEstado: "pendiente",
          planVencimiento: null,
          userId: user.id,
        },
      })

      if (cfg.hasAgenda) {
        await prisma.agenda.create({
          data: {
            nombre: "Mi Agenda",
            slug: planSlug + "-agenda",
            negocioId: negocio.id,
          },
        })
      }

      // Create Store without nested creation to avoid HTTP transaction failures
      const store = await prisma.store.create({
        data: {
          name: trimmedName,
          slug: planSlug,
          plan: "free",
          planStatus: "pendiente",
          planType: cfg.planType,
          userId: user.id,
          negocioId: negocio.id,
        },
      })

      // Create StoreMember separately
      await prisma.storeMember.create({
        data: {
          storeId: store.id,
          userId: user.id,
          role: "admin",
        },
      })
    } catch (creationError: any) {
      console.error("[register creation crash]", creationError)
      try {
        await prisma.auditLog.create({
          data: {
            action: "register.creation_failed",
            entity: "User",
            metadata: JSON.stringify({ error: creationError?.message || String(creationError), stack: creationError?.stack }),
            userId: user.id,
          }
        })
      } catch (logErr) {
        console.error("Failed to write register crash audit log:", logErr)
      }
      // Opción A: No relanzar si el User ya fue creado.
      // getCurrentStore() auto-healeará Store/Negocio faltantes en el siguiente login.
    }

    // Always send welcome + verification emails + track even if Store/Negocio creation fails
    enviarBienvenida(trimmedEmail, trimmedName)
      .catch(e => console.error("[welcome email error]", e))

    try {
      const codigo = Math.floor(100000 + Math.random() * 900000).toString()
      const token = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

      await prisma.user.update({
        where: { id: user.id },
        data: {
          verification_token: JSON.stringify({ codigo, token }),
          token_expires_at: expiresAt,
        },
      })

      const link = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/verify-email?token=${token}`
      sendEmail(
        trimmedEmail,
        "Verifica tu correo electrónico — Panitas",
        templateVerifyEmail(trimmedName, codigo, link),
        "verify_email"
      ).catch(e => console.error("[verify email error]", e))
    } catch (err: any) {
      console.error("[register verify email setup error]", err)
    }

    const phog = getPostHogClient()
    phog.identify({ distinctId: user.id, properties: { plan: planKey } })
    phog.capture({ distinctId: user.id, event: "user_registered", properties: { plan: planKey, method: "email" } })
    phog.flush().catch(e => console.error("[posthog flush error]", e))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
