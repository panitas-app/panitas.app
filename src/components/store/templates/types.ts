export interface ProductData {
  id: string
  name: string
  price: number
  images: string[]
  stock: number | null
  category?: { id: string; name: string; slug: string } | null
}

export interface CategoryData {
  id: string
  name: string
  slug: string
}

export interface StoreData {
  id: string
  name: string
  slug: string
  description: string | null
  logo: string | null
  banner: string | null
  phone: string | null
  whatsapp: string | null
  address: string | null
  storeHours: string | null
  primaryColor: string
  instagram?: string | null
  facebook?: string | null
  tiktok?: string | null
  twitter?: string | null
  youtube?: string | null
  linkedin?: string | null
  plan: string
  planType: string
  categories: CategoryData[]
  products: ProductData[]
}

export interface CartItemLocal {
  productId: string
  name: string
  price: number
  quantity: number
  image?: string | null
}

export interface TemplateComponentProps {
  store: StoreData
  products: ProductData[]
  bcvRate: number
  slug: string
  accentColor: string
  cart: CartItemLocal[]
  cartCount: number
  cartOpen: boolean
  canBook?: boolean
  onCartOpen: (open: boolean) => void
  onAddToCart: (product: ProductData) => void
  onUpdateQty: (productId: string, qty: number) => void
  onRemove: (productId: string) => void
  onCheckout: () => void
}
