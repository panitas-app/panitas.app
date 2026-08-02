# PANITAS NEGOCIOS — Planes Comerciales

> Fecha: 02/08/2026 · Rama: `develop-v2` · FASE 1D
> Definición de los dos planes de **Panitas Negocios 2.0**.

---

## 1. Modelo de planes

Panitas Negocios ofrece **dos planes únicos** pensados para negocios que venden productos:

| Plan | Enfoque | Para quién |
|---|---|---|
| **PANITAS NEGOCIOS** | Administrar y vender | El negocio que necesita orden y una tienda en línea |
| **PANITAS NEGOCIOS PLUS** | Vender más con IA | El negocio que ya conversa con clientes y quiere crecer |

> Los planes comerciales antiguos (`free/basic/advanced/agenda/tienda/empresa/comercio/mayorista`...) se **reemplazan** por estos dos. La migración de datos y facturación se documentará en desarrollo (FASE 2).

---

## 2. PLAN PANITAS NEGOCIOS (base)

### 2.1 Gestión empresarial
- Inventario con stock en tiempo real.
- Productos con: nombre, descripción, categoría, variantes, código de barras, costo, precio y stock.
- Alertas de **stock bajo** (umbral configurable).
- Múltiples categorías.

### 2.2 POS (punto de venta)
- Ventas presenciales en caja.
- Caja con apertura/cierre y arqueo.
- Métodos de pago: efectivo, tarjeta, transferencia (configurables).
- Cierres de caja con historial.
- Historial completo de ventas.

### 2.3 CRM básico
- Ficha de clientes (nombre, teléfono, documento, correo).
- Historial de compras por cliente.
- Seguimiento básico (notas y estado del cliente).

### 2.4 Tienda online (incluida)
- Catálogo público (SSR para SEO).
- Productos conectados al inventario (stock compartido).
- Pedidos desde la tienda gestionados en Panitas.
- Sin pasarela de pago en el MVP (pedido + confirmación); pagos a definir (pendiente).

### 2.5 Reportes
- Ventas (hoy, semana, mes, rango).
- Productos más vendidos / menos vendidos.
- Ganancias (precio − costo).
- Clientes (nuevos, recompra).

### 2.6 Agente IA básico
- Responde preguntas del dueño con datos reales:
  - "¿cuánto vendí hoy/hace semana?"
  - "¿cuánto inventario tengo de X?"
  - "¿cuál es el producto que más se vende?"
- Resúmenes del día (ventas, stock bajo, clientes nuevos).
- **Solo lectura + acciones bajo confirmación** (crear producto, ajustar stock, agendar).

### 2.7 Incluye además
- Tickets / órdenes de trabajo (negocios que venden producto + servicio).
- Agenda (citas).
- Escáner de código de barras (móvil).

---

## 3. PLAN PANITAS NEGOCIOS PLUS

Incluye **todo lo del plan NEGOCIOS**, más:

### 3.1 Centro de comunicación
- **Bandeja unificada** de conversaciones desde WhatsApp, Instagram y Facebook Messenger dentro de Panitas.
- Cada mensaje indica la **fuente** (canal de origen) y el **cliente asociado**.
- El usuario **responde manualmente** desde Panitas (no hay bot automático).
- La conversación se vincula automáticamente a la ficha del cliente (historial de compras visible al lado).

### 3.2 IA como asistente comercial (copiloto)
- **Sugerir respuestas:** el agente propone una redacción al mensaje del cliente; el usuario decide enviar o editar.
- **Analizar intención del cliente:** compra, consulta de precio, disponibilidad, reclamo, seguimiento.
- **Detectar oportunidades de venta:** clientes que preguntaron disponibilidad/precio y aún no compran.
- **Recomendar seguimiento:** "Juan preguntó por la camisa negra hace 2 días → sugiere recordarle".

### 3.3 Reportes avanzados (resumen comercial)
- Conversaciones atendidas, pendientes y sin responder.
- Clientes interesados (intención de compra detectada).
- Tasa de seguimiento (clientes a los que se les dio seguimiento vs. que compraron).

> **Límite claro:** el agente PLUS **nunca envía mensajes automáticamente**. Solo sugiere y el dueño confirma.

---

## 4. Límites por plan (propuesta inicial, a validar)

| Límite | NEGOCIOS | NEGOCIOS PLUS |
|---|---|---|
| Productos | 200 | Ilimitado |
| Usuarios (miembros) | 2 | 5 |
| Cajas / POS | 1 | 3 |
| Canales de chat conectados | 0 | 3 (WhatsApp, Instagram, Messenger) |
| Conversaciones activas / mes | — | 500 |
| Mensajes sugeridos por IA / mes | — | 300 |
| Consultas IA / mes | 100 | 500 |
| Tickets | 20 activos | Ilimitado |

> Los números son una **propuesta de límite inicial** y se validarán con costos de LLM en FASE 2.

---

## 5. Precio (decisión pendiente — ver PHASE_1D_REPORT §8)

| Plan | Precio mensual (propuesta) | Precio anual (propuesta) |
|---|---|---|
| PANITAS NEGOCIOS | $15 / mes | $144 / año (2 meses gratis) |
| PANITAS NEGOCIOS PLUS | $35 / mes | $336 / año (2 meses gratis) |

> **PENDIENTE (decisión de negocio):** validar precios con el mercado local (Venezuela/LATAM) y el costo real por consulta IA. No se fija precio definitivo en esta fase.

---

## 6. Reglas transversales

1. **Tienda online incluida en el plan base** — es ventaja competitiva y motor de adquisición.
2. **IA de lectura gratis dentro del plan** — el agente base es parte del valor del plan, no un add-on.
3. **IA comercial es el motivo del PLUS** — el upgrade se justifica por "vender más", no por "más módulos".
4. **Todo límite se respeta en el backend** (no solo en UI) — reutiliza `PLAN_LIMITS` de la infraestructura actual.
5. **Límites se muestran al usuario antes de bloquear** — upsell con contexto ("llegaste a 200 productos; sube a PLUS").
6. **Los planes actuales del sistema se mapean a los nuevos** — `planType`/`modalidad` existentes se migran a `negocios` / `negocios_plus`.
