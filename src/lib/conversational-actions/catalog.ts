/**
 * Catálogo de Acciones Conversacionales (FASE 5D).
 *
 * Define declarativamente qué puede hacer el asistente por lenguaje natural.
 * Cada acción describe sus parámetros (preguntas naturales), señales de
 * detección y nivel de confirmación. La ejecución se resuelve en `executor.ts`
 * mapeando cada acción a tools 3B existentes o a services 1B (nunca tools nuevas).
 */
import type { ConversationalAction } from "./types"

const PRODUCTO_PARAM = {
  key: "producto",
  label: "producto",
  prompt: "¿Sobre qué producto quieres hacerlo?",
}
const MONTO_PARAM = {
  key: "monto",
  label: "el monto",
  prompt: "¿Cuál fue el monto?",
}
const CATEGORIA_PARAM = {
  key: "categoria",
  label: "la categoría",
  prompt: "¿De qué categoría? (por ejemplo: transporte, alimentos, servicios, alquiler, otro)",
}
const FECHA_PARAM = {
  key: "fecha",
  label: "el período",
  prompt: "¿Para qué período? (hoy, ayer, este mes, semana pasada...)",
}

export const ACTION_CATALOG: ConversationalAction[] = [
  // ─── Inventario / Productos ───────────────────────────────────────────────
  {
    id: "crear_producto",
    label: "crear producto",
    domain: "inventario",
    signals: [
      "crear producto", "crea un producto", "crear un producto", "nuevo producto", "registrar producto",
      "registra un producto", "agregar producto", "agrega un producto", "anadir producto", "añadir producto",
      "crear articulo", "crea un articulo", "registrar articulo", "nuevo articulo",
    ],
    params: [
      { key: "nombre", label: "el nombre del producto", prompt: "¿Cómo se llama el producto?" },
      { key: "precio", label: "el precio", prompt: "¿Cuál es el precio del producto?" },
      { key: "stock", label: "el stock inicial", prompt: "¿Cuántas unidades tiene en stock?", optional: true },
      { key: "descripcion", label: "la descripción", prompt: "¿Tiene descripción?", optional: true },
      { key: "categoria", label: "la categoría", prompt: "¿De qué categoría es?", optional: true },
    ],
    required: ["nombre", "precio"],
    confirmation: "none",
  },
  {
    id: "editar_producto",
    label: "editar producto",
    domain: "inventario",
    signals: ["editar producto", "editar el producto", "modificar producto", "cambiar producto", "actualizar producto", "cambiar el producto"],
    params: [
      PRODUCTO_PARAM,
      { key: "nombre", label: "el nuevo nombre", prompt: "¿Cuál es el nuevo nombre?", optional: true },
      { key: "precio", label: "el nuevo precio", prompt: "¿Cuál es el nuevo precio?", optional: true },
      { key: "descripcion", label: "la nueva descripción", prompt: "¿Cuál es la nueva descripción?", optional: true },
    ],
    required: ["producto"],
    confirmation: "none",
  },
  {
    id: "cambiar_precio",
    label: "cambiar precio",
    domain: "inventario",
    signals: ["cambiar precio", "cambiar el precio", "cambia el precio", "cambia precio", "poner precio", "ponerle precio", "actualizar precio", "nuevo precio", "cambiar su precio", "cual es el precio"],
    params: [
      PRODUCTO_PARAM,
      { key: "precio", label: "el nuevo precio", prompt: "¿Cuál es el nuevo precio?" },
    ],
    required: ["producto", "precio"],
    confirmation: "critical",
    confirmDescription: "Cambiar el precio del producto",
    confirmImpact: "El precio de venta quedará actualizado en la tienda y en las próximas ventas.",
  },
  {
    id: "ajustar_stock",
    label: "ajustar stock",
    domain: "inventario",
    signals: ["cambiar stock", "ajustar stock", "actualizar stock", "modificar stock", "aumentar stock", "subir stock", "agregar stock", "reponer", "reponer stock", "reducir stock", "bajar stock", "quitar stock", "restar stock"],
    params: [
      PRODUCTO_PARAM,
      { key: "cantidad", label: "la cantidad", prompt: "¿Cuántas unidades quieres agregar o quitar?" },
      { key: "tipo", label: "el tipo de movimiento", prompt: "¿Es una entrada, una salida o un ajuste?", optional: true },
    ],
    required: ["producto", "cantidad"],
    confirmation: "critical",
    confirmationWhen: (known) => (known.tipo === "increase" ? "none" : "critical"),
    confirmDescription: "Ajustar el stock del producto",
    confirmImpact: "La cantidad disponible del producto cambiará. Este movimiento queda registrado en el inventario.",
  },
  {
    id: "eliminar_producto",
    label: "eliminar producto",
    domain: "inventario",
    signals: ["eliminar producto", "eliminar el producto", "elimina producto", "elimina el producto", "borrar producto", "borrar el producto", "borra producto", "borra el producto", "quitar producto", "quitar el producto", "eliminar articulo", "borrar articulo"],
    params: [PRODUCTO_PARAM],
    required: ["producto"],
    confirmation: "destructive",
    confirmDescription: "Eliminar el producto permanentemente",
    confirmImpact: "El producto dejará de estar disponible y no se podrá recuperar. El historial de ventas se conserva.",
  },
  {
    id: "buscar_producto",
    label: "buscar producto",
    domain: "inventario",
    signals: ["buscar producto", "busca producto", "dame el producto", "dame producto", "que productos", "listar productos", "listame productos", "muestrame productos"],
    params: [{ key: "termino", label: "el término de búsqueda", prompt: "¿Qué producto buscas?" }],
    required: ["termino"],
    confirmation: "none",
  },

  // ─── Ventas ───────────────────────────────────────────────────────────────
  {
    id: "registrar_venta",
    label: "registrar venta",
    domain: "ventas",
    signals: ["registrar venta", "registrar la venta", "registra una venta", "registra la venta", "vender", "vendo", "vendi", "venderle", "nueva venta", "hacer una venta", "venta de", "facturar", "una venta de"],
    params: [
      { key: "items", label: "los productos vendidos", prompt: "¿Qué producto(s) vendiste y cuántas unidades de cada uno?" },
      { key: "cliente", label: "el cliente", prompt: "¿A qué cliente?", optional: true },
      { key: "metodo_pago", label: "el método de pago", prompt: "¿Cómo se pagó? (efectivo, pago móvil, transferencia, tarjeta, crédito)", optional: true },
      { key: "descuento", label: "el descuento", prompt: "¿Aplicas algún descuento?", optional: true },
      { key: "credito", label: "el plazo de crédito", prompt: "¿A cuántas cuotas?", optional: true },
    ],
    required: ["items"],
    confirmation: "none",
  },
  {
    id: "ver_ventas",
    label: "ver ventas",
    domain: "ventas",
    signals: ["ver ventas", "cuanto vendi", "cuanto he vendido", "ventas de hoy", "ventas de la semana", "ventas del mes", "resumen de ventas", "como van las ventas", "cuantas ventas"],
    params: [FECHA_PARAM],
    required: [],
    confirmation: "none",
  },

  // ─── Clientes ─────────────────────────────────────────────────────────────
  {
    id: "crear_cliente",
    label: "crear cliente",
    domain: "clientes",
    signals: ["crear cliente", "crear un cliente", "crea un cliente", "nuevo cliente", "registrar cliente", "registrar un cliente", "registra un cliente", "agregar cliente", "agrega un cliente"],
    params: [
      { key: "telefono", label: "el teléfono", prompt: "¿Cuál es el teléfono del cliente?" },
      { key: "nombre", label: "el nombre", prompt: "¿Cómo se llama el cliente?", optional: true },
      { key: "email", label: "el email", prompt: "¿Tiene correo?", optional: true },
      { key: "direccion", label: "la dirección", prompt: "¿Cuál es la dirección?", optional: true },
    ],
    required: ["telefono"],
    confirmation: "none",
  },
  {
    id: "ver_historial_cliente",
    label: "ver historial de cliente",
    domain: "clientes",
    signals: ["historial de", "historial del cliente", "ver historial", "compras de", "cuanto ha comprado", "que ha comprado", "historial"],
    params: [{ key: "cliente", label: "el cliente", prompt: "¿De qué cliente quieres ver el historial?" }],
    required: ["cliente"],
    confirmation: "none",
  },
  {
    id: "buscar_cliente",
    label: "buscar cliente",
    domain: "clientes",
    signals: ["buscar cliente", "busca cliente", "que clientes", "listar clientes", "listame clientes", "buscar clientes", "dame el cliente"],
    params: [{ key: "termino", label: "el término de búsqueda", prompt: "¿Qué cliente buscas?" }],
    required: ["termino"],
    confirmation: "none",
  },
  {
    id: "registrar_credito",
    label: "registrar crédito",
    domain: "clientes",
    signals: ["fiar", "fiado", "a credito", "al fiado", "le voy a fiar", "credito", "fiarme", "vender a credito", "vendo a credito", "en cuotas"],
    params: [
      { key: "cliente", label: "el cliente", prompt: "¿A qué cliente le harás el crédito?" },
      { key: "items", label: "los productos", prompt: "¿Qué producto(s) lleva a crédito y cuántas unidades?" },
      { key: "credito", label: "el plazo", prompt: "¿En cuántas cuotas? (ejemplo: 3)", optional: true },
      { key: "monto", label: "el monto", prompt: "¿Cuál es el monto total?", optional: true },
    ],
    required: ["cliente", "items"],
    confirmation: "none",
  },

  // ─── Cobranza (FASE 6A) ────────────────────────────────────────────────────
  {
    id: "consultar_vencidos",
    label: "consultar créditos vencidos",
    domain: "cobranza",
    signals: [
      "creditos vencidos", "creditos atrasados", "quienes deben", "quien me debe", "cobranza", "morosos",
      "clientes que deben", "deudas vencidas", "cartera vencida", "que creditos estan vencidos", "deudores",
      "quien no ha pagado", "a quien le hace falta pagar",
    ],
    params: [],
    required: [],
    confirmation: "none",
  },
  {
    id: "quien_debe_mas",
    label: "quién debe más",
    domain: "cobranza",
    signals: [
      "quien debe mas", "quien me debe mas", "mayor deuda", "deuda mas alta", "el que mas debe",
      "cliente con mas deuda", "mayor saldo pendiente", "quien tiene mas saldo", "top deudores", "el mayor deudor",
    ],
    params: [],
    required: [],
    confirmation: "none",
  },
  {
    id: "proximos_vencimientos",
    label: "próximos vencimientos",
    domain: "cobranza",
    signals: [
      "proximos vencimientos", "que vence", "por vencer", "vence pronto", "cuotas por vencer",
      "vencimientos de esta semana", "vencimientos de la semana", "que vence esta semana", "cuotas proximas",
      "quien vence pronto", "que vence en los proximos dias",
    ],
    params: [],
    required: [],
    confirmation: "none",
  },
  {
    id: "total_pendiente",
    label: "total pendiente por cobrar",
    domain: "cobranza",
    signals: [
      "total pendiente", "cuanto me deben", "cuanto se me debe", "cuanto tengo por cobrar", "cartera",
      "total por cobrar", "cuanto debo cobrar", "saldo por cobrar", "pendiente por cobrar", "resumen de cobranza",
      "cuanto me deben los clientes", "estado de cuentas por cobrar",
    ],
    params: [],
    required: [],
    confirmation: "none",
  },
  {
    id: "registrar_abono",
    label: "registrar abono",
    domain: "cobranza",
    signals: [
      "registrar abono", "registra un abono", "registra abono", "cobrar cuota", "cobre una cuota", "cobre la cuota",
      "me pagaron", "el cliente pago", "pago de credito", "registrar pago de credito", "abonar", "abono a credito",
      "recibi un pago", "registrar pago de cuota", "pago cuota", "pagar la cuota",
    ],
    params: [
      { key: "cliente", label: "el cliente", prompt: "¿A qué cliente le registrarás el abono?" },
      { key: "monto", label: "el monto", prompt: "¿Cuánto abonó?" },
      { key: "metodo", label: "el método de pago", prompt: "¿Cómo pagó? (efectivo, transferencia, pago móvil, binance pay)", optional: true },
    ],
    required: ["cliente", "monto"],
    confirmation: "critical",
    confirmDescription: "Se registrará un abono por el monto indicado y se actualizará el saldo del crédito.",
    confirmImpact: "El abono quedará registrado como pago verificado y no se puede deshacer.",
  },

  // ─── Cobranza Inteligente (FASE 6B) ──────────────────────────────────────
  {
    id: "contactar_hoy",
    label: "quiénes contactar hoy",
    domain: "cobranza",
    signals: [
      "a quien contactar hoy", "quienes contactar hoy", "quien deberia contactar hoy", "a quien deberia contactar",
      "a quien cobrar hoy", "quienes cobrar hoy", "a quien contactar ahora", "contactos de cobranza de hoy",
      "a quien le recuerdo hoy", "quienes debo contactar", "recomendaciones de cobranza", "contactar clientes hoy",
      "que creditos contactar hoy", "a quien le hablo hoy por la deuda",
    ],
    params: [],
    required: [],
    confirmation: "none",
  },
  {
    id: "sin_recordatorio",
    label: "quién lleva más días sin recordatorio",
    domain: "cobranza",
    signals: [
      "quien lleva mas dias sin recordatorio", "quien no ha recibido recordatorio", "sin recordatorio",
      "a quien no le hemos escrito", "quien no ha sido contactado", "clientes sin contacto", "sin aviso de cobranza",
      "quien lleva mas dias sin aviso", "deudores sin recordatorio", "quien no ha recibido aviso",
    ],
    params: [],
    required: [],
    confirmation: "none",
  },
  {
    id: "creditos_dos_intentos",
    label: "créditos con dos intentos de cobranza",
    domain: "cobranza",
    signals: [
      "creditos con dos intentos", "dos intentos de cobranza", "dos avisos", "quien ya tiene dos avisos",
      "creditos con dos recordatorios", "segundo aviso enviado", "con dos intentos", "2 intentos de cobranza",
      "a quienes ya les enviamos dos avisos", "creditos con dos contactos",
    ],
    params: [],
    required: [],
    confirmation: "none",
  },
  {
    id: "preparar_aviso",
    label: "preparar recordatorio de cobranza",
    domain: "cobranza",
    signals: [
      "prepara el primer aviso", "prepara un aviso", "preparar aviso", "preparar recordatorio", "prepara el recordatorio",
      "preparar mensaje de cobranza", "prepara un recordatorio de pago", "dame el mensaje para cobrarle",
      "prepara el mensaje para", "preparar el aviso para", "listo el recordatorio para", "prepara aviso para",
    ],
    params: [
      { key: "cliente", label: "el cliente", prompt: "¿A qué cliente le preparas el recordatorio?" },
      {
        key: "tipo",
        label: "el tipo de aviso",
        prompt: "¿Qué tipo de aviso? (primer recordatorio, segundo recordatorio, último aviso, después de un abono, agradecimiento)",
        optional: true,
        validate: (value) => {
          const v = value.toLowerCase()
          const known = ["primer", "segundo", "ultimo", "último", "abono", "agradecimiento", "agradecer"]
          return known.some((k) => v.includes(k)) ? null : "Usa: primer recordatorio, segundo recordatorio, último aviso, después de un abono o agradecimiento."
        },
      },
    ],
    required: ["cliente"],
    confirmation: "none",
    confirmDescription: "Se preparará un mensaje de cobranza listo para revisar (no se enviará).",
  },

  // ─── Gastos ───────────────────────────────────────────────────────────────
  {
    id: "registrar_gasto",
    label: "registrar gasto",
    domain: "gastos",
    signals: ["registrar gasto", "registrar un gasto", "registra un gasto", "registra gasto", "anotar gasto", "anota un gasto", "agregar gasto", "agrega un gasto", "crear gasto", "gasto de", "nuevo gasto", "anotar un gasto"],
    params: [
      CATEGORIA_PARAM,
      MONTO_PARAM,
      { key: "descripcion", label: "la descripción", prompt: "¿Qué concepto fue el gasto?", optional: true },
      FECHA_PARAM,
      { key: "metodo_pago", label: "el método de pago", prompt: "¿Cómo se pagó?", optional: true },
      { key: "vendor", label: "el proveedor", prompt: "¿A qué proveedor?", optional: true },
    ],
    required: ["categoria", "monto"],
    confirmation: "none",
  },
  {
    id: "consultar_gastos",
    label: "consultar gastos",
    domain: "gastos",
    signals: ["ver gastos", "cuanto gaste", "cuanto he gastado", "gastos de", "resumen de gastos", "listar gastos", "listame gastos", "gastos del mes", "que gastos", "categoria de gastos"],
    params: [FECHA_PARAM, { key: "categoria", label: "la categoría", prompt: "¿De qué categoría?", optional: true }],
    required: [],
    confirmation: "none",
  },
  {
    id: "editar_gasto",
    label: "editar gasto",
    domain: "gastos",
    signals: ["editar gasto", "editar el gasto", "modificar gasto", "cambiar gasto", "actualizar gasto", "corregir gasto", "corregir el gasto", "corrige gasto", "corrige el gasto"],
    params: [
      { key: "gasto", label: "el gasto", prompt: "¿Cuál gasto quieres corregir? (describe el concepto)" },
      MONTO_PARAM,
      { key: "descripcion", label: "la descripción", prompt: "¿Cuál es la nueva descripción?", optional: true },
      CATEGORIA_PARAM,
    ],
    required: ["gasto"],
    confirmation: "none",
  },

  // ─── Proveedores (mapeado a gastos con vendor) ────────────────────────────
  {
    id: "registrar_compra_proveedor",
    label: "registrar compra a proveedor",
    domain: "proveedores",
    signals: ["compra a proveedor", "compra al proveedor", "compre a", "comprar a", "compras a", "registrar compra", "registra compra", "registrar una compra", "registra la compra", "compra de mercancia", "compra de mercaderia"],
    params: [
      { key: "vendor", label: "el proveedor", prompt: "¿A qué proveedor le compraste?" },
      MONTO_PARAM,
      { key: "descripcion", label: "la descripción", prompt: "¿Qué compraste?", optional: true },
      { key: "metodo_pago", label: "el método de pago", prompt: "¿Cómo se pagó?", optional: true },
      FECHA_PARAM,
    ],
    required: ["vendor", "monto"],
    confirmation: "none",
  },

  // ─── Proveedores / Cuentas por pagar (FASE 6C) ───────────────────────────
  {
    id: "deuda_total",
    label: "deuda total con proveedores",
    domain: "proveedores",
    signals: [
      "cuanto debo a proveedores", "deuda con proveedores", "deuda total", "cuanto le debo a los proveedores",
      "cuentas por pagar", "cuanto tengo que pagar", "total por pagar a proveedores", "saldo con proveedores",
      "cuanto debo a mis proveedores", "resumen de proveedores", "cuanto debo en total",
    ],
    params: [],
    required: [],
    confirmation: "none",
  },
  {
    id: "pagar_esta_semana",
    label: "pagos a proveedores que vencen esta semana",
    domain: "proveedores",
    signals: [
      "que pagar esta semana", "pagar esta semana", "pagos de esta semana", "cuanto pagar esta semana",
      "pagos que vencen esta semana", "que pagos vencen esta semana", "pagos proximos a proveedores",
      "que debo pagar esta semana", "pagos de proveedores esta semana", "vencimientos de proveedores esta semana",
    ],
    params: [],
    required: [],
    confirmation: "none",
  },
  {
    id: "registrar_pago_proveedor",
    label: "registrar pago a proveedor",
    domain: "proveedores",
    signals: [
      "registrar pago a proveedor", "registra un pago a proveedor", "registrar pago a un proveedor",
      "pagar al proveedor", "pagarle al proveedor", "pagarle a", "pague a", "le pague a",
      "registrar abono a proveedor", "abono a proveedor", "pago a un proveedor",
    ],
    params: [
      { key: "vendor", label: "el proveedor", prompt: "¿A qué proveedor le pagarás?" },
      MONTO_PARAM,
      { key: "metodo", label: "el método de pago", prompt: "¿Cómo pagó? (efectivo, transferencia, pago móvil, binance pay)", optional: true },
    ],
    required: ["vendor", "monto"],
    confirmation: "critical",
    confirmDescription: "Se registrará un pago al proveedor por el monto indicado",
    confirmImpact: "El pago se aplicará en cascada a las facturas más antiguas y el saldo del proveedor se actualizará.",
  },
  {
    id: "facturas_vencidas",
    label: "facturas vencidas de proveedores",
    domain: "proveedores",
    signals: [
      "facturas vencidas", "facturas atrasadas", "que facturas estan vencidas", "proveedores vencidos",
      "cuantas facturas vencidas", "deudas vencidas con proveedores", "facturas sin pagar",
      "facturas de proveedores vencidas", "facturas vencidas de proveedores", "facturas pendientes vencidas",
    ],
    params: [],
    required: [],
    confirmation: "none",
  },
  {
    id: "mayor_deuda",
    label: "proveedor con mayor deuda",
    domain: "proveedores",
    signals: [
      "proveedor con mayor deuda", "quien le debo mas", "a quien le debo mas", "mayor deuda con proveedor",
      "proveedor con mas saldo", "el proveedor que mas debo", "mayor saldo pendiente",
      "a cual proveedor le debo mas", "proveedor con mayor saldo", "quien es mi mayor acreedor",
    ],
    params: [],
    required: [],
    confirmation: "none",
  },

  // ─── Finanzas / Inteligencia financiera (FASE 6D) ─────────────────────────
  {
    id: "salud_financiera",
    label: "salud financiera del negocio",
    domain: "finanzas",
    signals: [
      "salud financiera", "como esta mi salud financiera", "salud de mis finanzas", "como estan mis finanzas",
      "como van mis finanzas", "como estoy financieramente", "panel financiero", "resumen financiero",
      "inteligencia financiera", "reporte financiero", "mis numeros financieros",
    ],
    params: [],
    required: [],
    confirmation: "none",
  },
  {
    id: "que_revisar_hoy",
    label: "qué revisar hoy en finanzas",
    domain: "finanzas",
    signals: [
      "que revisar hoy", "que deberia revisar hoy", "que reviso hoy", "en que fijarme hoy",
      "que tengo que revisar", "que revisar en finanzas", "alertas financieras", "problemas financieros",
      "que me recomiendas en finanzas", "donde tengo problemas de dinero",
    ],
    params: [],
    required: [],
    confirmation: "none",
  },
  {
    id: "por_cobrar_vs_pagar",
    label: "por cobrar frente a por pagar",
    domain: "finanzas",
    signals: [
      "mas por cobrar que por pagar", "por cobrar vs por pagar", "cuanto tengo por cobrar",
      "cuanto tengo por pagar", "que me deben vs que debo", "comparar por cobrar y por pagar",
      "cobros vs pagos", "cuanto me deben y cuanto debo", "balance entre cobrar y pagar",
    ],
    params: [],
    required: [],
    confirmation: "none",
  },
  {
    id: "principales_gastos",
    label: "principales gastos",
    domain: "finanzas",
    signals: [
      "principales gastos", "en que gasto mas", "donde gasto mas dinero", "mayores gastos",
      "categorias de gastos", "en que se va el dinero", "mis gastos mas altos", "gastos por categoria",
      "como gasto mi dinero",
    ],
    params: [],
    required: [],
    confirmation: "none",
  },
  {
    id: "clientes_mayor_deuda",
    label: "clientes con mayor deuda",
    domain: "finanzas",
    signals: [
      "clientes con mayor deuda", "clientes que mas me deben", "cuales clientes me deben",
      "top clientes deudores", "clientes con deuda pendiente", "quienes me deben mas dinero",
      "deudas de clientes pendientes",
    ],
    params: [],
    required: [],
    confirmation: "none",
  },
  {
    id: "proveedores_pagar_primero",
    label: "proveedores a pagar primero",
    domain: "finanzas",
    signals: [
      "proveedores a pagar primero", "a que proveedor pagar primero", "quien debo pagar primero",
      "proveedores prioritarios", "a quien pagar primero", "cual proveedor pagar primero",
      "proveedores con mas deuda",
    ],
    params: [],
    required: [],
    confirmation: "none",
  },

  // ─── Pedidos ──────────────────────────────────────────────────────────────
  {
    id: "ver_pedidos",
    label: "ver pedidos pendientes",
    domain: "pedidos",
    signals: ["pedidos pendientes", "ver pedidos", "que pedidos", "ordenes pendientes", "listar pedidos", "listame pedidos", "pedidos por atender", "cuantos pedidos", "pedidos sin atender"],
    params: [],
    required: [],
    confirmation: "none",
  },
  {
    id: "ver_pedido",
    label: "ver detalle de pedido",
    domain: "pedidos",
    signals: ["ver pedido", "detalle del pedido", "como va el pedido", "detalle de la orden", "ver la orden", "estado del pedido"],
    params: [{ key: "pedido", label: "el pedido", prompt: "¿Cuál es el número del pedido?" }],
    required: ["pedido"],
    confirmation: "none",
  },
  {
    id: "cancelar_pedido",
    label: "cancelar pedido",
    domain: "pedidos",
    signals: ["cancelar pedido", "cancelar el pedido", "cancela el pedido", "cancelar orden", "cancelar la orden", "cancela la orden", "anular pedido", "anular la orden"],
    params: [{ key: "pedido", label: "el pedido", prompt: "¿Cuál es el número del pedido a cancelar?" }],
    required: ["pedido"],
    confirmation: "destructive",
    confirmDescription: "Cancelar la venta o pedido",
    confirmImpact: "La orden quedará cancelada y el stock de los productos vendidos volverá a estar disponible.",
  },

  // ─── Reportes ─────────────────────────────────────────────────────────────
  {
    id: "reporte_ventas",
    label: "reporte de ventas",
    domain: "reportes",
    signals: ["reporte de ventas", "reporte ventas", "reporte de las ventas", "cierre de ventas", "ventas del mes", "reporte del mes", "resumen del mes", "cuanto vendi este mes", "ventas de hoy"],
    params: [FECHA_PARAM],
    required: [],
    confirmation: "none",
  },
  {
    id: "reporte_stock_bajo",
    label: "reporte de stock bajo",
    domain: "reportes",
    signals: ["stock bajo", "inventario bajo", "productos agotados", "sin stock", "agotados", "stock agotado", "productos sin stock", "existencias bajas", "que falta por reponer"],
    params: [],
    required: [],
    confirmation: "none",
  },
  {
    id: "reporte_clientes",
    label: "reporte de clientes",
    domain: "reportes",
    signals: ["clientes frecuentes", "mejores clientes", "top clientes", "reporte de clientes", "reporte clientes", "clientes mas frecuentes", "quien compra mas"],
    params: [],
    required: [],
    confirmation: "none",
  },
  {
    id: "reporte_productos",
    label: "reporte de productos",
    domain: "reportes",
    signals: ["mas vendidos", "productos mas vendidos", "top productos", "mas vendido", "lo mas vendido", "productos que mas se venden", "reporte de productos"],
    params: [],
    required: [],
    confirmation: "none",
  },
  {
    id: "resumen_negocio",
    label: "resumen del negocio",
    domain: "reportes",
    signals: ["resumen del negocio", "resumen de mi negocio", "como esta mi negocio", "como va mi negocio", "como va el negocio", "como esta el negocio", "como van las cosas", "indicadores", "salud del negocio", "que tal el negocio"],
    params: [],
    required: [],
    confirmation: "none",
  },
]

export function getAction(id: string): ConversationalAction | undefined {
  return ACTION_CATALOG.find((a) => a.id === id)
}
