import { PrismaClient } from "@prisma/client"
import { neonConfig } from "@neondatabase/serverless"
import { PrismaNeon } from "@prisma/adapter-neon"
import ws from "ws"
import { createInterface } from "readline"

neonConfig.webSocketConstructor = ws

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const rl = createInterface({ input: process.stdin, output: process.stdout })

function ask(q) {
  return new Promise((r) => rl.question(q, r))
}

function formatDate(d) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("es-VE", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  })
}

const PLAN_LABELS = { free: "Gratis", basic: "Básico", advanced: "Avanzado" }
const STATUS_LABELS = { pending: "Pendiente", active: "Activa", expired: "Vencida", cancelled: "Cancelada" }

async function main() {
  const args = process.argv.slice(2)

  // Setup mode: hacer superadmin sin autenticación
  if (args.includes("--setup")) {
    console.log("=".repeat(50))
    console.log("  PANITAS — Configuración inicial")
    console.log("=".repeat(50))
    const email = await ask("\nEmail del usuario a hacer superadmin: ")
    let user = await prisma.user.findUnique({ where: { email } })
    
    if (!user) {
      const createConfirm = await ask(`\nEl usuario con email "${email}" no existe en la base de datos.\n¿Deseas CREARLO ahora mismo como Superadmin? (s/N): `)
      if (createConfirm.toLowerCase() === "s") {
        const name = await ask("Nombre del superadmin: ")
        const passwordInput = await ask("Contraseña (dejar vacío si usará Google): ")
        let hashedPassword = null
        
        if (passwordInput) {
          const bcrypt = await import("bcryptjs")
          // Handle default / esm imports from commonjs
          const hashFn = bcrypt.default?.hash || bcrypt.hash
          hashedPassword = await hashFn(passwordInput, 10)
        }
        
        user = await prisma.user.create({
          data: {
            email,
            name: name || "Superadmin",
            password: hashedPassword,
            role: "superadmin",
          },
        })
        console.log(`\n✓ Usuario "${email}" creado exitosamente con el rol de superadmin!`)
      } else {
        console.log("\n✗ Operación cancelada.")
        rl.close()
        return
      }
    } else {
      await prisma.user.update({ where: { email }, data: { role: "superadmin" } })
      console.log(`\n✓ ${email} ahora es superadmin. Ya puedes usar 'npm run admin'`)
    }
    
    rl.close()
    return
  }

  console.clear()
  console.log("=".repeat(50))
  console.log("  PANITAS — Panel de Administración (CLI)")
  console.log("=".repeat(50))
  console.log("\n  Usa 'npm run admin -- --setup' para la primera configuración")
  console.log()

  // Login
  const email = await ask("Email del superadmin: ")
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.role !== "superadmin") {
    console.log("\n✗ Acceso denegado. El usuario no existe o no es superadmin.")
    console.log("  Si es la primera vez, usa: npm run admin -- --setup")
    rl.close()
    return
  }
  console.log(`\n✓ Bienvenido ${user.name || user.email}`)

  while (true) {
    console.log("\n" + "─".repeat(50))
    console.log("  SELECCIONA UNA OPCIÓN:")
    console.log("─".repeat(50))
    console.log("  1) Suscripciones pendientes")
    console.log("  2) Suscripciones activas")
    console.log("  3) Ver detalle de suscripción")
    console.log("  4) Activar suscripción")
    console.log("  5) Rechazar suscripción")
    console.log("  6) Listar tiendas")
    console.log("  7) Historial completo de suscripciones")
    console.log("  8) Hacer usuario superadmin")
    console.log("  0) Salir")

    const opt = await ask("\nOpción: ")

    if (opt === "0") break
    else if (opt === "1") await listPending()
    else if (opt === "2") await listActive()
    else if (opt === "3") await viewDetail()
    else if (opt === "4") await activateSubscription(user.id)
    else if (opt === "5") await rejectSubscription()
    else if (opt === "6") await listStores()
    else if (opt === "7") await listAllSubscriptions()
    else if (opt === "8") await makeSuperadmin()
    else console.log("\n✗ Opción inválida")
  }

  rl.close()
  await prisma.$disconnect()
}

