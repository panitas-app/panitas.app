# FASE 1D — Reporte Final · Product Blueprint Panitas Negocios 2.0

> Fecha: 02/08/2026 · Rama: `develop-v2` · FASE 1D
> Especificación de producto completa para comenzar **FASE 2 (Desarrollo del Agente IA y evolución funcional)**.

---

## 1. Visión final del producto

**Panitas Negocios 2.0** es un **asistente inteligente** que ayuda a administrar, vender y hacer crecer el negocio de comercios que venden productos (tiendas de ropa, ferreterías, repuestos, bodegones, supermercados, tecnología, distribuidores).

Deja de ser "un software para administrar" y pasa a ser **"habla con tu negocio"**: el agente IA responde preguntas con datos reales, detecta oportunidades y sugiere acciones — **pero nunca decide por el dueño**.

La experiencia es un **centro de control**, no un ERP: 3 métricas, 1 alerta priorizada, 1 acción recomendada y un campo para preguntar al agente, siempre visible.

---

## 2. Planes definidos

| | PANITAS NEGOCIOS | PANITAS NEGOCIOS PLUS |
|---|---|---|
| Enfoque | Administrar y vender | Vender más con IA |
| Gestión empresarial | ✅ | ✅ |
| POS | ✅ | ✅ |
| CRM | ✅ | ✅ |
| Tienda online | ✅ (incluida) | ✅ |
| Reportes | ✅ | ✅ |
| Tickets/servicios | ✅ | ✅ |
| Agenda + escáner | ✅ | ✅ |
| Agente IA | Consultivo (ventas, inventario, productos) | Consultivo + comercial |
| Centro de comunicación | ❌ | ✅ (WhatsApp/IG/Messenger) |
| Sugerencias de respuesta IA | ❌ | ✅ (copiloto, nunca automático) |
| Detección de clientes interesados | ❌ | ✅ |

Precio propuesto (a validar): **$15/mes** y **$35/mes** (anuales con 2 meses gratis). Límites por plan propuestos en `PANITAS_NEGOCIOS_PLANS.md`.

---

## 3. Experiencia diseñada

- **Onboarding < 10 min** hacia el primer producto y primera venta; importación Excel/CSV como camino preferido; el agente hace 1 pregunta/día los primeros 3 días para conocer el negocio.
- **Dashboard centro de control**: saludo contextual, 3 tarjetas (ventas hoy, productos vendidos, clientes nuevos), alertas priorizadas (máx. 3), 1 acción recomendada inteligente, accesos rápidos y campo de agente siempre visible. Variante por rol (permisos FASE 1C).
- **User journey** con 6 momentos clave: datos importados, primera venta conectada, primera respuesta IA correcta, alerta proactiva, upgrade en el momento del dolor, resumen diario.

---

## 4. Módulos necesarios

| Módulo | Nuevo / Consolidar |
|---|---|
| Onboarding + selección de tipo de negocio | **Nuevo** |
| Importador de inventario (Excel/CSV) | **Nuevo** |
| Dashboard "centro de control" | Rediseño |
| Productos/categorías/variantes/código de barras | Consolidar (existe) |
| POS + caja + cierres | Consolidar (existe) |
| CRM + historial de compras | Consolidar (existe) |
| Tienda online SSR/SEO | Rediseñar (hoy `"use client"`) |
| Reportes base | Consolidar (`SalesService` listo) |
| Tickets / órdenes de trabajo | **Nuevo** |
| Agenda | Existe |
| Agente IA (chat + confirmación + auditoría) | **Nuevo** (sobre FASE 1C) |
| Centro de comunicación (3 canales) | **Nuevo** (PLUS) |
| Copiloto IA comercial | **Nuevo** (PLUS) |

---

## 5. Funciones IA (por plan)

**NEGOCIOS (IA consultiva):** consultar ventas, consultar inventario/stock, analizar productos, responder preguntas del dueño, resumen del día, operación asistida con confirmación, límite de 100 consultas/mes.

**NEGOCIOS PLUS (IA comercial):** todo lo anterior + leer bandeja de conversaciones, sugerir respuestas (copiloto), detectar intención del cliente (compra/precio/reclamo/seguimiento), detectar clientes interesados sin conversión, recomendar seguimiento y reabastecimiento por ventas, 500 consultas + 300 sugerencias/mes.

**Regla transversal:** el agente **sugiere, nunca envía ni decide automáticamente**. Toda acción de escritura requiere confirmación y queda auditada.

---

## 6. Decisiones tomadas

