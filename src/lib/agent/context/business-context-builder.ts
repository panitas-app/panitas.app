/**
 * Business Context Builder (FASE 3D).
 *
 * Construye el contexto empresarial completo que recibe el Agent Core en cada turno:
 *
 *   - información del negocio (nombre, slug, descripción, categoría)
 *   - usuario (nombre, email, rol)
 *   - plan (plan, estado, modalidad)
 *   - permisos (derivados del rol)
 *   - métricas principales (ventas, inventario, clientes)
 *   - perfil inteligente (productos/clientes importantes)
 *   - información relevante (memoria recuperada para la pregunta)
 *
 * Produce un bundle estructurado y un fragmento de texto compacto para el system
 * prompt del agente (limita el costo de tokens). El `storeId` viene del contexto
 * autenticado: nunca se cruza memoria ni datos entre negocios.
 */
import { permissionsForRole } from "@/lib/agent/permissions/agent.roles"
import type { AgentPermission } from "@/lib/agent/permissions"
import type { StoreServiceContext } from "@/services/context"
import { profileToPromptFragment } from "@/lib/agent/profile/builder"
import type { BusinessProfile, BusinessProfileBuilder } from "@/lib/agent/profile"
import type { MemoryItem, MemoryManager } from "@/lib/agent/memory"

export interface BusinessContextBundle {
  business: {
    id: string
    name: string
    slug: string | null
    description: string | null
    country: string | null
    category: string | null
  }
  user: {
    id: string
    name: string | null
    email: string | null
    role: string
  }
  plan: {
    plan: string
    planStatus: string | null
    modalidad: string | null
  }
  permissions: AgentPermission[]
  metrics: BusinessProfile["metrics"] | null
  profile: BusinessProfile | null
  memory: MemoryItem[]
  builtAt: string
}

export interface BusinessContextBuilderOptions {
  memoryLimit?: number
  profilePromptLimit?: number
  memoryPromptLimit?: number
}

export interface BusinessContextProviders {
  profile?: BusinessProfileBuilder
  memory?: MemoryManager
}

export class BusinessContextBuilder {
  private readonly profile: BusinessProfileBuilder | null
  private readonly memory: MemoryManager | null
  private readonly memoryLimit: number
  private readonly profilePromptLimit: number
  private readonly memoryPromptLimit: number

  constructor(providers: BusinessContextProviders = {}, options: BusinessContextBuilderOptions = {}) {
    this.profile = providers.profile ?? null
    this.memory = providers.memory ?? null
    this.memoryLimit = options.memoryLimit ?? 8
    this.profilePromptLimit = options.profilePromptLimit ?? 1200
    this.memoryPromptLimit = options.memoryPromptLimit ?? 1800
  }

  async build(ctx: StoreServiceContext, query?: string): Promise<BusinessContextBundle> {
    const profile = this.profile ? await this.profile.build(ctx) : null

    let memory: MemoryItem[] = []
    if (this.memory) {
      const results = query
        ? await this.memory.search(ctx, query, { limit: this.memoryLimit })
        : []
      memory = results.map((r) => r.item)
    }

    const store = profile?.general ?? null

    return {
      business: {
        id: ctx.storeId,
        name: store?.name ?? ctx.storeName ?? "",
        slug: profile?.general.slug ?? null,
        description: profile?.general.description ?? null,
        country: profile?.general.country ?? null,
        category: profile?.category.modalidad ?? profile?.category.planType ?? null,
      },
      user: {
        id: ctx.userId,
        name: null,
        email: null,
        role: ctx.role ?? "admin",
      },
      plan: {
        plan: ctx.plan ?? profile?.plan.plan ?? "free",
        planStatus: profile?.plan.planStatus ?? null,
        modalidad: profile?.category.modalidad ?? null,
      },
      permissions: permissionsForRole(ctx.role ?? "admin"),
      metrics: profile?.metrics ?? null,
      profile,
      memory,
      builtAt: new Date().toISOString(),
    }
  }

  /** Fragmento de negocio (perfil + info) para el system prompt. */
  toBusinessFragment(bundle: BusinessContextBundle): string {
    if (bundle.profile) {
      return this.limit(profileToPromptFragment(bundle.profile), this.profilePromptLimit)
    }
    const b = bundle.business
    const lines: string[] = [`Negocio: ${b.name} (${b.category ?? "tienda"}).`]
    if (b.description) lines.push(`Descripción: ${b.description}`)
    return lines.join("\n")
  }

  /** Fragmento de memoria relevante para el system prompt. */
  toMemoryFragment(bundle: BusinessContextBundle): string {
    if (bundle.memory.length === 0) return ""
    const lines = ["Memoria relevante del negocio:"]
    for (const item of bundle.memory) {
      const value = typeof item.value === "string" ? item.value : JSON.stringify(item.value)
      lines.push(`- [${item.importance}] ${value.length > 200 ? `${value.slice(0, 200)}…` : value}`)
    }
    return this.limit(lines.join("\n"), this.memoryPromptLimit)
  }

  /** Fragmento de texto compacto del contexto para el system prompt (negocio + memoria). */
  toPromptFragment(bundle: BusinessContextBundle): string {
    const parts: string[] = [this.toBusinessFragment(bundle)]
    const memory = this.toMemoryFragment(bundle)
    if (memory) parts.push(memory)
    return parts.join("\n")
  }

  /** Lista plana de memoria para `AgentRequest.memoryContext` (sin datos sensibles de BD). */
  toAgentMemoryContext(bundle: BusinessContextBundle): AgentMemoryItem[] {
    return bundle.memory.map((m) => ({
      key: m.key,
      kind: m.kind,
      importance: m.importance,
      value: m.value,
      updatedAt: m.updatedAt,
    }))
  }

  private limit(text: string, max: number): string {
    return text.length > max ? `${text.slice(0, max)}…` : text
  }
}

export interface AgentMemoryItem {
  key: string
  kind: string
  importance: string
  value: unknown
  updatedAt: string
}