async function listPending() {
  const subs = await prisma.storeSubscription.findMany({
    where: { status: "pending" },
    include: { store: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  })

  if (subs.length === 0) {
    console.log("\n  No hay suscripciones pendientes.")
    return
  }

  console.log(`\n  ${subs.length} suscripción(es) pendiente(s):\n`)
  subs.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.store.name} (${s.store.slug})`)
    console.log(`     Plan: ${PLAN_LABELS[s.plan]} | $${s.amount.toFixed(2)} | ${s.period === "yearly" ? "Anual" : "Mensual"}`)
    console.log(`     Método: ${s.paymentMethod || "—"} | Ref: ${s.reference || "—"}`)
    console.log(`     Fecha: ${formatDate(s.createdAt)}`)
    console.log(`     ID: ${s.id}`)
    console.log()
  })
}

async function listActive() {
  const subs = await prisma.storeSubscription.findMany({
    where: { status: "active" },
    include: { store: { select: { name: true, slug: true, plan: true } } },
    orderBy: { endDate: "desc" },
  })

  if (subs.length === 0) {
    console.log("\n  No hay suscripciones activas.")
    return
  }

  console.log(`\n  ${subs.length} suscripción(es) activa(s):\n`)
  subs.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.store.name} (${s.store.slug}) — Plan actual: ${PLAN_LABELS[s.store.plan]}`)
    console.log(`     Suscripción: ${PLAN_LABELS[s.plan]} | $${s.amount.toFixed(2)}/${s.period === "yearly" ? "año" : "mes"}`)
    console.log(`     Vence: ${formatDate(s.endDate)}`)
    console.log(`     ID: ${s.id}`)
    console.log()
  })
}

async function viewDetail() {
  const id = await ask("ID de la suscripción: ")
  const sub = await prisma.storeSubscription.findUnique({
    where: { id },
    include: {
      store: { select: { name: true, slug: true, plan: true, email: true, phone: true } },
      verifiedBy: { select: { name: true, email: true } },
    },
  })

  if (!sub) { console.log("\n✗ No encontrada"); return }

  console.log(`\n  ─── DETALLE DE SUSCRIPCIÓN ───`)
  console.log(`  Tienda:     ${sub.store.name} (${sub.store.slug})`)
  console.log(`  Plan actual: ${PLAN_LABELS[sub.store.plan]}`)
  console.log(`  Plan solicitado: ${PLAN_LABELS[sub.plan]}`)
  console.log(`  Estado:     ${STATUS_LABELS[sub.status]}`)
  console.log(`  Monto:      $${sub.amount.toFixed(2)}`)
  console.log(`  Período:    ${sub.period === "yearly" ? "Anual" : "Mensual"}`)
  console.log(`  Creada:     ${formatDate(sub.createdAt)}`)
  if (sub.startDate) console.log(`  Inicio:     ${formatDate(sub.startDate)}`)
  if (sub.endDate) console.log(`  Vence:      ${formatDate(sub.endDate)}`)
  if (sub.paymentMethod) {
    console.log(`  Método pago: ${sub.paymentMethod}`)
    console.log(`  Referencia:  ${sub.reference || "—"}`)
    console.log(`  Banco orig.: ${sub.bankOrigin || "—"}`)
    console.log(`  Pagado el:   ${formatDate(sub.paidAt)}`)
    if (sub.receiptImage) console.log(`  Comprobante: ${sub.receiptImage}`)
  }
  if (sub.verifiedAt) console.log(`  Verificado:  ${formatDate(sub.verifiedAt)} por ${sub.verifiedBy?.name || sub.verifiedBy?.email || "—"}`)
  if (sub.notes) console.log(`  Notas:       ${sub.notes}`)
}

