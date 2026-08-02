# PANITAS 2.0 — Roadmap

> Visión: convertir Panitas de un **SaaS de herramientas** en un **asistente empresarial con IA** que orquesta inventario, POS, tienda, agenda, clientes, ventas y reportes mediante un **agente**.

---

## Fase 0 — Preparación (ESTA FASE)

**Objetivo:** Base segura y documentada antes de tocar código.

- [x] Snapshot del estado actual (`PANITAS_CURRENT_STATE.md`)
- [x] Punto de restauración `v1.0-stable`
- [x] Rama `develop-v2`
- [x] Documentación inicial (`/docs`)
- [x] Reglas de desarrollo (`DEVELOPMENT_RULES.md`)

**Entregables de seguridad pendientes (bloqueantes para FASE 1):**
- [ ] Rotar y eliminar secretos versionados (`.env.production`, `dev.db`)
- [ ] Quitar token embebido de la URL del remote `origin`
- [ ] Configurar CI (build + lint + tests en cada PR)

---

## Fase 1 — Fundaciones de IA

**Objetivo:** Infraestructura de agente reutilizable, sin tocar funcionalidad existente.

- [ ] **Capa de agente** (`src/lib/agent/`): motor de agentes, contexto de negocio, memory store
- [ ] **Integración LLM**: abstraer `src/lib/ai.ts` a proveedores (OpenRouter + fallback), modelos con plan de costos
- [ ] **Tool registry**: herramientas del agente sobre los módulos actuales (inventario, ventas, agenda, clientes)
- [ ] **Sandbox de lectura** primero: el agente consulta datos reales sin permiso de escritura
- [ ] **Traza y auditoría**: registrar cada acción del agente (`AuditLog`/`AgentLog`)
- [ ] **Límites de costo y rate-limit** por usuario/plan

---

## Fase 2 — Asistente conversacional

**Objetivo:** El agente conversa con el dueño del negocio y ejecuta tareas de solo lectura + confirmación.

- [ ] Chat en el dashboard (comando `/agente`)
- [ ] Respuestas contextuales: "¿cuánto inventario de X me queda?", "¿cuánto vendí esta semana?"
- [ ] Resúmenes automáticos: ventas del día, stock bajo, citas de hoy
- [ ] Acciones con confirmación: "crear producto", "registrar gasto", "agendar cita"
- [ ] Notificaciones proactivas (cron + eventos de dominio)

---

## Fase 3 — Automatización inteligente

**Objetivo:** El agente ejecuta tareas programadas y reglas de negocio.

- [ ] Reescritura de crones estáticos a "tareas del agente"
- [ ] Reglas configurables: "si stock < 5, notificar y sugerir orden de compra"
- [ ] Reportería generada por IA (resúmenes semanales de negocio)
- [ ] Recomendaciones: precios, productos top, clientes inactivos

---

## Fase 4 — Escalamiento y producto

**Objetivo:** Robustez, costo controlado y diferenciación comercial.

- [ ] Multi-proveedor LLM con routing por costo/latencia
- [ ] Caché semántica de consultas repetidas
- [ ] Evaluación de calidad (evals) del agente
- [ ] Paquetes/planes con IA como feature premium
- [ ] Migración progresiva de módulos al patrón "tool + agente" sin romper v1

---

## Principios del roadmap

1. **Compatibilidad**: Panitas 1.0 sigue funcionando durante toda la transición.
2. **Incremental**: cada fase se entrega en `develop-v2` y se libera solo tras validación.
3. **Leer antes de escribir**: el agente primero consulta, después escribe bajo confirmación.
4. **Costo controlado**: toda llamada IA es medible, limitada y trazable.
5. **Sin hacks**: nada de IA en el core sin pasar por la capa de agente.
