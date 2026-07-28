import { DEMO_STEPS } from "./constants"

export function calculateTemperature(score: number): string {
  if (score >= 76) return "muy_caliente"
  if (score >= 51) return "caliente"
  if (score >= 26) return "tibio"
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
  return Math.min(100, total)
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
    case "emprendedor_presencial": return "Venta presencial + POS"
    case "emprendedor_online": return "Venta fisica + Online"
    case "agenda_salud": return "Salud y profesionales medicos"
    case "agenda_belleza": return "Barberias, belleza y estetica"
    case "empresarial_default": return "Plan Empresarial"
    default: return route
  }
}

export function generateSummary(
  answers: Array<{ valor: string; question: { texto: string; tipo?: string } }>,
  planRecomendado: string,
  prospect?: { nombreNegocio?: string; categoria?: string } | null,
  route?: string | null
): string {
  const problemas: string[] = []
  const positivos: string[] = []

  for (const answer of answers) {
    const texto = answer.question.texto
    if (
      answer.valor === "No" ||
      answer.valor === "No registra" ||
      answer.valor === "No llevan control" ||
      answer.valor === "Memoria" ||
      answer.valor === "No venden online" ||
      answer.valor === "No tienen catalogo" ||
      answer.valor === "Cuaderno" ||
      answer.valor === "Frecuentemente" ||
      answer.valor === "Algunas veces" ||
      answer.valor === "Llegan directamente" ||
      answer.valor === "Esperar respuesta" ||
      answer.valor === "Agenda fisica" ||
      answer.valor === "Poco"
    ) {
      problemas.push(`${texto.replace("?", "").trim()}: ${answer.valor}`)
    }
    if (
      answer.valor === "Si" ||
      answer.valor === "Mucho" ||
      answer.valor === "Muchas veces" ||
      answer.valor === "Siempre" ||
      answer.valor === "Sí siempre"
    ) {
      positivos.push(`${texto.replace("?", "").trim()}: ${answer.valor}`)
    }
    if (answer.question.tipo === "checklist" && answer.valor) {
      const items = answer.valor.split(",").map((s) => s.trim()).filter(Boolean)
      for (const item of items) {
        problemas.push(item)
      }
    }
  }

  const planLabel =
    planRecomendado === "empresarial"
      ? "Plan Empresarial ($45/mes)"
      : planRecomendado === "emprendedor"
        ? "Plan Emprendedor ($25/mes)"
        : "Plan Agenda ($15/mes)"

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
  if (positivos.length > 0) {
    summary += "Puntos positivos:\n" + positivos.map((p) => "  - " + p).join("\n") + "\n\n"
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
  } else {
    const quiereDemo = answers.find((a) => a.question.texto.toLowerCase().includes("demostracion"))
    if (quiereDemo?.valor === "Si") {
      summary += "Proxima accion: Programar demostracion\n"
    }
  }

  const cuandoImpl = answers.find((a) => a.question.texto.toLowerCase().includes("implementarla"))
  if (cuandoImpl) {
    summary += `Plazo: ${cuandoImpl.valor}\n`
  }

  const ahora = new Date()
  summary += `Fecha de seguimiento: ${ahora.toLocaleDateString("es-VE")}`

  return summary
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
