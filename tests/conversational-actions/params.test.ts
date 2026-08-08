import { describe, expect, it } from "vitest"
import {
  extractAmount,
  extractQuantity,
  extractSaleItems,
  extractDiscount,
  extractCredit,
  extractPhone,
  extractPeriod,
  extractPaymentMethod,
  extractAfter,
  extractTerm,
  extractProductRef,
  extractExpenseRef,
  extractOrderRef,
  extractKnownParams,
  missingParams,
  isShortAnswer,
  inferStockType,
} from "@/lib/conversational-actions/params"
import type { ConversationalAction } from "@/lib/conversational-actions/types"

describe("extractAmount", () => {
  it("extrae montos con 'de/por/en'", () => {
    expect(extractAmount("registra un gasto de 50 dolares")).toBe("50")
    expect(extractAmount("gaste por 100 bs")).toBe("100")
    expect(extractAmount("compre en 20")).toBe("20")
  })

  it("prefiere el monto tras 'por' sobre otros números", () => {
    expect(extractAmount("vendo 2 cocacolas por 10")).toBe("10")
  })
})

describe("extractQuantity", () => {
  it("extrae cantidades con o sin unidad", () => {
    expect(extractQuantity("5 unidades")).toBe("5")
    expect(extractQuantity("2 cocacolas")).toBe("2")
  })

  it("devuelve null sin números", () => {
    expect(extractQuantity("media docena de panes")).toBeNull()
  })
})

describe("extractSaleItems", () => {
  it("parsea items con cantidades", () => {
    expect(extractSaleItems("vendo 2 cocacolas y 3 panes")).toEqual([
      { producto: "cocacolas", cantidad: 2 },
      { producto: "panes", cantidad: 3 },
    ])
  })

  it("asume 1 unidad cuando el producto no lleva cantidad", () => {
    expect(extractSaleItems("quiero un refresco")).toEqual([{ producto: "refresco", cantidad: 1 }])
  })
})

describe("extractDiscount", () => {
  it("extrae porcentajes y montos", () => {
    expect(extractDiscount("con 10% de descuento")).toBe("10%")
    expect(extractDiscount("descuento de 5")).toBe("5")
  })
})

describe("extractCredit", () => {
  it("reconoce fiado, fiado a plazo y abonos", () => {
    expect(extractCredit("le fio a maria")).toBe("fiado")
    expect(extractCredit("le doy 15 dias")).toBe("cuotas_3_15d")
    expect(extractCredit("pago a plazos")).toBe("cuotas_3_15d")
  })
})

describe("extractPhone", () => {
  it("extrae teléfonos", () => {
    expect(extractPhone("con telefono 04125551234")).toBe("04125551234")
    expect(extractPhone("llama al +58 412 5551234")).toBe("+584125551234")
  })
})

describe("extractPeriod", () => {
  it("reconoce periodos", () => {
    expect(extractPeriod("cuanto vendi hoy")).toBe("hoy")
    expect(extractPeriod("la semana pasada")).toBe("semana_pasada")
    expect(extractPeriod("este mes")).toBe("este_mes")
    expect(extractPeriod("ayer")).toBe("ayer")
    expect(extractPeriod("del mes")).toBe("este_mes")
  })
})

describe("extractPaymentMethod", () => {
  it("reconoce métodos de pago", () => {
    expect(extractPaymentMethod("por efectivo")).toBe("cash")
    expect(extractPaymentMethod("con tarjeta")).toBe("card")
    expect(extractPaymentMethod("por transferencia")).toBe("bank_transfer")
    expect(extractPaymentMethod("con punto")).toBe("pos")
  })
})

describe("extractAfter", () => {
  it("captura texto después de un marcador", () => {
    expect(extractAfter("crea un cliente llamado maria", ["llamado", "nombrado"])).toBe("maria")
  })
})

