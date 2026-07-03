export type TemplateId = "modern" | "express" | "delivery" | "premium"

export interface TemplateDefinition {
  id: TemplateId
  label: string
  description: string
  preview: string
  category: string
}

export interface TemplateProduct {
  id: string
  name: string
  price: number
  images: string[]
  stock: number | null
  description: string | null
  category?: { id: string; name: string; slug: string } | null
  collection?: { id: string; name: string } | null
  featured?: boolean
  createdAt?: string
}

export interface TemplateCategory {
  id: string
  name: string
  slug: string
  image: string | null
  productCount?: number
}

export interface TemplateStore {
  id: string
  name: string
  slug: string
  description: string | null
  logo: string | null
  banner: string | null
  phone: string | null
  whatsapp: string | null
  address: string | null
  primaryColor: string
  template: TemplateId
  categories: TemplateCategory[]
  products: TemplateProduct[]
}

export interface TemplateCartItem {
  productId: string
  name: string
  price: number
  quantity: number
  image?: string | null
}
