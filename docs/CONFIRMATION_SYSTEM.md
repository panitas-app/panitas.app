# Confirmation System (FASE 4A)

Garantiza que las acciones destructivas o críticas **nunca** se ejecuten sin
confirmación explícita del usuario. Reglas declarativas en
`src/lib/agent-intel/confirmation-system.ts:15-40`:

| Tool | Condición (`when`) | Impacto |
|------|--------------------|---------|
| `products.delete` | siempre | irreversible |
| `orders.updateStatus` | `status === "cancelled"` | revierte stock |
| `inventory.updateStock` | `type === "decrease" \| "adjustment"` | reduce existencias |

Un paso con `requiresConfirmation` declarada en el plan también se considera
requerido (`confirmation-system.ts:59-62`).

## Flujo de confirmación

1. **`requirementsFor(plan)`** → pasos que exigen confirmación
   (`confirmation-system.ts:54-56`).
2. **`request(plan)`** → `ConfirmationRequest` con acciones legibles
   (descripción + impacto), códigos `confirm:<stepId>` y mensaje natural
   (`confirmation-system.ts:65-88`). El usuario responde "confirmar".
3. **`isFullyConfirmed(plan, confirmedStepIds)`** → true solo si TODOS los
   pasos requeridos están en la lista (`confirmation-system.ts:91-96`).

## Integración

- En `IntelligenceLayer.run`: si hay requisitos y el usuario no confirmó, se
  devuelve `status: "confirmation_required"` **sin ejecutar nada** y sin llamar
  al LLM (`src/lib/agent-intel/agent-intelligence.ts:87-106`).
- En `ConversationEngine.chat`: la respuesta de confirmación se persiste y se
  devuelve al cliente; el cliente reenvía el mismo turno con `confirmedStepIds`
  para que la segunda vuelta ejecute (`src/lib/conversation/engine.ts:153-186`).
- `ExecutionPlanner` refuerza: un paso no confirmado queda `awaiting_confirmation`
  aunque llegue a `execute()` (`src/lib/agent-intel/execution-planner.ts:75-80`).

## Códigos de confirmación

`confirm:<stepId>` (`confirmation-system.ts:77`). Se pasan como `confirmedStepIds`
en la segunda vuelta del chat (`ChatTurnInput.confirmedStepIds`,
`src/lib/conversation/engine.ts:28-31`).

## Archivos

- Implementación: `src/lib/agent-intel/confirmation-system.ts`
- Contratos: `src/lib/agent-intel/types.ts:103-130`
- Tests: `tests/agent-intel/confirmation-system.test.ts` (7 casos)
