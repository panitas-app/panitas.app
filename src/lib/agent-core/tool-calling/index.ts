/**
 * Tool Calling Nativo (FASE 3E).
 *
 * El LLM interpreta la intención y decide qué tools llamar de forma nativa.
 * El backend conserva el control determinista (permisos, validación, resolución
 * de entidades, confirmaciones, services). Consumo típico:
 *
 *   const runner = new AgenticToolRunner({ provider, registry, executor, confirmation })
 *   const result = await runner.run({ request, toolContext, confirmedStepIds })
 */
export { AgenticToolRunner, nativeStepId, shortHash } from "./runner"
export type { AgenticToolRunnerDeps } from "./runner"
export { toProviderTools, toJsonSchema } from "./schema"
export { buildAgenticSystemPrompt, AGENTIC_BASE_RULES, formatToday } from "./prompt"
export type { AgenticPromptInput } from "./prompt"
export type { AgenticRunInput, AgenticRunResult, AgenticRunStatus } from "./types"
