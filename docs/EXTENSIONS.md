# Extensiones — Registro de integraciones

*FASE 8D — Abstracción para integraciones de terceros.*

## Qué es (y qué NO es)

Una **extensión** es un registro en el panel de Integraciones que declara una
integración de terceros (tipo, permisos que usaría y estado de vida) junto a las
piezas reales que ya existen: **API Keys** para acceso programático y
**Webhooks** para eventos salientes.

FASE 8D **no** construye marketplace, ni instala plugins, ni ejecuta código
arbitrario de terceros dentro del servidor de Panitas. La extensión es la pieza
de registro; la integración funcional se logra combinándola con una API key y/o
una suscripción de webhook.

## Tipos

| Tipo | Descripción |
|---|---|
| `webhook_integration` | Consume eventos de Panitas vía webhooks |
| `api_integration` | Accede a datos vía Public API (API key) |
| `channel_integration` | Conecta un canal de atención (preparado para fases futuras) |
| `automation_integration` | Automatizaciones externas (preparado para fases futuras) |

## Estados

| Estado | Significado |
|---|---|
| `draft` | En creación |
| `active` | Habilitada |
| `disabled` | Deshabilitada por el admin |
| `revoked` | Eliminada |

## Permisos declarados

Una extensión declara los permisos de Public API que necesitaría
(`products:read`, `orders:write`, ...), de la misma lista que las API keys. Los
permisos se normalizan y solo se aceptan valores válidos.

## Seguridad

- **Nunca** se ejecuta código de terceros en el servidor de Panitas.
- El `configuration` (JSON) es opaco para la plataforma; no se evalúa.
- El registro es por tienda (`storeId`); todo está aislado por tenant.
- Solo admin/manager pueden crear, activar, desactivar o eliminar extensiones.

## Endpoints internos (admin/manager)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/integrations/extensions` | Lista extensiones de la tienda |
| POST | `/api/integrations/extensions` | Crea (`name` obligatorio, `type`, `permissions`) |
| PATCH | `/api/integrations/extensions/{id}` | Cambia estado (`draft|active|disabled|revoked`) |
| DELETE | `/api/integrations/extensions/{id}` | Elimina el registro |

## Ejemplo

```
POST /api/integrations/extensions
{ "name": "Mi ERP", "type": "api_integration", "permissions": ["products:read", "orders:read", "orders:write"] }
```

Para que la integración funcione de verdad, además:

1. Crea una **API key** con los permisos necesarios.
2. Si quieres eventos en tiempo real, crea un **webhook** y suscríbelo a los
   eventos que te interesan (`GET /api/v1/events`).
