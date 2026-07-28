import "dotenv/config"
import pg from "pg"

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })

interface SeedQuestion {
  texto: string
  tipo: string
  opciones?: string
  orden: number
  requerida?: boolean
  puntaje?: string
  condicionLogica?: string
  placeholder?: string
}

interface SeedSection {
  nombre: string
  descripcion: string
  icono: string
  orden: number
  questions: SeedQuestion[]
}

async function main() {
  await client.connect()
  console.log("Connected to database. Seeding sales questions...")

  const sections: SeedSection[] = [
    {
      nombre: "Presentacion",
      descripcion: "Datos iniciales del contacto",
      icono: "User",
      orden: 0,
      questions: [
        { texto: "Quien atendio?", tipo: "radio", opciones: JSON.stringify(["Dueno", "Gerente", "Encargado", "Empleado"]), orden: 0, puntaje: JSON.stringify({ Dueno: 5, Gerente: 3, Encargado: 2, Empleado: 0 }) },
        { texto: "Puede tomar decisiones?", tipo: "radio", opciones: JSON.stringify(["Si", "No"]), orden: 1, puntaje: JSON.stringify({ Si: 10, No: 0 }) },
        { texto: "Nombre del responsable", tipo: "text", orden: 2, requerida: false, condicionLogica: JSON.stringify({ questionIndex: 1, value: "No" }), placeholder: "Nombre completo del responsable" },
      ],
    },
    {
      nombre: "Situacion actual",
      descripcion: "Como funciona el negocio hoy",
      icono: "Building",
      orden: 1,
      questions: [
        { texto: "Tiene sistema administrativo?", tipo: "radio", opciones: JSON.stringify(["Si", "No", "Excel", "Cuaderno", "Otro"]), orden: 0, puntaje: JSON.stringify({ No: 20, Excel: 15, Cuaderno: 20, Si: 0, Otro: 10 }) },
        { texto: "Como controla inventario?", tipo: "radio", opciones: JSON.stringify(["Sistema", "Excel", "Cuaderno", "Mentalmente"]), orden: 1, puntaje: JSON.stringify({ Mentalmente: 20, Cuaderno: 15, Excel: 10, Sistema: 0 }) },
        { texto: "Como registra ventas?", tipo: "radio", opciones: JSON.stringify(["Sistema", "Excel", "Cuaderno", "No registra"]), orden: 2, puntaje: JSON.stringify({ "No registra": 20, Cuaderno: 15, Excel: 10, Sistema: 0 }) },
        { texto: "Tiene tienda online?", tipo: "radio", opciones: JSON.stringify(["Si", "No"]), orden: 3, puntaje: JSON.stringify({ No: 15, Si: 0 }) },
        { texto: "Tiene pagina web?", tipo: "radio", opciones: JSON.stringify(["Si", "No"]), orden: 4, puntaje: JSON.stringify({ No: 5, Si: 0 }) },
        { texto: "Vende por WhatsApp?", tipo: "radio", opciones: JSON.stringify(["Si", "No"]), orden: 5, puntaje: JSON.stringify({ No: 10, Si: 5 }) },
        { texto: "Cuantos empleados tiene?", tipo: "number", orden: 6, placeholder: "Numero aproximado" },
        { texto: "Cuantos productos vende aproximadamente?", tipo: "number", orden: 7, placeholder: "Numero aproximado" },
      ],
    },
    {
      nombre: "Descubrir el dolor",
      descripcion: "Identificar problemas y necesidades",
      icono: "AlertTriangle",
      orden: 2,
      questions: [
        { texto: "Ha perdido ventas por no encontrar productos?", tipo: "radio", opciones: JSON.stringify(["Nunca", "A veces", "Muchas veces"]), orden: 0, puntaje: JSON.stringify({ "Muchas veces": 15, "A veces": 10, Nunca: 0 }) },
        { texto: "Conoce exactamente cuanto gana?", tipo: "radio", opciones: JSON.stringify(["Si", "No"]), orden: 1, puntaje: JSON.stringify({ No: 15, Si: 0 }) },
        { texto: "Pierde tiempo administrando?", tipo: "radio", opciones: JSON.stringify(["Si", "No"]), orden: 2, puntaje: JSON.stringify({ Si: 10, No: 0 }) },
        { texto: "Tiene problemas de inventario?", tipo: "radio", opciones: JSON.stringify(["Si", "No"]), orden: 3, puntaje: JSON.stringify({ Si: 10, No: 0 }) },
        { texto: "Ha tenido problemas con empleados?", tipo: "radio", opciones: JSON.stringify(["Si", "No"]), orden: 4, puntaje: JSON.stringify({ Si: 5, No: 0 }) },
        { texto: "Le gustaria ahorrar tiempo?", tipo: "radio", opciones: JSON.stringify(["Si", "No"]), orden: 5, puntaje: JSON.stringify({ Si: 5, No: 0 }) },
      ],
    },
    {
      nombre: "Interes",
      descripcion: "Nivel de interes del prospecto",
      icono: "Target",
      orden: 3,
      questions: [
        { texto: "Le gustaria conocer una solucion?", tipo: "radio", opciones: JSON.stringify(["Mucho", "Poco", "Nada"]), orden: 0, puntaje: JSON.stringify({ Mucho: 20, Poco: 5, Nada: 0 }) },
        { texto: "Le gustaria una demostracion?", tipo: "radio", opciones: JSON.stringify(["Si", "No"]), orden: 1, puntaje: JSON.stringify({ Si: 20, No: 0 }) },
        { texto: "Cuando podria implementarla?", tipo: "radio", opciones: JSON.stringify(["Hoy", "Esta semana", "Este mes", "Mas adelante"]), orden: 2, puntaje: JSON.stringify({ Hoy: 15, "Esta semana": 10, "Este mes": 5, "Mas adelante": 0 }) },
      ],
    },
    {
      nombre: "Objeciones",
      descripcion: "Identificar objeciones del prospecto",
      icono: "ShieldAlert",
      orden: 4,
      questions: [
        { texto: "Objeciones detectadas", tipo: "checklist", opciones: JSON.stringify(["Esta caro", "No tengo tiempo", "Ya tengo sistema", "Lo pensare", "Debo consultar", "No me interesa", "Otro"]), orden: 0, requerida: false },
      ],
    },
  ]

  for (const sectionData of sections) {
    const sectionId = `seed-${sectionData.nombre.toLowerCase().replace(/\s/g, "-")}`

    await client.query(
      `INSERT INTO "SalesSection" (id, nombre, descripcion, icono, orden, activo, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5::int, true, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET nombre = $2, orden = $5::int`,
      [sectionId, sectionData.nombre, sectionData.descripcion, sectionData.icono, sectionData.orden]
    )

    for (const qData of sectionData.questions) {
      const existing = await client.query(
        `SELECT id FROM "SalesQuestion" WHERE "sectionId" = $1 AND texto = $2 LIMIT 1`,
        [sectionId, qData.texto]
      )
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO "SalesQuestion" (id, texto, tipo, opciones, orden, requerida, puntaje, "condicionLogica", placeholder, "sectionId", activo, "createdAt", "updatedAt")
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4::int, $5, $6, $7, $8, $9, true, NOW(), NOW())`,
          [qData.texto, qData.tipo, qData.opciones || null, qData.orden, qData.requerida ?? true, qData.puntaje || null, qData.condicionLogica || null, qData.placeholder || null, sectionId]
        )
      }
    }
    console.log(`  Section "${sectionData.nombre}" seeded (${sectionData.questions.length} questions)`)
  }

  const scoringRules = [
    { nombre: "Sin sistema administrativo", campo: "sistema_admin", valor: "No", puntos: 20 },
    { nombre: "Usa Excel", campo: "sistema_admin", valor: "Excel", puntos: 15 },
    { nombre: "Usa cuaderno", campo: "sistema_admin", valor: "Cuaderno", puntos: 20 },
    { nombre: "Sin tienda online", campo: "tienda_online", valor: "No", puntos: 15 },
    { nombre: "Quiere demostracion", campo: "quiere_demo", valor: "Si", puntos: 20 },
    { nombre: "Perdio muchas ventas", campo: "perdio_ventas", valor: "Muchas veces", puntos: 15 },
    { nombre: "No conoce ganancias", campo: "conoce_ganancias", valor: "No", puntos: 15 },
    { nombre: "Pierde tiempo administrando", campo: "pierde_tiempo", valor: "Si", puntos: 10 },
    { nombre: "Quiere solucion urgente", campo: "quiere_solucion", valor: "Mucho", puntos: 20 },
    { nombre: "Implementa esta semana", campo: "plazo", valor: "Esta semana", puntos: 10 },
    { nombre: "Implementa hoy", campo: "plazo", valor: "Hoy", puntos: 15 },
  ]

  for (const rule of scoringRules) {
    const existing = await client.query(`SELECT id FROM "SalesScoringRule" WHERE nombre = $1 LIMIT 1`, [rule.nombre])
    if (existing.rows.length === 0) {
      await client.query(
        `INSERT INTO "SalesScoringRule" (id, nombre, campo, valor, puntos, activo, "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4::int, true, NOW(), NOW())`,
        [rule.nombre, rule.campo, rule.valor, rule.puntos]
      )
    }
  }
  console.log(`  ${scoringRules.length} scoring rules seeded`)

  const planRules = [
    { plan: "agenda", min: 0, max: 29, desc: "Para negocios pequenos con necesidades basicas" },
    { plan: "emprendedor", min: 30, max: 60, desc: "Para negocios en crecimiento que necesitan mas herramientas" },
    { plan: "empresarial", min: 61, max: 100, desc: "Para negocios grandes con necesidades avanzadas" },
  ]

  for (const rule of planRules) {
    const existing = await client.query(`SELECT id FROM "SalesPlanRecommendation" WHERE plan = $1 LIMIT 1`, [rule.plan])
    if (existing.rows.length === 0) {
      await client.query(
        `INSERT INTO "SalesPlanRecommendation" (id, plan, "minPuntuacion", "maxPuntuacion", descripcion, activo, "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2::int, $3::int, $4, true, NOW(), NOW())`,
        [rule.plan, rule.min, rule.max, rule.desc]
      )
    }
  }
  console.log(`  ${planRules.length} plan recommendation rules seeded`)

  console.log("Sales questions seed completed!")
  await client.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
