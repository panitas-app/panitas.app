import type { TemplateId } from "@/lib/store/template-types"
import type { TemplateComponentProps } from "./templates/types"

type TemplateComponent = React.ComponentType<TemplateComponentProps>

const registry = {} as Record<TemplateId, TemplateComponent>

export function registerTemplate(id: TemplateId, component: TemplateComponent) {
  registry[id] = component
}

export function getTemplateComponent(id: string): TemplateComponent {
  return registry[id as TemplateId]
}

export function getAllTemplateComponents(): [string, TemplateComponent][] {
  return Object.entries(registry)
}
