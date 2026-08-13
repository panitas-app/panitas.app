# PRODUCTION_COST_MODEL.md — Modelo de Costos

**Fase 10A · FASE 62 · Fecha: 2026-08-13 · Branch: `develop-v2`**

Modelo de costos de producción. Regla 10A: **no se inventan números**; los valores no verificables se marcan `NOT DEFINED`. Este documento estructura el modelo y qué medir.

---

## 1. Ingresos — planes de producto (verificados en código)

| Plan | Precio mensual | Anual | Pago en 2 cuotas | Modalidad |
|---|---|---|---|---|
| agenda | $14.99 | $149.90 | $17.98 / $8.99 | Agenda |
| comercio (Emprendedor) | $19.99 | $199.90 | NOT DEFINED | Tienda |
| mayorista (Mayorista) | $49.99 | $499.90 | NOT DEFINED | Tienda + B2B |

Fuente: `src/lib/plans.ts` (PLAN_DEFINITIONS) y `permissions.ts:93-98`. El cobro es **manual** (comprobante + verificación admin — 9D `PAYMENT_SEND_REVIEW` PS-1..7 cerrado); no hay pasarela automática.

## 2. Costos de infraestructura

| Componente | Proveedor | Costo fijo | Costo variable | Estado |
|---|---|---|---|---|
| Hosting serverless | Vercel | `NOT DEFINED` (plan) | `NOT DEFINED` | **8 crons** en `vercel.json` → Vercel Hobby limita a 2 crons; implica plan Pro o superior ($20/mo aprox., NO VERIFICADO en billing) |
| Base de datos Postgres | Neon | `NOT DEFINED` (tier) | `NOT DEFINED` | PITR + pooling; tier real NO VERIFICADO |
| Email transaccional | Resend | `NOT DEFINED` | por email | Volumen NO DEFINIDO |
| WhatsApp/Instagram/Messenger | Meta Cloud API | 0 (API) | **por mensaje** (tarifa Meta) | Multi-tenant; costo crece con uso de inbox |
| SMS | Twilio | 0 | por SMS | `TWILIO_*` configurados; volumen NO DEFINIDO |
| Storage de archivos | Cloudinary | `NOT DEFINED` | por storage/transform | Uploads en carpetas por usuario |
| Analytics | PostHog | `NOT DEFINED` | eventos | posthog-js + posthog-node |
| Rate limiting | Upstash Redis | `NOT DEFINED` | requests | fallback a memoria integrado |
| IA (agente) | NVIDIA NIM / OpenRouter | **0 hoy** (modelos `:free`) | por token si se cambia a pago | Configurable vía env (`agent-core/config.ts`) |

## 3. Métricas a medir (para presupuestar, NO DEFINIDO hoy)

- `MRR` = Σ activos por plan (mismo cálculo que panel de administración).
- Costo mensual infra = Σ facturas de los proveedores (completar con datos de billing).
- **Email/mensaje por tenant** por mes (buscar en `EmailLog`, `InboxMessage`).
- **SMS por tenant** por mes.
- **Storage Cloudinary** (GB) y transforms.
- **Eventos PostHog** y requests de rate limiting.
- **Tokens de IA** por tarea (si se migra de modelos free a pago).

## 4. Apalancamientos de costos

- La IA está en modo free (NVIDIA NIM `:free` / OpenRouter `:free`). Migrar una tarea a pago solo requiere cambiar config/env (Model Router en `agent-core/config.ts`). **Sin costo hoy.**
- Upstash tiene fallback en memoria: si se desactiva Redis, el rate limiting degrada a memoria del proceso (no recomendable en prod multi-instancia, pero evita fallo).
- Vercel Pro cobra por instancias/banda; los jobs cron (8/día) son ligeros.

## 5. Recomendaciones

1. **Registrar los tiers de facturación reales** (Vercel, Neon, Resend, Cloudinary, PostHog, Upstash) en este documento antes del launch para tener el modelo completo.
2. **Dashboard de costos**: el MRR se deriva de `StoreSubscription`/`Negocio.plan*`; el costo variable (mensajes/emails/SMS/storage) requiere exportaciones de cada proveedor.
3. **Umbral de rentabilidad**: cuando MRR ≥ suma de costos fijos + variables. Calcular al tener los datos de §2/§3.
