# PANITAS NEGOCIOS — Capacidades del Agente IA por Plan

> Fecha: 02/08/2026 · Rama: `develop-v2` · FASE 1D
> Matriz de capacidades de IA para **PANITAS NEGOCIOS** y **PANITAS NEGOCIOS PLUS**.

---

## 1. Reglas del agente IA (aplica a ambos planes)

1. El agente **responde con datos reales** del negocio (nunca inventa números).
2. El agente **sugiere, no ejecuta**: toda escritura requiere confirmación del dueño.
3. Toda acción del agente queda **auditada** (infraestructura `agentAudit` de FASE 1C).
4. El consumo de IA es **medible y limitado** por plan (costo controlado).
5. El rol del usuario define qué puede ver/ejecutar (permisos de FASE 1C).

---

## 2. PLAN PANITAS NEGOCIOS — Agente IA básico (consulta + operación)

### 2.1 Consultas de negocio (lectura)
- "¿Cuánto vendí hoy / esta semana / este mes?"
- "¿Cuál es mi producto más vendido?"
- "¿Cuánto inventario tengo de X?"
- "¿Qué productos tengo con poco stock?"
- "¿Cuántos clientes nuevos tuve este mes?"

### 2.2 Análisis básico
- Resumen del día (ventas, productos, clientes).
- Comparación simple: hoy vs ayer, esta semana vs la anterior.
- Productos que más y menos se venden.
- Ganancias (precio − costo) en un período.

### 2.3 Operación asistida (con confirmación)
- Crear producto.
- Ajustar stock.
- Agendar cita.
- Registrar cliente.

### 2.4 Lo que NO hace el plan base
- No lee conversaciones (no hay centro de comunicación).
- No sugiere respuestas a clientes.
- No detecta intención de compra.
- No recomienda seguimiento comercial.

---

## 3. PLAN PANITAS NEGOCIOS PLUS — Agente comercial (copiloto)

Agrega todo lo del plan base, más:

### 3.1 Análisis de conversaciones
- Lee la bandeja unificada (WhatsApp / Instagram / Messenger).
- Resumen de conversaciones del día.
- Identifica conversaciones sin responder y las prioriza.

### 3.2 Sugerencias de respuesta
- Ante un mensaje del cliente, el agente propone una redacción lista para enviar.
- El dueño decide enviar, editar o descartar. **Nunca envía automáticamente.**

**Ejemplo (del brief):**
> Cliente: "¿Tienen disponible la camisa negra?"
> Panitas recomienda: *"Hola Juan 👋 Sí tenemos disponibilidad en tallas M y L. ¿Quieres que te reserve una?"*

### 3.3 Detección de intención del cliente
Clasifica cada conversación:
| Intención | Ejemplo |
|---|---|
| Compra | "¿cuánto cuesta?", "¿tienen en azul?" |
| Precio / disponibilidad | "¿está disponible X?" |
| Reclamo | "el pedido no llegó" |
| Seguimiento | "¿en qué va mi pedido?" |
| Informativa | "¿dónde están ubicados?" |

### 3.4 Detección de oportunidades de venta
- Marca clientes con intención de compra que **aún no compraron**.
- Lista: "clientes interesados" con el producto mencionado y la fecha.

### 3.5 Recomendación de acciones comerciales
- Sugerencias de seguimiento:
  - "Juan preguntó por la camisa negra hace 2 días. ¿Le recuerdas disponibilidad?"
  - "María dejó un carrito sin pagar en tu tienda. ¿Quieres contactarla?"
  - "Este cliente compra cada mes. Sugiere avisarle de la nueva colección."
- Sugerencias de reabastecimiento basadas en ventas:
  - "La abrazadera AB12 se vende 4 veces/semana y quedan 5. Considera reabastecer."

### 3.6 Reportes comerciales PLUS
- Conversaciones atendidas vs. pendientes.
- Clientes interesados detectados y convertidos.
- Respuestas sugeridas que se enviaron (conversión de seguimiento).

---

## 4. Resumen comparativo de capacidades IA

| Capacidad | NEGOCIOS | NEGOCIOS PLUS |
|---|---|---|
| Consultar ventas | ✅ | ✅ |
| Consultar inventario / stock | ✅ | ✅ |
| Analizar productos (top/colas) | ✅ | ✅ |
| Responder preguntas del dueño | ✅ | ✅ |
| Resumen del día / semana | ✅ | ✅ |
| Operación asistida con confirmación | ✅ | ✅ |
| Leer conversaciones (bandeja) | ❌ | ✅ |
| Sugerir respuestas a clientes | ❌ | ✅ |
| Detectar intención del cliente | ❌ | ✅ |
| Detectar clientes interesados | ❌ | ✅ |
| Recomendar acciones comerciales | ❌ | ✅ |
| Sugerir reabastecimiento por ventas | ❌ (solo alerta) | ✅ |

---

## 5. Límites de consumo (a validar en FASE 2)

| Recurso | NEGOCIOS | NEGOCIOS PLUS |
|---|---|---|
| Consultas IA / mes | 100 | 500 |
| Mensajes sugeridos / mes | — | 300 |
| Análisis de intención / mes | — | 300 |
| Bandejas conectadas | — | 3 canales |

> Números **propuesta inicial**; se calibrarán con el costo real de LLM (ver PHASE_1D_REPORT §8).