async function activateSubscription(adminUserId) {
  const id = await ask("ID de la suscripción a activar: ")
  const sub = await prisma.storeSubscription.findUnique({ where: { id } })
  if (!sub) { console.log("\n✗ No encontrada"); return }
  if (sub.status !== "pending") { console.log(`\n✗ La suscripción ya está "${STATUS_LABELS[sub.status]}"`); return }

  const confirm = await ask(`¿Activar plan ${PLAN_LABELS[sub.plan]} para esta tienda? (s/N): `)
  if (confirm.toLowerCase() !== "s") { console.log("  Cancelado"); return }

  const now = new Date()
  const endDate = new Date(now)
  if (sub.period === "yearly") endDate.setFullYear(endDate.getFullYear() + 1)
  else endDate.setMonth(endDate.getMonth() + 1)

  await prisma.storeSubscription.update({
    where: { id },
    data: {
      status: "active",
      startDate: now,
      endDate,
      verifiedAt: now,
      verifiedById: adminUserId,
    },
  })

  await prisma.store.update({
    where: { id: sub.storeId },
    data: { plan: sub.plan },
  })

  console.log(`\n✓ Suscripción activada exitosamente`)
  console.log(`  Plan ${PLAN_LABELS[sub.plan]} activo hasta ${formatDate(endDate)}`)
}

async function rejectSubscription() {
  const id = await ask("ID de la suscripción a rechazar: ")
  const sub = await prisma.storeSubscription.findUnique({ where: { id } })
  if (!sub) { console.log("\n✗ No encontrada"); return }
  if (sub.status !== "pending") { console.log(`\n✗ La suscripción ya está "${STATUS_LABELS[sub.status]}"`); return }

  const confirm = await ask(`¿Rechazar esta suscripción? (s/N): `)
  if (confirm.toLowerCase() !== "s") { console.log("  Cancelado"); return }

  await prisma.storeSubscription.update({
    where: { id },
    data: { status: "cancelled" },
  })

  console.log(`\n✓ Suscripción rechazada`)
}

async function listStores() {
  const stores = await prisma.store.findMany({
    select: {
      name: true, slug: true, plan: true, isActive: true, email: true, phone: true, createdAt: true,
      _count: { select: { products: true, orders: true, members: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  if (stores.length === 0) { console.log("\n  No hay tiendas registradas."); return }

  console.log(`\n  ${stores.length} tienda(s):\n`)
  stores.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name} (${s.slug})`)
    console.log(`     Plan: ${PLAN_LABELS[s.plan]} | ${s.isActive ? "Activa" : "Inactiva"}`)
    console.log(`     Productos: ${s._count.products} | Órdenes: ${s._count.orders} | Miembros: ${s._count.members}`)
    console.log(`     Registro: ${formatDate(s.createdAt)}`)
    console.log()
  })
}

async function listAllSubscriptions() {
  const subs = await prisma.storeSubscription.findMany({
    include: { store: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  })

  if (subs.length === 0) { console.log("\n  No hay suscripciones registradas."); return }

  console.log(`\n  Últimas ${subs.length} suscripciones:\n`)
  subs.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.store.name} — ${PLAN_LABELS[s.plan]} — ${STATUS_LABELS[s.status]}`)
    console.log(`     $${s.amount.toFixed(2)} | ${formatDate(s.createdAt)}`)
    console.log(`     ID: ${s.id}`)
    console.log()
  })
}

async function makeSuperadmin() {
  const email = await ask("Email del usuario a hacer superadmin: ")
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) { console.log("\n✗ Usuario no encontrado"); return }

  const confirm = await ask(`¿Dar permisos de superadmin a ${user.name || user.email}? (s/N): `)
  if (confirm.toLowerCase() !== "s") { console.log("  Cancelado"); return }

  await prisma.user.update({ where: { email }, data: { role: "superadmin" } })
  console.log(`\n✓ ${user.email} ahora es superadmin`)
}

main().catch((e) => {
  console.error("Error:", e.message)
  rl.close()
  prisma.$disconnect()
})
