import { DEMO_STEPS } from "./constants"

export function calculateTemperature(score: number): string {
  if (score >= 121) return "muy_caliente"
  if (score >= 71) return "caliente"
  if (score >= 31) return "tibio"
  return "frio"
}

export function calculateScoreFromAnswers(
  answers: Array<{ valor: string; question: { puntaje: string | null } }>
): number {
  let total = 0
  for (const answer of answers) {
    if (!answer.question.puntaje) continue
    try {
      const scoringMap = JSON.parse(answer.question.puntaje)
      for (const [key, points] of Object.entries(scoringMap)) {
        if (answer.valor.toLowerCase() === key.toLowerCase()) {
          total += Number(points)
        }
      }
    } catch {
      continue
    }
  }
  return total
}

export function recommendPlan(
  answers: Array<{ valor: string; question: { texto: string } }>,
  score: number
): string {
  const empleadosAnswer = answers.find((a) => a.question.texto.toLowerCase().includes("empleados"))
  const numEmpleados = parseInt(empleadosAnswer?.valor || "0")

  const productosAnswer = answers.find((a) => a.question.texto.toLowerCase().includes("productos"))
  const numProductos = parseInt(productosAnswer?.valor || "0")

  const tieneSistema = answers.find((a) => a.question.texto.toLowerCase().includes("sistema administrativo"))
  const tieneTienda = answers.find((a) => a.question.texto.toLowerCase().includes("tienda online"))

  if (score > 60 || numEmpleados > 5 || numProductos > 200) return "empresarial"
  if (
    score > 30 ||
    numEmpleados >= 2 ||
    (tieneSistema?.valor === "No" && tieneTienda?.valor === "No") ||
    numProductos > 50
  ) {
    return "emprendedor"
  }
  return "agenda"
}

export function getRouteLabel(route: string | null | undefined): string {
  if (!route) return "No especificada"
  switch (route) {
    case "emprendedor_presencial": return "Venta presencial + POS + Inventario"
    case "emprendedor_online": return "Tienda fisica + Venta online + Inventario"
    case "agenda_salud": return "Salud y profesionales medicos"
    case "agenda_belleza": return "Barberias, belleza y estetica"
    case "empresarial_default": return "Plan Empresarial"
    default: return route
  }
}

function getOpportunityLevel(score: number): string {
  if (score >= 121) return "Prioritaria"
  if (score >= 71) return "Alta"
  if (score >= 31) return "Media"
  return "Baja"
}

export function generateSummary(
  answers: Array<{ valor: string; question: { texto: string; tipo?: string } }>,
  planRecomendado: string,
  prospect?: { nombreNegocio?: string; categoria?: string } | null,
  route?: string | null
): string {
  const problemas: string[] = []
  const dolores: string[] = []
  const motivaciones: string[] = []

  for (const answer of answers) {
    const texto = answer.question.texto.replace("?", "").trim()
    if (
      answer.valor === "No" ||
      answer.valor === "No registramos" ||
      answer.valor === "No tenemos control" ||
      answer.valor === "Memoria" ||
      answer.valor === "No vendo online" ||
      answer.valor === "No tengo catalogo" ||
      answer.valor === "No actualizo" ||
      answer.valor === "Cuaderno" ||
      answer.valor === "No puedo saberlo"
    ) {
      problemas.push(`${texto}: ${answer.valor}`)
    }
    if (answer.question.tipo === "checklist" && answer.valor) {
      const items = answer.valor.split(",").map((s) => s.trim()).filter(Boolean)
      for (const item of items) {
        if (item !== "Ninguno" && item !== "Otro") {
          problemas.push(item)
        }
      }
    }
    if (texto.toLowerCase().includes("mejorar") || texto.toLowerCase().includes("gustaria mejorar")) {
      motivaciones.push(answer.valor)
    }
    if (texto.toLowerCase().includes("problemas")) {
      const items = answer.valor.split(",").map((s) => s.trim()).filter(Boolean)
      for (const item of items) {
        if (item !== "Ninguno") dolores.push(item)
      }
    }
  }

  const planLabel =
    planRecomendado === "empresarial"
      ? "Plan Empresarial ($45/mes)"
      : planRecomendado === "emprendedor"
        ? "Plan Emprendedor ($25/mes)"
        : "Plan Agenda ($14.99/mes)"

  const routeLabel = getRouteLabel(route)

  let summary = ""

  if (prospect?.nombreNegocio) {
    summary += `Cliente: ${prospect.nombreNegocio}\n`
  }
  if (prospect?.categoria) {
    summary += `Tipo de negocio: ${prospect.categoria}\n`
  }
  summary += `Ruta de venta: ${routeLabel}\n`
  summary += `Plan recomendado: ${planLabel}\n\n`

  if (problemas.length > 0) {
    summary += "Problemas detectados:\n" + problemas.map((p) => "  - " + p).join("\n") + "\n\n"
  }
  if (dolores.length > 0) {
    summary += "Dolores principales:\n" + dolores.map((d) => "  - " + d).join("\n") + "\n\n"
  }
  if (motivaciones.length > 0) {
    summary += "Motivacion:\n" + motivaciones.map((m) => "  - " + m).join("\n") + "\n\n"
  }

  const cierreAnswer = answers.find(
    (a) => a.question.texto.includes("resolveria un problema importante") ||
           a.question.texto.includes("ayudaria a vender mas") ||
           a.question.texto.includes("mejoraria su proceso") ||
           a.question.texto.includes("mas comodo para ellos")
  )
  if (cierreAnswer) {
    if (cierreAnswer.valor === "Si") {
      summary += "Nivel de interes: Alto\n"
      summary += "Proxima accion: Programar demostracion\n"
    } else if (cierreAnswer.valor === "Quiero verlo" || cierreAnswer.valor === "Necesito pensarlo") {
      summary += "Nivel de interes: Medio\n"
      summary += "Proxima accion: Enviar informacion y hacer seguimiento\n"
    } else {
      summary += "Nivel de interes: Bajo\n"
      summary += "Proxima accion: Hacer seguimiento en 1 semana\n"
    }
  }

  const fechaSeg = new Date()
  fechaSeg.setDate(fechaSeg.getDate() + 7)
  summary += `Fecha de seguimiento: ${fechaSeg.toLocaleDateString("es-VE")}`

  return summary
}

export function getOpportunityDescription(score: number): string {
  if (score >= 121) return "Cliente prioritario — Necesidad urgente de solucion"
  if (score >= 71) return "Alta oportunidad — Multiples necesidades detectadas"
  if (score >= 31) return "Oportunidad media — Necesidades basicas de organizacion"
  return "Baja oportunidad — Poco potencial de venta"
}

export function getDemoSteps(route: string | null | undefined): string[] {
  if (!route) return []
  const demo = DEMO_STEPS[route]
  return demo ? demo.pasos : []
}

export function getDemoTitle(route: string | null | undefined): string {
  if (!route) return "Demostracion"
  const demo = DEMO_STEPS[route]
  return demo ? demo.titulo : "Demostracion"
}

export function mapTemperatureToStatus(temperatura: string): string {
  switch (temperatura) {
    case "muy_caliente":
      return "interesado"
    case "caliente":
      return "interesado"
    case "tibio":
      return "visitado"
    default:
      return "visitado"
  }
}
