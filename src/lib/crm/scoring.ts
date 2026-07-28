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

export function generateSummary(
  answers: Array<{ valor: string; question: { texto: string } }>,
  planRecomendado: string
): string {
  const problemas: string[] = []
  const positivos: string[] = []

  for (const answer of answers) {
    const texto = answer.question.texto
    if (
      answer.valor === "No" ||
      answer.valor === "No registra" ||
      answer.valor === "Mentalmente" ||
      answer.valor === "Cuaderno"
    ) {
      problemas.push(`${texto.replace("?", "").trim()}: ${answer.valor}`)
    }
    if (
      answer.valor === "Si" ||
      answer.valor === "Mucho" ||
      answer.valor === "Muchas veces"
    ) {
      positivos.push(`${texto.replace("?", "").trim()}: ${answer.valor}`)
    }
  }

  const planLabel =
    planRecomendado === "empresarial"
      ? "Plan Empresarial ($45/mes)"
      : planRecomendado === "emprendedor"
        ? "Plan Emprendedor ($25/mes)"
        : "Plan Agenda ($15/mes)"

  let summary = ""
  if (problemas.length > 0) {
    summary += "Problemas detectados:\n" + problemas.map((p) => "  - " + p).join("\n") + "\n\n"
  }
  if (positivos.length > 0) {
    summary += "Positivos:\n" + positivos.map((p) => "  - " + p).join("\n") + "\n\n"
  }
  summary += `Plan recomendado: ${planLabel}`

  const quiereDemo = answers.find((a) => a.question.texto.toLowerCase().includes("demostracion"))
  if (quiereDemo?.valor === "Si") {
    summary += "\nProxima accion: Programar demostracion"
  }

  const CuandoImpl = answers.find((a) => a.question.texto.toLowerCase().includes("implementarla"))
  if (CuandoImpl) {
    summary += `\nPlazo: ${CuandoImpl.valor}`
  }

  return summary
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
