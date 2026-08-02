function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function hasAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w))
}

type Rule = { domain: string[]; action: string[]; tool: string }

const RULES: Rule[] = [
  {
    tool: "inventory.check_stock",
    domain: ["stock", "inventario", "existencia", "producto", "abrazadera", "sku"],
    action: ["cuanto", "cuanta", "cuantas", "cuantos", "disponible", "consult", "que hay", "ver", "tengo"],
  },
  {
    tool: "inventory.adjust_stock",
    domain: ["stock", "inventario", "existencia", "producto", "unidad", "articulo"],
    action: ["aument", "increment", "repon", "entrada", "disminu", "descont", "quitar", "ajust", "salida", "agreg"],
  },
  {
    tool: "inventory.movements",
    domain: ["movimiento", "historial", "entradas", "salidas"],
    action: ["stock", "inventario", "list", "ver", "consult", "mostrar"],
  },
  {
    tool: "product.list",
    domain: ["producto", "catalogo", "articulo", "inventario"],
    action: ["list", "ver", "mostrar", "cuales", "todos", "consulta"],
  },
  {
    tool: "product.get",
    domain: ["producto", "detalle", "ficha"],
    action: ["detalle", "informacion", "info", "ver"],
  },
  {
    tool: "product.create",
    domain: ["producto", "articulo"],
    action: ["crear", "registrar", "agregar", "nuevo", "nueva", "alta"],
  },
  {
    tool: "product.update",
    domain: ["producto", "articulo"],
    action: ["actualiz", "editar", "modific", "cambiar", "cambia"],
  },
  {
    tool: "sales.summary",
    domain: ["venta", "ingreso", "facturacion", "ganancia"],
    action: ["resumen", "total", "cifra", "cuanto", "cuanta"],
  },
  {
    tool: "sales.create_order",
    domain: ["venta", "factura", "pos", "punto de venta"],
    action: ["crear", "registr", "hacer", "nueva", "nuevo"],
  },
  {
    tool: "order.list",
    domain: ["pedido", "orden", "order"],
    action: ["list", "ver", "consult", "estado", "cuales", "todos"],
  },
  {
    tool: "order.create",
    domain: ["pedido", "orden"],
    action: ["crear", "registr", "hacer", "nuevo", "nueva"],
  },
  {
    tool: "customers.list",
    domain: ["cliente", "contacto"],
    action: ["list", "ver", "buscar", "consult", "cuantos", "cuantas"],
  },
  {
    tool: "customers.create",
    domain: ["cliente", "contacto"],
    action: ["registrar", "crear", "agregar", "nuevo", "nueva", "dar de alta"],
  },
  {
    tool: "agenda.create",
    domain: ["cita", "agenda", "agendar", "reservar", "turno"],
    action: ["crear", "agendar", "reservar", "nueva", "nuevo"],
  },
  {
    tool: "agenda.list",
    domain: ["cita", "agenda", "turno"],
    action: ["list", "ver", "consult", "hoy", "proxima", "proximo"],
  },
  {
    tool: "agenda.cancel",
    domain: ["cita", "agenda", "turno", "reserva"],
    action: ["cancelar", "anular", "eliminar"],
  },
  {
    tool: "report.today",
    domain: ["venta", "ingreso", "ganancia", "reporte"],
    action: ["hoy", "dia", "hoy mismo"],
  },
  {
    tool: "report.sales",
    domain: ["reporte", "resumen", "venta"],
    action: ["ventas", "periodo", "fecha", "semana", "mes", "rango"],
  },
]

export function routeAgentIntent(input: string): string | null {
  const text = normalize(input)
  for (const rule of RULES) {
    if (hasAny(text, rule.domain) && hasAny(text, rule.action)) return rule.tool
  }
  return null
}
