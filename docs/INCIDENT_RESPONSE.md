# PANITAS — Respuesta ante Incidentes (FASE 8F)

> *Última actualización: 11/08/2026.*
> Objetivo: **detectar rápido, responder con pasos probados, comunicar y aprender**.
> Complementa a `docs/RUNBOOKS.md` (procedimientos paso a paso).

---

## 1. Severidades y SLAs objetivo

| Severidad | Definición | Tiempo de respuesta | Tiempo de recuperación |
|---|---|---|---|
| **SEV-1** | Servicio principal caído, pérdida de datos, brecha de seguridad | 15 min | 2 h |
| **SEV-2** | Degradación severa (checkout/tienda lento, BD casi agotada, cron crítico fallando) | 30 min | 8 h |
| **SEV-3** | Falla localizada no crítica (una integración opcional caída, error intermitente) | 4 h | 24 h |
| **SEV-4** | Incidencia menor / pregunta (métricas raras, logs ruidosos) | 1 día hábil | — |

> Estos SLAs asumen 1 persona en-call. Ajustar cuando haya equipo ampliado.

---

## 2. Roles

| Rol | Responsabilidad |
|---|---|
| **On-call primario** | Primera respuesta: confirmar, evaluar severidad, contener |
| **On-call secundario** | Soporte del primario; maneja incidentes paralelos |
| **Operador de deploy** | Rollbacks, migraciones, cambios de env en Vercel |
| **DBA (DB)**, **DBA (seguridad)** | Contención en caso de pérdida/brecha de datos |

---

## 3. Detección

Fuentes actuales:
- `GET /api/health/readiness` → `200` = listo, `503` = degradado. **Monitorear en
  un Uptime Monitor** (UptimeRobot/Statuspage/cloud) hacia `https://panitas.app/api/health/liveness` (cada 1 min).
- Dashboard de **Vercel** (deployments fallidos, errores de función, crons con status != 200).
- **Neon** (conexiones, réplicas, uso de storage).
- PostHog (caídas de eventos, picos de errores 5xx).

Recomendaciones para implementar tras 8F (automáticas):
- Alerta en liveness/readiness con timeout de 3 min.
- Alerta de **tasa de 5xx > 1%** (PostHog o Vercel Analytics).
- Alerta de **cron fallido** (status != 200 o timeout) — revisar logs de crons.
- Alerta de **conexiones de BD > 80%** del pool.
- Alerta de **nuevo secret en repo** (gitleaks en CI, ya incluido en `ci.yml`).

---

## 4. Runbooks por tipo de incidente

### 4.1 Deploy roto / build fallido (SEV-2)
1. Confirmar: `git log -1`, estado del CI, deploy de Vercel.
2. **Rollback inmediato**: Vercel → Deployments → Redeploy (versión previa estable).
3. Verificar readiness tras rollback.
4. Si el build falla localmente: `npm run build` reproduce el error → fix + PR.
5. Postmortem si afectó producción > 30 min.

### 4.2 BD degradada o sin conexión (SEV-1/SEV-2)
1. `readiness` → `503` (check `database: false`).
2. Ver dashboard de **Neon**: pico de conexiones, storage, réplicas.
3. No reiniciar a ciegas: revisar queries lentas / `EXPLAIN` de rutas calientes
   (checkout, inventario).
4. Reducir carga: considerar escalado de réplicas de lectura de Neon o rate limit
   temporal en checkout.
5. Si hay **corrupción/pérdida**: seguir `RUNBOOKS §4 Restore`.

### 4.3 Integración externa caída (WhatsApp/Meta/Resend/AI/Twilio) (SEV-3)
1. Confirmar en el provider si hay outage público.
2. La app debe seguir viva (calls con timeout; los fallos no bloquean flujos
   principales). Verificar readiness sigue en `200`.
3. Encolar/intentar de nuevo o comunicar degradación parcial si el negocio
   depende de esa integración (inbox de WhatsApp es crítico si hay soporte activo).
4. Reproducir tras recuperación del provider; validar webhooks (dashboard de Meta
   → envío de test).

### 4.4 Cron fallido (SEV-3)
1. Revisar logs del cron en Vercel (Dashboard → Cron → ver histórico).
2. Posibles causas: `CRON_SECRET` ausente/cambiado (respuesta `401/503`),
   timeout de función, error en la lógica.
3. Re-ejecutar manualmente el endpoint con `Authorization: Bearer $CRON_SECRET`.
4. Verificar el header de autorización de Vercel si se rotó `CRON_SECRET`
   (copiarlo a Vercel y al dashboard de Crons).

### 4.5 Sospecha de brecha de seguridad (SEV-1)
1. Congelar deploy y **rotar todos los secrets** (ver RUNBOOKS §5). Prioridad:
   `AUTH_SECRET`, `CRON_SECRET`, `SELLER_JWT_SECRET`, keys de plataforma/IA, tokens WhatsApp/Meta.
2. Revisar logs de acceso admin (`AuditLog`), keys de la Public API (`ApiKey`) y
   `_prisma_migrations` por anomalías.
3. Escanear el repo (gitleaks local) y el historial de Git.
4. Notificar a usuarios afectados si aplica (RGPD/LOPD de Venezuela/Colombia).
5. Postmortem completo obligatorio.

### 4.6 Pérdida/corrupción de datos (SEV-1)
1. Determinar alcance y la copia más reciente fiable (RPO objetivo: ≤ 24 h).
2. Restaurar en una BD de prueba primero (nunca directo a prod).
3. Restaurar en prod siguiendo `RUNBOOKS §4`, con ventana de mantenimiento.
4. Verificar paridad (conteos de tablas críticas) antes de habilitar tráfico.
5. Postmortem + ajuste de backups.

---

## 5. Comunicación

- **Status page**: crear una (Statuspage/Instatus/BetterStack) que publique
  `liveness` de panitas.app.
- **Canales**: Slack/Telegram interno para on-call; status page para clientes.
- Regla de comunicados:
  - SEV-1/SEV-2 → actualización cada 30–60 min mientras dure.
  - Lenguaje: "estamos investigando", "causa identificada", "aplicando fix",
    "resuelto — postmortem en N días".

---

## 6. Postmortem (template)

```
Título: [SEV-X] <resumen>
Fecha / duración / impacto (usuarios, funcionalidades, pérdida $)
Resumen
Cronología (detección → investigación → mitigación → resolución)
Causa raíz (5 porqués)
Qué funcionó / qué no funcionó
Acciones (checkbox): mitigación, prevención, seguimiento con responsables y fechas
Lecciones aprendidas
```

Regla: **sin culpa**. Objetivo: reducir la probabilidad de recurrencia y el MTTR.

---

## 7. Referencias

- Procedimientos operativos: `docs/RUNBOOKS.md`
- Checklist pre-lanzamiento: `docs/PRODUCTION_CHECKLIST.md`
- Stack y topología: `docs/PRODUCTION_ARCHITECTURE.md`
