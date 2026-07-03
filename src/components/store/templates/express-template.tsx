"use client"

import { useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/store/product-card"
import { CartSheet } from "@/components/store/cart-sheet"
import { SearchInput } from "@/components/ui/search-input"
import { FilterChip } from "@/components/ui/filter-chip"
import { WhatsAppFloat } from "@/components/ui/whatsapp-float"
import { AnimatePresence, motion } from "framer-motion"
import {
  Search, ShoppingCart, Store, MapPin, Package,
  Zap, ChevronDown,
} from "lucide-react"
import type { TemplateComponentProps, ProductData } from "./types"

export function ExpressTemplate({
  store, products, bcvRate, slug, accentColor,
  cart, cartCount, cartOpen, onCartOpen,
  onAddToCart, onUpdateQty, onRemove, onCheckout,
}: TemplateComponentProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [quickQty, setQuickQty] = useState<Record<string, number>>({})
  const [showScrollTop, setShowScrollTop] = useState(false)

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
      const matchCategory = !selectedCategory || p.category?.id === selectedCategory
      return matchSearch && matchCategory
    })
  }, [products, search, selectedCategory])

  const lowStock = useMemo(() => {
    return products.filter((p) => p.stock !== null && p.stock > 0 && p.stock <= 5)
  }, [products])

  const handleQuickAdd = useCallback((product: ProductData) => {
    const qty = quickQty[product.id] || 1
    for (let i = 0; i < qty; i++) {
      onAddToCart(product)
    }
    setQuickQty((prev) => ({ ...prev, [product.id]: 1 }))
  }, [quickQty, onAddToCart])

  if (typeof window !== "undefined") {
    window.addEventListener("scroll", () => setShowScrollTop(window.scrollY > 600), { passive: true })
  }

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ "--primary": accentColor, "--ring": accentColor } as React.CSSProperties}>
      {/* ==================== TOP PROMO BAR ==================== */}
      {lowStock.length > 0 && (
        <div className="flex items-center justify-center gap-2 bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
          <Zap className="size-3.5" />
          {lowStock.length} producto{lowStock.length !== 1 ? "s" : ""} con stock limitado &mdash; ¡aprovecha!
        </div>
      )}

      {/* ==================== STICKY HEADER ==================== */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm shadow-xs">
        <div className="mx-auto max-w-7xl px-3 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 min-w-0 shrink-0">
              <div className="size-9 shrink-0 overflow-hidden rounded-lg bg-muted">
                {store.logo ? (
                <img src={store.logo} alt={store.name} loading="lazy" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <Store className="size-4" />
                </div>
              )}
            </div>
            <div className="hidden sm:block min-w-0">
              <h1 className="text-sm font-bold leading-tight truncate">{store.name}</h1>
                {store.address && (
                  <p className="text-[10px] text-muted-foreground truncate">{store.address}</p>
                )}
              </div>
            </div>

            <div className="flex-1 max-w-2xl mx-auto">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Buscar por nombre, categoría..."
                large
                autoFocus
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                onClick={() => onCartOpen(true)}
                className="relative shrink-0 rounded-full px-3 h-10 gap-1.5"
                style={{ backgroundColor: accentColor, color: "#102A43" }}
              >
                <ShoppingCart className="size-4" />
                <span className="text-sm font-bold tabular-nums">{cartCount}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick category pills under header */}
        <div className="mx-auto max-w-7xl px-3 pb-2 overflow-x-auto no-scrollbar">
          <div className="flex gap-1.5">
            <FilterChip label="Todo" active={selectedCategory === null} onClick={() => setSelectedCategory(null)} />
            {store.categories.map((cat) => (
              <FilterChip
                key={cat.id}
                label={cat.name}
                active={selectedCategory === cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                onRemove={() => setSelectedCategory(null)}
              />
            ))}
          </div>
        </div>
      </header>

      {/* ==================== MAIN CONTENT ==================== */}
      <main className="mx-auto max-w-7xl px-3 py-4 pb-28">
        {/* Results header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground">
            {filteredProducts.length} resultado{filteredProducts.length !== 1 ? "s" : ""}
            {search && <> para &ldquo;{search}&rdquo;</>}
          </p>
          {(search || selectedCategory) && (
            <button
              onClick={() => { setSearch(""); setSelectedCategory(null) }}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Product grid - high density */}
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <Search className="size-10 text-muted-foreground/40" />
            <p className="text-sm font-semibold">No se encontraron productos</p>
            <p className="text-xs">Prueba con otros términos o cambia de categoría.</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCategory || "all"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            >
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <ProductCard
                    product={product}
                    onAddToCart={handleQuickAdd}
                    bcvRate={bcvRate}
                    accentColor={accentColor}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* ==================== FLOATING CART BAR ==================== */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3 shadow-lg">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <ShoppingCart className="size-4 text-muted-foreground" />
            <span className="font-semibold">{cartCount} producto{cartCount !== 1 ? "s" : ""}</span>
            {cartCount > 0 && (
              <span className="text-muted-foreground">
                ${cart.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}
              </span>
            )}
          </div>
          <Button
            onClick={() => onCartOpen(true)}
            className="rounded-full px-6 gap-2 h-10"
            style={{ backgroundColor: accentColor, color: "#102A43" }}
          >
            Ver Carrito
            <ChevronDown className="size-4" />
          </Button>
        </div>
      </div>

      {/* ==================== FOOTER ==================== */}
      <footer className="w-full bg-foreground">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="size-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
                  {store.logo ? (
                    <img src={store.logo} alt="" loading="lazy" className="size-6 rounded object-cover" />
                  ) : (
                    <Store className="size-4 text-primary-foreground/70" />
                  )}
                </div>
                <span className="text-sm font-bold text-primary-foreground">{store.name}</span>
              </div>
              <p className="text-xs text-primary-foreground/60 leading-relaxed">Compra rápida y segura.</p>
            </div>

            <div>
              <h4 className="text-xs font-semibold tracking-wider text-primary-foreground/80 uppercase mb-3">Contacto</h4>
              <div className="space-y-2">
                {store.whatsapp && (
                  <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-primary-foreground/60 hover:text-primary-foreground transition-colors">
                    <Package className="size-3.5" /> WhatsApp
                  </a>
                )}
                {store.address && (
                  <p className="flex items-center gap-2 text-xs text-primary-foreground/60">
                    <MapPin className="size-3.5" /> {store.address}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold tracking-wider text-primary-foreground/80 uppercase mb-3">Info</h4>
              <div className="space-y-2">
                <button onClick={() => router.push(`/store/${slug}`)}
                  className="block text-xs text-primary-foreground/60 hover:text-primary-foreground transition-colors">
                  Inicio
                </button>
                {store.whatsapp && (
                  <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="block text-xs text-primary-foreground/60 hover:text-primary-foreground transition-colors">
                    Contacto rápido
                  </a>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold tracking-wider text-primary-foreground/80 uppercase mb-3">Métodos de pago</h4>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-md bg-primary-foreground/10 px-2 py-1 text-[10px] text-primary-foreground/60">Divisas</span>
                <span className="rounded-md bg-primary-foreground/10 px-2 py-1 text-[10px] text-primary-foreground/60">Transferencia</span>
                <span className="rounded-md bg-primary-foreground/10 px-2 py-1 text-[10px] text-primary-foreground/60">Efectivo</span>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-primary-foreground/10 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <p className="text-[10px] text-primary-foreground/40">&copy; {new Date().getFullYear()} {store.name}</p>
            <p className="text-[10px] text-primary-foreground/30">Powered by Panitas</p>
          </div>
        </div>
      </footer>

      {/* ==================== CART SHEET ==================== */}
      <CartSheet
        items={cart}
        onUpdateQty={onUpdateQty}
        onRemove={onRemove}
        onCheckout={onCheckout}
        isOpen={cartOpen}
        onClose={() => onCartOpen(false)}
      />

      {/* WhatsApp */}
      {store.whatsapp && (
        <WhatsAppFloat phone={store.whatsapp} message="Hola, quiero comprar" />
      )}
    </div>
  )
}
