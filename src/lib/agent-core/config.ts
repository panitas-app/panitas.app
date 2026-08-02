/**
 * Configuración central del Agent Core (FASE 3A).
 *
 * El Model Router lee de aquí qué proveedor + modelo usar por cada tipo de tarea.
 * Hoy todos apuntan al mismo modelo gratuito de OpenRouter; mañana se cambia cada
 * tarea de forma independiente SOLO editando configuración/env, sin tocar el Core.
 */
import type { AgentTaskType } from "./types"

export const AGENT_TASK_TYPES_LIST: AgentTaskType[] = [
  "chat",
  "business_analysis",
  "json",
  "classification",
  "summarization",
  "reply_suggestion",
]

/** Modelo gratuito por defecto (OpenRouter Free). */
export const DEFAULT_FREE_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free"

export const DEFAULT_PROVIDER = "openrouter"
export const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
export const DEFAULT_OPENROUTER_TITLE = "Panitas"
export const DEFAULT_OPENROUTER_REFERER = "https://panitas.app"

export interface ModelTaskConfig {
  model: string
  provider: string
  temperature: number
  maxTokens: number
}

export interface OpenRouterSettings {
  apiKey: string
  baseUrl: string
  appTitle: string
  httpReferer: string
}

export interface AgentCoreConfig {
  openrouter: OpenRouterSettings
  models: Record<AgentTaskType, ModelTaskConfig>
  defaults: {
    timeoutMs: number
    retries: number
  }
}

const TASK_ENV: Record<AgentTaskType, { env: string; temperature: number; maxTokens: number }> = {
  chat: { env: "CHAT_MODEL", temperature: 0.7, maxTokens: 1000 },
  business_analysis: { env: "BUSINESS_MODEL", temperature: 0.2, maxTokens: 2000 },
  json: { env: "JSON_MODEL", temperature: 0, maxTokens: 2000 },
  classification: { env: "CLASSIFICATION_MODEL", temperature: 0, maxTokens: 300 },
  summarization: { env: "SUMMARIZATION_MODEL", temperature: 0.3, maxTokens: 800 },
  reply_suggestion: { env: "REPLY_SUGGESTION_MODEL", temperature: 0.6, maxTokens: 400 },
}

function toInt(value: string | undefined, fallback: number): number {
  const n = value ? parseInt(value, 10) : NaN
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function toFloat(value: string | undefined, fallback: number): number {
  const n = value ? parseFloat(value) : NaN
  return Number.isFinite(n) ? n : fallback
}

/** Carga la configuración desde el entorno. Env vacío => defaults válidos (sin API key). */
export function loadAgentConfig(env: NodeJS.ProcessEnv = process.env): AgentCoreConfig {
  const provider = (env.AI_PROVIDER ?? "").trim() || DEFAULT_PROVIDER

  const models = {} as Record<AgentTaskType, ModelTaskConfig>
  for (const task of AGENT_TASK_TYPES_LIST) {
    const spec = TASK_ENV[task]
    const taskProvider = ((env[`${spec.env}_PROVIDER`] ?? "").trim() || provider)
    models[task] = {
      model: (env[spec.env] ?? "").trim() || DEFAULT_FREE_MODEL,
      provider: taskProvider,
      temperature: toFloat(env[`${spec.env}_TEMPERATURE`], spec.temperature),
      maxTokens: toInt(env[`${spec.env}_MAX_TOKENS`], spec.maxTokens),
    }
  }

  return {
    openrouter: {
      apiKey: (env.OPENROUTER_API_KEY ?? "").trim(),
      baseUrl: (env.OPENROUTER_BASE_URL ?? "").trim() || DEFAULT_OPENROUTER_BASE_URL,
      appTitle: (env.OPENROUTER_APP_TITLE ?? "").trim() || DEFAULT_OPENROUTER_TITLE,
      httpReferer: (env.OPENROUTER_HTTP_REFERER ?? "").trim() || DEFAULT_OPENROUTER_REFERER,
    },
    models,
    defaults: {
      timeoutMs: toInt(env.AI_TIMEOUT_MS, 30000),
      retries: toInt(env.AI_RETRIES, 2),
    },
  }
}