describe("referencias a entidades", () => {
  it("extractProductRef quita el verbo y palabras de relleno", () => {
    expect(extractProductRef("elimina el producto cocacola")).toBe("cocacola")
    expect(extractProductRef("cambiar precio de la cocacola")).toBe("cocacola")
    expect(extractProductRef("buscar pan")).toBe("pan")
  })

  it("extractTerm captura el término de búsqueda", () => {
    expect(extractTerm("buscar cocacola")).toBe("cocacola")
    expect(extractTerm("muestra productos pan")).toBe("pan")
  })

  it("extractExpenseRef captura la referencia del gasto", () => {
    expect(extractExpenseRef("corrige el gasto de transporte")).toBe("transporte")
    expect(extractExpenseRef("editar el gasto luz")).toBe("luz")
  })

  it("extractOrderRef captura la referencia del pedido", () => {
    expect(extractOrderRef("cancela el pedido ORD-123")).toBe("ORD-123")
    expect(extractOrderRef("ver pedido #42")).toBe("42")
  })
})

describe("extractKnownParams", () => {
  it("extrae parámetros de una venta completa", () => {
    const known = extractKnownParams("vendo 2 cocacolas por 5 y 3 panes", "ventas")
    expect(known.items).toContain("cocacola")
    expect(known.items).toContain("panes")
    expect(known.metodo_pago).toBeUndefined()
  })

  it("extrae monto y método de pago en ventas", () => {
    const known = extractKnownParams("vendo 2 cocacolas por efectivo", "ventas")
    expect(known.metodo_pago).toBe("cash")
  })

  it("extrae cliente por marcador en clientes", () => {
    const known = extractKnownParams("busca un cliente llamado maria", "clientes")
    expect(known.termino).toBe("maria")
  })

  it("extrae categoría implícita en gastos", () => {
    const known = extractKnownParams("registra un gasto de transporte 5", "gastos")
    expect(known.categoria).toBe("transporte")
  })

  it("extrae vendor implícito en proveedores", () => {
    const known = extractKnownParams("compre a mercantil 100 dolares", "proveedores")
    expect(known.vendor).toBe("mercantil")
  })

  it("no extrae nada de un mensaje sin datos", () => {
    const known = extractKnownParams("hola", "ventas")
    expect(Object.keys(known).length).toBe(0)
  })
})

describe("missingParams", () => {
  const action = {
    id: "fake",
    label: "fake",
    domain: "inventario",
    signals: [],
    params: [
      { key: "nombre", label: "el nombre", prompt: "?" },
      { key: "precio", label: "el precio", prompt: "?" },
      { key: "descripcion", label: "la descripción", prompt: "?" },
    ],
    required: ["nombre", "precio"],
    confirmation: "none",
  } as unknown as ConversationalAction

  it("lista los parámetros requeridos que faltan", () => {
    expect(missingParams(action, {}).map((p) => p.key)).toEqual(["nombre", "precio"])
  })

  it("ignora los que ya están presentes", () => {
    expect(missingParams(action, { nombre: "pan", descripcion: "rico" }).map((p) => p.key)).toEqual(["precio"])
  })
})

describe("isShortAnswer", () => {
  it("reconoce respuestas cortas", () => {
    expect(isShortAnswer("pan")).toBe(true)
    expect(isShortAnswer("a maria")).toBe(true)
    expect(isShortAnswer("5551234")).toBe(true)
  })

  it("rechaza comandos y saludos", () => {
    expect(isShortAnswer("crear producto")).toBe(false)
    expect(isShortAnswer("hola")).toBe(false)
    expect(isShortAnswer("cuanto vendi hoy")).toBe(false)
  })
})

describe("inferStockType", () => {
  it("infiere increase/decrease/adjustment", () => {
    expect(inferStockType("aumentar stock")).toBe("increase")
    expect(inferStockType("bajar stock")).toBe("decrease")
    expect(inferStockType("ajustar stock")).toBe("adjustment")
  })
})
