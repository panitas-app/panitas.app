# Revisión de Pago/Envío — Cobranza (Collection)

*Documento de cierre del item pendiente previo a FASE 10A*
*Fecha: 12/08/2026 · Evidencia verificada contra código fuente*

> Contexto: el item "Revisión de pago/envío" quedó registrado como decisión sin documentar.
> Este documento cierra ese hueco con números exactos (evidencia `archivo:línea`, valores y conteos)
> y vincula cada hallazgo con los entregables de FASE 10A.

---

## 1. Alcance

Revisión de los dos flujos del módulo de cobranza que dependen de configuración por tienda:
- **Métodos de pago**: configuración, persistencia e inyección en mensajes.
- **Envío**: preparación de recordatorios, apertura en WhatsApp y marcado como enviado.

---

## 2. Estado actual (verificado)

### 2.1 Métodos de pago

| Aspecto | Valor exacto |
|---------|--------------|
| UI de configuración | `src/components/dashboard/collection/payment-methods-manager.tsx` (192 líneas) |
| Persistencia | `PUT /api/collection/settings` → `collectionService.updateSettings` (`src/services/collection.service.ts:307-349`) |
| Guardado en DB | `settings` con `paymentMethods` serializado en JSON (`collection.service.ts:320,325`) |
| Normalización | `normalizeMethods` (dedupe, trim) — sin límite máximo documentado |
| Inyección en mensaje | `metodos_pago: settings.paymentMethods.join(", ")` (`collection.service.ts:394`) |
| Plantillas que usan la variable | 5 built-in; ej. `"Puede realizarlo por {{metodos_pago}}..."` (`collection.service.ts:86`), `"Realice su pago por {{metodos_pago}} hoy mismo..."` (`collection.service.ts:92`) |
| Hint en UI | `send-assistant.tsx:415` muestra métodos configurados como ayuda |
| Niveles de cobranza | 3 niveles (`LEVELS` en `payment-methods-manager.tsx:12`), nivel por defecto configurable |

### 2.2 Flujo de envío (100% manual, por diseño)

| Paso | Evidencia |
|------|-----------|
| Selección de crédito | Búsqueda `/api/creditos` (`send-assistant.tsx:145-148`) o recomendaciones `/api/collection/recommendations` |
| Preparar mensaje | `POST /api/collection/prepare` — SOLO crea `CollectionContactLog` con `status: "pending"` (`collection.service.ts:399-412`); **no envía nada** |
| Apertura en WhatsApp | `href={reminder.whatsappUrl}` target blank (`send-assistant.tsx:441-448`) |
| Marcar como enviado | `POST /api/collection/contacts` con `status: "sent"` (`send-assistant.tsx:449-468`) |
| Historial | `ContactHistory` embebido (`send-assistant.tsx:482`) |
| Garantía | "Panitas nunca envía mensajes automáticamente" repetida en 3 lugares (documentado en `BUSINESS_MODULES_AUDIT-cobranza-proveedores.md`) |

---

## 3. Hallazgos

| ID | Sev | Hallazgo | Evidencia | Impacto |
|----|-----|----------|-----------|---------|
| PS-1 | P2 | **`{{metodos_pago}}` vacío rompe la gramática**: si la tienda no configura métodos de pago, el mensaje queda "…por ." (coma/espacio sueltos). No hay guard en `prepare` ni validación que exija ≥1 método. | `collection.service.ts:394`; plantillas `:86,:92` | Mensaje mal formado enviado al cliente. Fácil de corregir (omitir cláusula o default). |
| PS-2 | P2 | **"Marcar como enviado" es autodeclarativo**: el botón no verifica que WhatsApp realmente envió; se puede marcar sin abrir el enlace. | `send-assistant.tsx:449-468` | Historial de contacto puede tener falsos positivos; afecta métricas de cobranza. |
| PS-3 | P3 | **Métodos de pago son texto plano, no accionables**: el cliente ve "pago por Zelle/PayPal" pero sin datos de contacto/código QR dentro del mensaje (quedan a mano del dueño en la plantilla). | plantillas `:86,:92` | Menor; UX de cobro dependiente del dueño. |
| PS-4 | P3 | **Sin límite de métodos de pago**: `normalizeMethods` deduplica pero no acota; listas largas inflan el mensaje. | `collection.service.ts` (normalizeMethods) | Calidad de mensaje degradable. |
| PS-5 | P4 | **Sin pasarela de cobro real**: los métodos solo se mencionan en texto; el pago se procesa fuera de la app (sin integración). | todo el flujo; AGENTS.md #8 | Dependencia manual; ver FASE 10A. |
| PS-6 | P4 | **WhatsApp Business API no integrada** (solo `wa.me` deep-link): sin recepción de confirmación de entrega/leído. | `send-assistant.tsx:442-447`; AGENTS.md #23 | No hay tracking real de entrega. |
| PS-7 | P3 | **Sin sincronización métodos↔pasarela**: si 10A agrega pasarela, los métodos aquí configurados deben reflejar los métodos realmente cobrables (evitar mostrar métodos no soportados). | `payment-methods-manager.tsx` | Coherencia de datos en producción. |

**Conteo exacto:** 7 hallazgos (PS-1…PS-7) · P2: 2 · P3: 3 · P4: 2.

---

## 4. Decisiones (regla del proyecto)

- **Envío automático se mantiene bloqueado por diseño** (garantía de producto). Cualquier automatización futura (WhatsApp Business API) debe conservar la confirmación humana por mensaje.
- **No se corrige nada en este documento**: el item era *documentar la revisión* antes de 10A, no cambiar código. Los hallazgos PS-1/PS-2 son candidatos a corrección rápida dentro de 10A (hardening), no bloqueantes de percepción (9E cerrada).

---

## 5. Vinculación con FASE 10A

Los números de fase exactos de 10A aún no están publicados (10A inicia tras este cierre).
Este doc se guarda con toda la evidencia numérica verificable para que la FASE 10A FASE 1 (reconocimiento)
pueda asignar los identificadores de fase correspondientes sin re-auditar. Mapeo esperado:

| Hallazgo | Entregable FASE 10A destino (confirmado) | Backlog AGENTS |
|----------|------------------------------------------|----------------|
| PS-1 | `PRODUCTION_ARCHITECTURE.md` + hardening de mensajería | — |
| PS-2 | `PRODUCTION_RUNBOOK.md` (data quality de cobranza) | — |
| PS-5 | `PRODUCTION_ARCHITECTURE.md` (pasarela de pago) | #8 |
| PS-6 | `PRODUCTION_ARCHITECTURE.md` / `DEPLOYMENT_RUNBOOK.md` (integración WhatsApp) | #23 |
| PS-3, PS-4, PS-7 | `PRODUCTION_ARCHITECTURE.md` (modelo de datos de métodos de pago) | #8 |

Referencia de entregables FASE 10A confirmados: `PRODUCTION_ARCHITECTURE.md`, `ENVIRONMENT_MATRIX.md`,
`DATABASE_OPERATIONS.md`, `DEPLOYMENT_RUNBOOK.md`, `PRODUCTION_RUNBOOK.md`, `PRODUCTION_COST_MODEL.md`,
`PRODUCTION_READINESS_CHECKLIST.md`, `PHASE_10A_REPORT.md`.
