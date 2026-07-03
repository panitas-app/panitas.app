"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getTemplateComponent } from "./template-components"
import { LoadingState } from "@/components/ui/loading-state"
import { StoreSkeleton } from "@/components/store/store-skeleton"
import "./templates"

interface ProductData {
  id: string
  name: string
  price: number
  images: string[]
  stock: number | null
  category?: { id: string; name: string; slug: string } | null
}

interface CategoryData {
  id: string
  name: string
  slug: string
}

interface StoreData {
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
  template?: string
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

interface CartItemLocal {
  productId: string
  name: string
  price: number
  quantity: number
  image?: string | null
}

interface StoreContentClientProps {
  store: StoreData
  products: ProductData[]
  bcvRate: number
  slug: string
  canBook?: boolean
}

function cartKey(slug: string) { return `panitas_cart_${slug}` }

function loadCart(slug: string): CartItemLocal[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(cartKey(slug))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCart(slug: string, items: CartItemLocal[]) {
  localStorage.setItem(cartKey(slug), JSON.stringify(items))
}

export default function StoreContentClient({ store, products, bcvRate, slug, canBook }: StoreContentClientProps) {
  const router = useRouter()
  const [cartOpen, setCartOpen] = useState(false)
  const [cart, setCart] = useState<CartItemLocal[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setCart(loadCart(slug))
    setMounted(true)
  }, [slug])

  useEffect(() => {
    if (cart.length > 0) {
      saveCart(slug, cart)
    } else {
      localStorage.removeItem(cartKey(slug))
    }
  }, [cart, slug])

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const accentColor = store.primaryColor || "#FFB92E"
  const templateId = store.template || "modern"

  function handleAddToCart(product: ProductData) {
    const existing = cart.find((i) => i.productId === product.id)
    if (product.stock !== null) {
      if (existing && existing.quantity >= product.stock) {
        import("sonner").then(({ toast }) =>
          toast.error(`Solo quedan ${product.stock} unidades disponibles.`)
        )
        return
      }
      if (!existing && product.stock <= 0) {
        import("sonner").then(({ toast }) =>
          toast.error("Este producto no tiene stock disponible.")
        )
        return
      }
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing)
        return prev.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i))
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1, image: product.images?.[0] || null }]
    })
  }

  function handleUpdateQty(productId: string, qty: number) {
    if (qty <= 0) { handleRemove(productId); return }
    const product = products.find((p) => p.id === productId)
    if (product && product.stock !== null && qty > product.stock) {
      import("sonner").then(({ toast }) =>
        toast.error(`Solo quedan ${product.stock} unidades disponibles.`)
      )
      qty = product.stock
    }
    setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)))
  }

  function handleRemove(productId: string) {
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }

  function handleCheckout() {
    localStorage.setItem(`panitas_checkout_${slug}`, JSON.stringify({ cart, storeSlug: slug }))
    setCartOpen(false)
    router.push(`/store/${slug}/checkout`)
  }

  if (!mounted) {
    return <StoreSkeleton template={templateId} />
  }

  const Template = getTemplateComponent(templateId)
  if (!Template) {
    return <LoadingState message="Plantilla no encontrada..." />
  }

  return (
    <Template
      store={store}
      products={products}
      bcvRate={bcvRate}
      slug={slug}
      accentColor={accentColor}
      cart={cart}
      cartCount={cartCount}
      cartOpen={cartOpen}
      canBook={canBook}
      onCartOpen={setCartOpen}
      onAddToCart={handleAddToCart}
      onUpdateQty={handleUpdateQty}
      onRemove={handleRemove}
      onCheckout={handleCheckout}
    />
  )
}
