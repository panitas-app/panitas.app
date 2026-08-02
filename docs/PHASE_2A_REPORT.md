# Reporte FASE 2A — Nueva Experiencia UX/UI Panitas Negocios 2.0

**Fecha:** 02/08/2026 · **Rama:** `develop-v2` · **Base:** `ec478e9` (FASE 1B+1C)

---

## 1. Resumen

La FASE 2A introdujo la primera capa de la **Nueva Experiencia UX/UI de Panitas Negocios** sobre el dashboard existente, sin tocar la lógica de negocio, sin crear el agente IA y sin conectar APIs externas. Todo lo implementado es **visual y no destructivo**: los 4 dashboards por `planType`, el flujo de planes (`/choose-plan`, `/subscribe`) y todos los módulos siguen funcionando.

## 2. Cambios implementados

### 2.1 Onboarding nuevo — `/onboarding/negocio`
- `src/app/onboarding/negocio/page.tsx` — página server que redirige a `/register` sin sesión y a `/dashboard` si el usuario ya tiene tienda.
- `src/components/onboarding/onboarding-wizard.tsx` — wizard cliente de 3 pasos:
  1. **Tipo de negocio**: tarjeta "Tienda que vende productos" activa + tarjeta "Servicios por cita" marcada *Próximamente*.
  2. **Información**: nombre, categoría, país, moneda, tipo de venta y estado del inventario.
  3. **Activación**: 4 opciones (importar inventario, crear productos, publicar tienda, explorar dashboard).
- La intención se persiste en `localStorage` (`panitas:onboarding:intent`) y el botón continuar dirige al flujo existente de `/choose-plan`. **No se cambió el schema** (persistencia real de campos nuevos → FASE 2B).
- `src/components/auth/register-content.tsx` — `getTargetUrl()` ahora envía a `/onboarding/negocio` a los registros **sin plan seleccionado**; los que vienen con `?plan=` conservan el flujo anterior (`/choose-plan` o `/subscribe`).

### 2.2 Dashboard centro de control
- `src/components/dashboard/control-center.tsx` — capa visual sobre todos los dashboards legacy: saludo contextual, 3 tarjetas de métricas (Ventas hoy con equivalente en Bs., Productos vendidos, Clientes nuevos), lista de alertas (máx. 3: stock bajo + pedidos pendientes), campo "Pregúntale a Panitas", accesos rápidos y una acción recomendada.
- `src/components/dashboard/metric-card.tsx` — tarjeta de métrica reutilizable con acentos por token.
- `src/components/dashboard/ask-panitas.tsx` — campo visual que abre el panel del asistente.
- `src/app/dashboard/page.tsx` — añade `getProductsSoldToday` (agregación de `OrderItem`), `getLowStockCount` (stock 0 < n ≤ 5, umbral del sistema) y `getPendingOrders`; envuelve cada dashboard legacy con `<ControlCenter>`.

### 2.3 Navegación nueva
- `src/components/dashboard/sidebar.tsx` — `getNavItems` reescrito con **secciones** (Principal / Operación / Clientes / Crecimiento / Panitas IA / Ajustes) manteniendo todas las rutas existentes. Nuevo ítem **Conversaciones** con badge "PLUS" cuando el plan es base. Detección de plan Plus vía `isPlusPlan()`.
- `src/components/dashboard/bottom-nav.tsx` — móvil: Inicio / Ventas (Caja) / Productos / Clientes / Más.
- `src/components/dashboard/topbar.tsx` — botón **Panitas IA** que abre el asistente.

### 2.4 Asistente IA (solo UI, sin IA)
- `src/components/assistant/assistant-provider.tsx` — contexto global (open/close/toggle).
- `src/components/assistant/assistant-panel.tsx` — panel lateral (Sheet) con bienvenida, sugerencias y respuestas simuladas ("disponible próximamente").
- `src/components/assistant/assistant-fab.tsx` — botón flotante sobre la bottom-nav móvil.
- `src/app/dashboard/layout.tsx` — envuelve el dashboard con `AssistantProvider` y renderiza FAB + panel.

### 2.5 Feature flags visuales
- `src/lib/feature-flags.ts` — planes `negocios` / `negocios_plus`, lista de features Plus (`conversaciones`, `asistente_ia`, `sugerencias_ia`, `intencion_cliente`, `clientes_interesados`, `recomendaciones_comerciales`), helpers `isPlusPlan()` / `canUseFeature()`.
- `src/components/ui/plan-badge.tsx` — badge "PLUS" / "Negocios" con el color de marca.
- `src/components/ui/feature-lock-card.tsx` — tarjeta de feature bloqueada con CTA de desbloqueo → `/pricing`.
- `src/app/dashboard/conversaciones/page.tsx` — módulo gated por plan: plan base ve `FeatureLockCard`; plan Plus ve placeholder "Próximamente".
- `src/app/globals.css` — se añadió el token `--brand: #FFB92E` (cambio mínimo; no se alteró ningún token existente).

## 3. Verificación

| Chequeo | Resultado |
|--------|-----------|
| `npm run typecheck` | ✅ Sin errores |
| `npm test` (vitest) | ✅ 65/65 tests pasan (11 archivos) |
| `npx eslint` (solo archivos tocados) | ✅ Sin errores nuevos (los 12 errores restantes son preexistentes en sidebar/topbar/page/layout, código que no se modificó) |
| `npm run build` | ✅ Compila y genera 212 rutas; `/dashboard/conversaciones` y `/onboarding/negocio` presentes. Único warning: preexistente en `bcv/fetcher.ts` (Edge Runtime) |

## 4. Problemas conocidos / pendientes para FASE 2B

- El **modo oscuro** sigue sin activarse (se decide ocultar/neutralizar el toggle; corregir con `<ThemeProvider>` + bloque `.dark` en 2B).
- **Persistencia real del onboarding**: los campos nuevos (`categoria`, `tipo de venta`, `cantidad de productos`, `¿tiene inventario?`) se recolectan en la UI pero no se persisten. Requiere mapeo de planes en 2B.
- **Consolidación de los 4 dashboards legacy** (tienda/agenda/negocio/empresa) en uno solo según el nuevo producto (2B).
- **Inconsistencia de marca**: quedan hardcodeados `#FFB92E` y doble amarillo (`--accent` vs `--brand`) en componentes legacy; unificar gradualmente.
- **Precios duplicados**: `plans.ts` vs `subscribe`; definición canónica de planes Negocios/Negocios Plus en 2B.
- El asistente es solo UI; las respuestas son simuladas. La integración real usará el framework de agente de FASE 1C (`src/lib/agent/`) en 2B.

## 5. Recomendaciones FASE 2B

1. Mapear planes `negocios`/`negocios_plus` → persistir onboarding (schema) y unificar pricing.
2. Consolidar dashboards legacy bajo el centro de control.
3. Activar modo oscuro correctamente (`next-themes` + bloque `.dark`).
4. Conectar el asistente al framework de agente (`src/lib/agent/`) con `SalesService`, `InventoryService` y eventos.
5. Implementar el módulo Conversaciones real (chat con clientes) para plan Plus.