1. **Dos planes únicos** (`negocios` / `negocios_plus`) reemplazan a todos los planes actuales; la migración de `planType`/`modalidad` es parte de FASE 2.
2. **Tienda online incluida en el plan base** — ventaja competitiva y motor de adquisición.
3. **IA consultiva dentro del plan base** — es valor central, no add-on.
4. **IA comercial = motivo del PLUS** — el upgrade se vende por "vender más", no por "más módulos".
5. **Copiloto nunca automático** — no hay bot que responda solo; el dueño decide.
6. **Tickets conviven con el POS** — el ticket cobrado genera la venta en POS y descuenta inventario solo al cobrar.
7. **Dashboard de 3 métricas + 1 alerta + 1 acción** — nada de ERP.
8. **Onboarding con importación como camino preferido** — el "WOW" es ver sus datos en pantalla.
9. **El agente se construye sobre la infraestructura FASE 1C** (tools, permisos, eventos, memoria, auditoría) — no desde cero.
10. **Los límites de consumo IA se controlan en backend**, no solo en UI.

---

## 7. Preguntas pendientes (requieren decisión de negocio)

| # | Pregunta | Impacto |
|---|---|---|
| P1 | ¿Precio final de ambos planes? (propuesta: $15/$35; anual con 2 meses gratis) | Facturación, posicionamiento |
| P2 | ¿Qué pasarela de pago para suscripciones? (hoy: comprobante manual) | Cobro recurrente, #8 del checklist |
| P3 | ¿La tienda online del MVP acepta pagos online o solo pedido + confirmación? | Alcance de tienda |
| P4 | ¿Qué canales de mensajería se integran primero en PLUS (WhatsApp Business API requiere aprobación/plan comercial)? | Alcance PLUS |
| P5 | ¿Los límites por plan (200 productos, 500 consultas, etc.) son correctos para el mercado local? | Costo IA, percepción de valor |
| P6 | ¿En qué países se lanza (Venezuela/LATAM) y cómo afecta impuestos/IVA a los planes? | Precios, facturación |
| P7 | ¿El plan base incluye tickets o es mejor restringirlo? (este blueprint lo incluye) | Alcance base |
| P8 | ¿Precio/costo por consulta IA aceptable por plan? | Margen del negocio |
| P9 | ¿Se requiere contabilidad/facturación fiscal (factura) en el MVP? | Alcance, regulatorio |
| P10 | ¿Multi-idioma es necesario para el lanzamiento? | Alcance |

---

## 8. Recomendaciones antes de desarrollo

1. **Resolver P1–P3 y P9 primero** — definen alcance del MVP y del cobro.
2. **Cerrar deuda técnica bloqueante del MVP**: CSRF en APIs mutantes y SSR para la tienda pública (sin esto la tienda no se indexa y el producto queda expuesto).
3. **Construir el agente IA sobre la infraestructura ya lista (FASE 1C)**: `listTools` + `executeTool` + `input_schema` como contrato; habilitar `agentAudit.enablePersistence()` y conectar `LongTermMemory` a un store real.
4. **Prototipar el onboarding antes de codificar el resto** — es la puerta de entrada y define el "WOW".
5. **Modelar el costo de IA por consulta** antes de fijar límites definitivos; usar el estimador de consumo propuesto.
6. **Diseñar el dashboard con el usuario Juan en mente**: 3 métricas, 1 alerta, 1 acción. Probar con 5 negocios reales antes de pulir el resto.
7. **Secuencia de desarrollo sugerida** (del backlog): deuda crítica → onboarding/planes → importador/catálogo → POS → reportes → tickets → agente básico → PLUS (comunicación + copiloto).

---

## 9. Documentos de la FASE 1D

| Doc | Contenido |
|---|---|
| `PANITAS_NEGOCIOS_VISION.md` | Propuesta de valor, perfil, casos de uso, principios |
| `PANITAS_NEGOCIOS_PLANS.md` | Planes NEGOCIOS / NEGOCIOS PLUS, límites, precios |
| `PANITAS_NEGOCIOS_ONBOARDING.md` | Flujo de registro a primera venta + datos para el agente |
| `PANITAS_NEGOCIOS_DASHBOARD.md` | Centro de control (estructura, bloques, variantes por rol) |
| `PANITAS_WORK_ORDERS.md` | Tickets / órdenes de trabajo y convivencia con POS |
| `PANITAS_AI_FEATURE_MATRIX.md` | Capacidades IA por plan + límites |
| `PANITAS_USER_JOURNEY.md` | Recorrido completo y momentos importantes |
| `PANITAS_2_DEVELOPMENT_BACKLOG.md` | MVP / mejoras / PLUS con prioridades y secuencia |
| `PANITAS_FEATURE_MATRIX.md` | Comparativa funcional de ambos planes |
| `PHASE_1D_REPORT.md` | Este reporte |

---

## 10. Reglas respetadas

- ✅ No se programó código.
- ✅ No se modificó funcionalidad existente.
- ✅ No se crearon pantallas ni componentes.
- ✅ No se integraron APIs.
- ✅ No se creó agente IA.
- ✅ Toda funcionalidad está documentada (nada asumido sin registro).
