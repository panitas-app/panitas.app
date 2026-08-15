# CUSTOMER ONBOARDING RUNBOOK — Panitas 2.0

*Documento operativo de FASE 11A — procedimiento probado en producción (panitas.app) con tenants de prueba A y B*
*Fecha: 2026-08-15*

## 1. Resumen

Runbook operativo para llevar a un cliente real desde el registro hasta operando con su tienda. Todos los pasos fueron validados en producción con flujo real de cliente durante este audit. El onboarding es **manual-assisted**: el cliente se registra solo, pero la activación del plan y la activación de la tienda pública requieren acción del operador (admin).

## 2. Flujo completo paso a paso

### Etapa 0 — Preparación del operador
- [ ] Crear cuenta admin de soporte (ver `npm run admin -- --setup` en `local-only.ts`).
- [ ] Tener a mano `ADMIN_SECRET` para activaciones manuales.
- [ ] Verificar disponibilidad de la tienda pública y el slug.

### Etapa 1 — Registro del cliente (self-service, ✅ verificado)
1. Cliente abre `https://panitas.app` → **Registrarse**.
2. Completa nombre, email, teléfono, contraseña y acepta términos (checkbox base-ui: clic directo del usuario funciona).
3. `POST /api/auth/register` crea: `User` + `Negocio` + `Store` + `StoreMember` + `Agenda` (verificado en BD).
4. Sesión iniciada automáticamente (cookie `__Secure-authjs.session-token`, httpOnly, secure en prod).
5. Cliente elige plan en `/choose-plan` y navega al dashboard.

### Etapa 2 — Onboarding (wizard) — ⚠️ OBSERVACIÓN
- El wizard de onboarding captura datos de negocio (tipo, giro, tamaño, etc.).
- **Hallazgo 11A-01**: el intent se guarda en localStorage (`panitas:onboarding:intent`) pero nunca se lee; los datos capturados en el paso de negocio se descartan y no se persisten.
- **Acción operador**: los datos de configuración reales deben pedirse al cliente (o registrarse vía SetupWizard si existiera) — el wizard no configura nada durable.

### Etapa 3 — Configuración real del negocio (✅ SetupWizard 4 pasos verificado)
1. Cliente va a **Dashboard → Configuración → Setup** y completa: negocio, tienda, datos de contacto.
2. Verificar en BD que `Negocio` y `Store` quedaron actualizados.
3. **IMPORTANTE**: sin esto, la tienda pública no tiene catálogo visible.

### Etapa 4 — Activación del plan (ACCION MANUAL DEL OPERADOR, ✅ verificado)
1. El cliente sube comprobante (o paga por el canal definido) — hoy es **manual** (comprobante + verificación admin, sin pasarela automática).
2. Operador: admin panel → usuario → **Activate plan** (`POST /api/admin/users/[id]/activate-plan` con `ADMIN_SECRET`).
3. Esto setea `Store.planStatus = "activo"` y `Negocio.planEstado = "activo"`.
4. **Resultado**: la tienda pública `[slug]` ahora muestra el catálogo (sin esto muestra el placeholder "Esta tienda está en proceso de activación").
5. Verificar: `GET /[slug]` → catálogo visible.

### Etapa 5 — Poblado inicial (✅ verificado en tenant A)
1. Productos: `POST /api/products` (múltiples; SKU/barcode opcionales; precio real tomado de BD al vender).
2. Proveedores: `POST /api/suppliers` + compras `POST /api/suppliers/[id]/purchases`.
3. Gastos: `POST /api/expenses`.
4. Stock inicial: `POST /api/products/stock` con `{type:"increase"}` (o al crear producto).
5. Clientes: se auto-crean al registrar ventas con `customerPhone`/`customerName` (NO hay POST `/api/customers`).

### Etapa 6 — Primeras ventas (✅ verificado)
- **POS**: dashboard → POS → carrito → cobrar. Payload UI real envía pagos con `status: "verified"` para efectivo (página POS page.tsx:354-362) → reportes exactos.
- **Crédito**: pagos iniciales (`downPayment`), instalaciones `cuotas_N_15d`, abonos vía `POST /api/creditos/[id]/payments`.
- **Online**: tienda pública → checkout (`POST /api/checkout`) crea orden + cliente.
- **Verificación reporte**: `GET /api/reports/daily` refleja los pagos `verified` correctamente.

### Etapa 7 — Verificación de aislamiento multi-tenant
- Cada tenant solo ve sus datos (verificado: 2 productos por tienda, sin fuga; GET cross-store → 403).
- El agente IA del dashboard usa el contexto del tenant logueado (aislado, verificado).

### Etapa 8 — Soporte post-onboarding
- **GAP (11A-13)**: el cliente NO tiene canal de soporte dentro de la app. El operador debe comunicar el canal externo (email/WhatsApp manual) hasta implementar tickets de cliente.

## 3. Checklist de verificación del operador tras el alta

| Check | Comando/Endpoint | Esperado |
|---|---|---|
| Registro creado | SQL: `SELECT id,name FROM "User" WHERE email=...` | 1 fila |
| Tenant creado | SQL: Negocio + Store + StoreMember + Agenda | 4 filas |
| Plan activado | SQL: `Store.planStatus` = `activo` | activo |
| Tienda pública catálogo | `GET /[slug]` | catálogo, NO placeholder |
| Aislamiento | Listar productos con 2 cuentas | datos propios |
| Reporte exacto | `GET /api/reports/daily` | suma de pagos verified |
| Crédito | `GET /api/creditos` | cuotas/estado correctos |

## 4. Tiempos y riesgos operativos

| Paso | Tiempo estimado | Riesgo |
|---|---|---|
| Registro self-service | 3-5 min | Bajo (11A-03 solo afecta automatización, no clic humano) |
| Wizard onboarding | 5 min | ⚠️ No persiste nada (11A-01) — puede confundir al cliente |
| Activación plan manual | 1-2 min | **Alto**: si el operador no activa, la tienda queda "en proceso de activación" indefinidamente (11A-06) |
| Poblado inicial | 30-60 min | Medio: manual, sin bulk import (no hay CSV/Excel, pendiente #11) |
| Primer reporte | — | Correcto con payload UI (reclasificado 11A-07) |

## 5. Notas del audit (FASE 8, 26-27)

- Registro por UI con Playwright: no automatizado por el checkbox base-ui (11A-03); el clic humano sí funciona.
- Movil: dashboard y tienda pública responsive OK.
- Los tenants de prueba A y B siguen existiendo en producción (PRUEBA-11A / PRUEBA-11B) — documentados para no confundirlos con datos reales.
