# Automatización Inteligente de Cobranza (FASE 6B)

Guía funcional y técnica del **asistente de cobranza**: plantillas editables
por categoría con variables dinámicas, métodos de pago configurables, niveles
de cobranza sugeridos, historial de contacto integrado al timeline del crédito
y 4 acciones nuevas de IA. El principio rector: **Panitas nunca envía mensajes
automáticamente**; solo prepara recordatorios que el dueño revisa y envía.

---

## 1. Visión

El dueño abre **Cobranza IA** (`/dashboard/collection`) y, en un minuto, sabe
a quién contactar hoy, con qué mensaje y a qué nivel. En vez de redactar a
mano, elige un recordatorio por categoría, edita el mensaje con variables
dinámicas (`{{cliente}}`, `{{saldo}}`, ...), lo abre en WhatsApp, y confirma
que lo envió. Cada contacto queda en el historial del crédito.

## 2. Categorías y plantillas

Cinco categorías fijas, cada una con un nivel por defecto:

| Categoría | Nivel | Uso |
|---|---|---|
| `primer_recordatorio` | 1 | Aviso amistoso antes o al vencerse la cuota |
| `segundo_recordatorio` | 2 | Aviso formal tras unos días de atraso |
| `ultimo_aviso` | 3 | Aviso firme con plazo límite |
| `despues_abono` | 1 | Confirma el abono y muestra el nuevo saldo |
| `agradecimiento` | 1 | Cierra el crédito con un agradecimiento |

- Se siembran **5 plantillas por defecto** (`BUILT_IN_TEMPLATES`) al primer
  acceso; son restaurables (`POST /api/collection/templates/restore`).
- El dueño puede crear plantillas custom y editar las de fábrica (editar una
  de fábrica la desconvierte en custom, pero sigue siendo restaurable).
- Las plantillas de fábrica **no se eliminan**: `DELETE` las restaura.
- Límites: nombre ≤ 80, cuerpo ≤ 4000 caracteres, máx. 40 plantillas por tienda.

### Variables dinámicas

| Variable | Descripción |
|---|---|
| `{{cliente}}` | Nombre del cliente |
| `{{saldo}}` | Saldo pendiente del crédito |
| `{{monto_abono}}` | Monto del último abono registrado |
| `{{fecha_vencimiento}}` | Próxima cuota pendiente |
| `{{dias_atraso}}` | Días de atraso de la cuota vencida más antigua |
| `{{metodos_pago}}` | Métodos de pago configurados (separados por comas) |
| `{{nombre_negocio}}` | Nombre del negocio (o override de configuración) |

## 3. Configuración

`CollectionSettings` por tienda:

- **Métodos de pago** — lista editable (máx. 15), inyectada en `{{metodos_pago}}`.
  Por defecto: Zelle, Pago Móvil, Banco Provincial, Binance, Efectivo,
  Transferencia, Otro.
- **Nivel por defecto** — nivel sugerido para la categoría `segundo_recordatorio`.
- **Nombre del negocio** — override para `{{nombre_negocio}}`.

## 4. Niveles y sugerencias

El nivel de cobranza se **sugiere** por días de atraso pero siempre se puede
cambiar manualmente:

| Días de atraso | Nivel sugerido |
|---|---|
| ≤ 2 | 1 (amistoso) |
| 3 – 10 | 2 (formal) |
| ≥ 11 | 3 (último aviso) |

La categoría sugerida sube con el atraso y los intentos: ≥ 2 intentos o ≥ 11
días → `ultimo_aviso`; 3–10 días → `segundo_recordatorio`; si no, el primero.

## 5. Flujo: preparar → revisar → enviar

1. **Preparar** (`POST /api/collection/prepare`): elige la plantilla, renderiza
   variables y registra un contacto `pending`. Devuelve el mensaje y el enlace
   `https://wa.me/<teléfono normalizado a 58>?text=...`. **No envía nada.**
2. **Revisar/editar**: el dueño puede editar el mensaje antes de enviarlo
   (`bodyOverride`).
