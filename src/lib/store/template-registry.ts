import type { TemplateDefinition, TemplateId } from "./template-types"

export const TEMPLATE_DEFINITIONS: Record<TemplateId, TemplateDefinition> = {
  modern: {
    id: "modern",
    label: "Moderna",
    description: "Diseño limpio y profesional con hero grande, categorías visuales y testimonios. Ideal para moda, tecnología y cosméticos.",
    preview: "modern",
    category: "General",
  },
  express: {
    id: "express",
    label: "Express",
    description: "Máxima velocidad de compra con buscador enorme, filtros visibles y alta densidad de productos. Ideal para ferreterías, farmacias y supermercados.",
    preview: "express",
    category: "Comercio",
  },
  delivery: {
    id: "delivery",
    label: "Delivery",
    description: "Especial para restaurantes con hero fotográfico, menú por categorías y carrito siempre visible.",
    preview: "delivery",
    category: "Restaurantes",
  },
  premium: {
    id: "premium",
    label: "Premium",
    description: "Experiencia exclusiva con storytelling, grandes fotografías y animaciones elegantes. Ideal para perfumes, joyería y moda premium.",
    preview: "premium",
    category: "Exclusivo",
  },
}

export function getTemplate(id: string): TemplateDefinition {
  return TEMPLATE_DEFINITIONS[id as TemplateId] || TEMPLATE_DEFINITIONS.modern
}

export function getAllTemplates(): TemplateDefinition[] {
  return Object.values(TEMPLATE_DEFINITIONS)
}
