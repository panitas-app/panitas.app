# Deuda UX del Core (FASE 9B)

> Deuda registrada durante la FASE 9B. No son bloqueantes; se resuelven en fases futuras (10, 11, 33, 34, 52…). Ninguna toca lógica de negocio.

---

## Funcional

| # | Deuda | Archivo | Fase sugerida |
|---|-------|---------|---------------|
| 1 | El home y el panel flotante comparten `useAssistantChat` y layout de historial, pero aún son dos componentes (`AnimatedAIChat` vs `AssistantChatView`). Unificar en una sola implementación con variantes. | `ui/animated-ai-chat.tsx`, `assistant/assistant-chat-view.tsx` | 11 |
| 2 | `Conversaciones` (`/dashboard/conversaciones`) es una página separada del historial lateral; no hay navegación bidireccional entre la página y el sidebar de historial del chat. | `app/dashboard/conversaciones` | 11 |
| 3 | El saludo contextual distingue "primera visita vs regreso" por `conversations.length`, pero no incorpora aún el conteo real de situaciones abiertas del Attention Center en el home. | `ui/animated-ai-chat.tsx` | 10/23 |
| 4 | `AssistantChatView` (panel flotante) no pasa `commands` al `ChatInput` (el home sí: `/ventas`, `/resumen`…). Unificar. | `assistant/assistant-chat-view.tsx` | 11 |
| 5 | La topbar no fue auditada/rediseñada (piloto BCV, CTA de plan, Compartir, QR). Decidir qué conservar sin perder funciones de negocio. | `layout/topbar.tsx` | 30 |

## Diseño / tokens

| # | Deuda | Archivo | Fase sugerida |
|---|-------|---------|---------------|
| 6 | Escanear el resto del dashboard (módulos) en busca de grays/azules legacy hardcodeados; migrar a tokens. | `src/app/dashboard/**`, `src/components/**` | 41 |
| 7 | La tienda pública (`app/[slug]`, marketing) aún usa azul `#0066FF` y glows legacy en secciones. Verificar si debe migrar (el DS 9A ancla el dashboard; decidir alcance público). | `app/[slug]`, `app/(marketing)` | 41 |
| 8 | `Dark mode` (`next-themes` instalado, no implementado). El DS 9A es light-only; la deuda crece si se añaden variantes oscuras a los tokens. | — | 42 |

## Calidad / a11y

| # | Deuda | Archivo | Fase sugerida |
|---|-------|---------|---------------|
| 9 | QA responsive + a11y formal de la nueva IA del sidebar (acordeón "Más módulos", colapsado en móvil, foco/ARIA del drawer). | `layout/sidebar.tsx`, `layout/immersive-chat-shell.tsx` | 33/34 |
| 10 | `useAttentionBadge` del sidebar es privado; el home podría reutilizarlo para el saludo contextual (ver #3). Extraer a `hooks/use-attention-count.ts`. | `layout/sidebar.tsx` | 10 |
| 11 | Los deep links de `QuickActions` con `href` no distinguen rol/plan al navegar (la ruta resuelve por middleware). Verificar redirección amigable si el rol no tiene acceso. | `assistant/actions/quick-actions.tsx` | 25 |
| 12 | Dos errores `EnvironmentTeardownError` (rpc pending) en `tests/services/inventory.service.test.ts` al cerrar vitest. Pre-existentes y ajenos a 9B, pero conviene investigarlos. | `tests/services/inventory.service.test.ts` | devops |

---

## Nota
FASE 9B NO eliminó dead code del dominio del agente (ej. duplicados en `lib/conversational` / `lib/assistant-behavior`). El `DEAD_CODE_REPORT.md` existente se mantiene como fuente de referencia para FASE 52.