3. **Enviar**: abre el enlace de WhatsApp en su propio teléfono.
4. **Confirmar** (`POST /api/collection/contacts`): marca el contacto como
   `sent` (y `responded` si el cliente responde). Esto deja el evento
   `collection.reminder.sent` / `collection.contact.logged`, la auditoría y las
   entradas `reminder_sent` / `client_responded` en el timeline del crédito.

## 6. Recomendaciones diarias

`GET /api/collection/recommendations` responde **¿a quién contactar hoy?**:

- Solo créditos con saldo pendiente (excluye saldados y cancelados).
- Orden: vencidos primero → más días de atraso → sin contactar primero → más
  días desde el último contacto → próxima cuota más cercana.
- Cada recomendación trae: cliente, pendiente, días de atraso, intentos,
  días desde el último contacto, nivel y categoría sugeridos.

## 7. Historial de contacto

`GET /api/collection/contacts` devuelve el historial (por orden o cliente).
Cada contacto registra canal (`whatsapp | call | sms | email | other`),
categoría, nivel, plantilla, mensaje renderizado y estado
(`pending | sent | responded`). El `CreditService.getDetail` incluye los
contactos en el timeline como `reminder_sent` (violeta) y `client_responded`
(azul).

## 8. Acciones de IA

Cuatro acciones nuevas en el catálogo conversacional (dominio `cobranza`):

| Acción | Qué hace |
|---|---|
| `contactar_hoy` | Lista las recomendaciones del día con resumen de vencidos |
| `sin_recordatorio` | Filtra créditos pendientes nunca contactados |
| `creditos_dos_intentos` | Lista créditos con ≥ 2 intentos (evaluar nivel) |
| `preparar_aviso` | Prepara un recordatorio para un cliente (opcional `tipo` → categoría) |

Todas preparan contenido; **ninguna envía mensajes** por su cuenta.

## 9. Business Memory

El asistente aprende por repetición (umbral `preference` = 3):

- `bm.preference.collection.plantilla` — categoría de plantilla favorita.
- `bm.preference.collection.metodo` — método de pago más compartido.
- `bm.preference.collection.nivel` — nivel de cobranza preferido.
- `bm.preference.collection.orden` — orden de trabajo (explícito).

`GET|POST /api/business-memory/collection/preferences` las expone; el POST de
`/api/collection/contacts` registra uso al marcar un envío como `sent`.

## 10. Eventos y auditoría

Eventos de dominio emitidos (categoría `collection`):

| Evento | Cuándo |
|---|---|
| `collection.reminder.prepared` | Se prepara un recordatorio (log `pending`) |
| `collection.reminder.sent` | El dueño confirma el envío |
| `collection.reminder.edited` | Se crea/edita una plantilla |
| `collection.contact.logged` | El cliente respondió o se registra contacto |
| `collection.settings.updated` | Se actualiza la configuración |

Todas las mutaciones dejan auditoría con `action: collection.*`.

## 11. API

| Ruta | Métodos | Propósito |
|---|---|---|
| `/api/collection/templates` | GET, POST | Listar / crear o editar plantillas |
| `/api/collection/templates/restore` | POST | Restaurar las 5 de fábrica |
| `/api/collection/templates/[id]` | DELETE | Eliminar (restaurar si es built-in) |
| `/api/collection/settings` | GET, PUT | Configuración (métodos, nivel, nombre) |
| `/api/collection/prepare` | POST | Preparar recordatorio (nunca envía) |
| `/api/collection/contacts` | GET, POST | Historial / marcar `sent` o `responded` |
| `/api/collection/recommendations` | GET | ¿A quién contactar hoy? |
| `/api/business-memory/collection/preferences` | GET, POST | Preferencias aprendidas |

Todas las mutaciones pasan por `csrfGuard`.

## 12. UI

`/dashboard/collection` (roles admin/manager, no disponible en plan agenda)
tiene tres pestañas:

- **Asistente** — recomendaciones diarias, búsqueda de créditos, selector de
  categoría/nivel/plantilla, textarea editable con variables, botón **Preparar**,
  vista previa con enlace de WhatsApp, **Marcar enviado** e historial embebido.
- **Plantillas** — editor por categoría con vista previa en vivo, paleta de
  variables, crear/guardar y restaurar por defecto.
- **Métodos de pago** — CRUD + reorden de métodos, nivel por defecto y nombre
  del negocio.
