# PANITAS — Checklist de Producción (FASE 8F)

> *Última actualización: 11/08/2026.*
> Checklist operativo **pre-lanzamiento** y **post-deploy**. Marcar cada ítem con
> fecha + responsable. Los ítems `[x]` ya están verificados en 8F.

---

## 1. Reproducibilidad (desde el repo)

- [x] `git clone` + `npm ci` + `prisma generate` funcionan.
- [x] `npx prisma migrate deploy` sobre BD vacía crea el schema completo
      (**5 migraciones, 106 tablas** — validado 11/08/2026).
- [x] `.env.example` cubre los 58 nombres de variables detectados.
- [x] `SHADOW_DATABASE_URL` definida y distinta de `DATABASE_URL`.
- [ ] Documentar/congelar versión exacta de Node y npm en CI y Vercel (Node 22).

## 2. Datos y backups

- [x] Backup automático diario configurado en dev (`install-scheduled-backup.bat`).
- [x] Backup manual verificado (`npm run db:backup` → 533 KB, 11/08/2026).
- [x] Restore probado (98 tablas idénticas; paridad 10/10 tablas críticas).
- [x] Baseline de migraciones permite reconstruir el schema desde cero.
- [ ] **Neon**: activar PITR y definir retención (recomendado ≥ 7 días).
- [ ] **Prod**: backup periódico del dump fuera de la cuenta (S3/GCS cifrado), RPO ≤ 24 h.
- [ ] **Prod**: probar restore en una BD de prueba de Neon (dry-run trimestral).

## 3. Seguridad

- [x] Secrets nunca en Git (`.gitignore`: `.env*`; historial escaneado, limpio).
- [x] Gitleaks + `npm audit` en CI (`ci.yml`).
- [x] Headers de seguridad (CSP/HSTS/X-Frame/etc.) activos en producción.
- [x] Rate limiting en login/verificación/visitas/Public API.
- [x] SSRF guard en fetch de media externa.
- [x] Errores 500 sin fuga de detalles internos.
- [ ] Revisar acceso a la consola de Vercel (2FA obligatorio, mínimo de personas).
- [ ] Confirmar **rotación de secrets** documentada y probada (RUNBOOKS §5).

## 4. Observabilidad

- [x] `/api/health/liveness` y `/api/health/readiness` desplegados.
- [x] Load test smoke (0% error; ver resultados en PHASE_8F_REPORT).
- [ ] **Uptime monitor** externo sobre liveness (cada 1 min) con alerta.
- [ ] Alerta de 5xx > 1% (PostHog/Vercel Analytics).
- [ ] Alerta de crons fallidos.
- [ ] Alerta de conexiones de BD > 80%.
- [ ] Logging estructurado (recomendado) con requestId en logs.

## 5. Deploy y entornos

- [x] Workflow CI `.github/workflows/ci.yml` (typecheck/lint/test/build + audit/gitleaks).
- [ ] **Staging** en Vercel con BD Neon independiente.
- [ ] `main` protegido (branch protection: CI verde + review).
- [ ] Variables de entorno por entorno en Vercel (nunca en el repo).
- [ ] Verificar `vercel.json` crons (8 jobs) tras deploy.
- [ ] Dominios/alias de producción apuntando a `panitas.app`.
- [ ] `output: "standalone"` confirmado en Settings de Vercel.

## 6. Integraciones (producción)

- [ ] WhatsApp Cloud API: verify token + webhook firmado funcionando.
- [ ] Meta Instagram/Messenger: verify token + webhooks activos.
- [ ] Cloudinary: credenciales de prod y límites de plan.
- [ ] Resend: dominio verificado (DMARC/SPF), API key de prod.
- [ ] Twilio: número y capacidades verificadas (si se usa SMS).
- [ ] PostHog: proyecto de prod (NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN de prod).
- [ ] Pusher: app de prod + clusters correctos.
- [ ] NVIDIA NIM / OpenRouter: keys de prod y modelos disponibles.
- [ ] BCV: cron `update-bcv` con resultado OK.

## 7. Operaciones

- [x] Runbooks escritos (deploy, migraciones, backup/restore, rotación de secrets).
- [x] Respuesta ante incidentes con severidades y SLAs.
- [x] Checklist (este documento) disponible.
- [ ] Status page pública creada.
- [ ] On-call definido (quién y cómo contactar).
- [ ] Postmortem template listo (INCIDENT_RESPONSE §6).

## 8. Go-live (orden sugerido)

1. Activar monitores y alertas (sección 4).
2. Deploy a staging → probar E2E crítico (registro, tienda, checkout, inbox, cron).
3. Congelar features; correr checklist completo con responsables.
4. Deploy a producción en horario de bajo tráfico.
5. Verificar readiness + crons + webhooks reales.
6. Observar 24–48 h (errores, latencia, eventos PostHog).
7. Anunciar y habilitar la status page.

---

## 9. Firma de aceptación

| Rol | Nombre | Fecha | Firma |
|---|---|---|---|
| Autor de la fase | | | |
| Revisor técnico | | | |
| Responsable go-live | | | |
