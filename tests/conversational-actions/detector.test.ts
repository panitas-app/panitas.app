import { describe, expect, it } from "vitest"
import { detectAction } from "@/lib/conversational-actions/detector"
import { getAction, ACTION_CATALOG } from "@/lib/conversational-actions/catalog"

const catalog = ACTION_CATALOG

describe("detectAction", () => {
  it("detecta creación de producto", () => {
    const res = detectAction(catalog, "quiero crear un producto")
    expect(res?.action.id).toBe("crear_producto")
  })

  it("detecta venta", () => {
    const res = detectAction(catalog, "vendo 2 cocacolas")
    expect(res?.action.id).toBe("registrar_venta")
  })

  it("detecta gasto", () => {
    const res = detectAction(catalog, "registra un gasto de transporte")
    expect(res?.action.id).toBe("registrar_gasto")
  })

  it("detecta compra a proveedor", () => {
    const res = detectAction(catalog, "le compre a mercantil 10 unidades")
    expect(res?.action.id).toBe("registrar_compra_proveedor")
  })

  it("detecta cambiar precio", () => {
    const res = detectAction(catalog, "cambia el precio de la cocacola")
    expect(res?.action.id).toBe("cambiar_precio")
  })

  it("detecta eliminar producto", () => {
    const res = detectAction(catalog, "elimina el producto cocacola")
    expect(res?.action.id).toBe("eliminar_producto")
  })

  it("detecta consulta de gastos", () => {
    const res = detectAction(catalog, "cuanto gaste este mes")
    expect(res?.action.id).toBe("consultar_gastos")
  })

  it("detecta resumen del negocio", () => {
    const res = detectAction(catalog, "como va el negocio")
    expect(res?.action.id).toBe("resumen_negocio")
  })

  it("detecta salud financiera", () => {
    const res = detectAction(catalog, "como esta mi salud financiera")
    expect(res?.action.id).toBe("salud_financiera")
  })

  it("detecta que revisar hoy", () => {
    const res = detectAction(catalog, "que deberia revisar hoy")
    expect(res?.action.id).toBe("que_revisar_hoy")
  })

  it("detecta por cobrar vs por pagar", () => {
    const res = detectAction(catalog, "tengo mas por cobrar que por pagar")
    expect(res?.action.id).toBe("por_cobrar_vs_pagar")
  })

  it("detecta principales gastos", () => {
    const res = detectAction(catalog, "en que gasto mas dinero")
    expect(res?.action.id).toBe("principales_gastos")
  })

  it("detecta clientes con mayor deuda", () => {
    const res = detectAction(catalog, "cuales clientes me deben")
    expect(res?.action.id).toBe("clientes_mayor_deuda")
  })

  it("detecta proveedores a pagar primero", () => {
    const res = detectAction(catalog, "a quien pagar primero")
    expect(res?.action.id).toBe("proveedores_pagar_primero")
  })

  it("no detecta un saludo", () => {
    const res = detectAction(catalog, "hola como estas")
    expect(res).toBeNull()
  })

  it("no detecta mensajes sin frases de acción", () => {
    const res = detectAction(catalog, "cuantos años tiene el local")
    expect(res).toBeNull()
  })

  it("da prioridad a la señal con frase completa", () => {
    const res = detectAction(catalog, "quiero fiarle a maria")
    expect(res?.action.id).toBe("registrar_credito")
  })

  it("la primera señal de cada acción es detectable", () => {
    for (const action of ACTION_CATALOG) {
      const res = detectAction(catalog, action.signals[0])
      expect(res).not.toBeNull()
    }
  })

  it("getAction devuelve la acción o undefined", () => {
    expect(getAction("registrar_venta")?.id).toBe("registrar_venta")
    expect(getAction("nope")).toBeUndefined()
  })
})
