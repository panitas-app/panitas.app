"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/store/product-card"
import { CartSheet } from "@/components/store/cart-sheet"
import { SearchInput } from "@/components/ui/search-input"
import { WhatsAppFloat } from "@/components/ui/whatsapp-float"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, ShoppingCart, Store, UtensilsCrossed, Clock,
  MapPin, Phone, ChevronRight,
  Timer,
} from "lucide-react"
import type { TemplateComponentProps, ProductData } from "./types"

export function DeliveryTemplate({
  store, products, bcvRate, slug, accentColor,
  cart, cartCount, cartOpen, onCartOpen,
  onAddToCart, onUpdateQty, onRemove, onCheckout,
}: TemplateComponentProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showCartPreview, setShowCartPreview] = useState(false)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const menuRef = useRef<HTMLDivElement>(null)

  const categories = useMemo(() => {
    const cats = store.categories.map((c) => ({
      ...c,
      products: products.filter((p) => p.category?.id === c.id),
    }))
    if (selectedCategory) return cats.filter((c) => c.id === selectedCategory)
    return cats
  }, [store.categories, products, selectedCategory])

  const uncategorized = products.filter((p) => !p.category)
  const hasUncategorized = uncategorized.length > 0

  const filteredProducts = useMemo(() => {
    if (!search) return products
    return products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
  }, [products, search])

  const cartTotal = useMemo(() => {
    return cart.reduce((s, i) => s + i.price * i.quantity, 0)
  }, [cart])

  const handleSectionClick = useCallback((catId: string) => {
    setSelectedCategory(null)
    setShowMobileMenu(false)
    sectionRefs.current[catId]?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  useEffect(() => {
    if (!menuRef.current || search) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id.replace("section-", ""))
          }
        }
      },
      { rootMargin: "-120px 0px -80% 0px" }
    )
    const refs = sectionRefs.current
    Object.values(refs).forEach((el) => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [categories.length, search])

  const todayKey = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"][new Date().getDay()]
  let hoursDisplay: string | null = null
  let isOpen = false
  if (store.storeHours) {
    try {
      const schedule = JSON.parse(store.storeHours)
      const today = schedule[todayKey]
      if (today) {
        if (today.type === "Cerrado") { hoursDisplay = "Cerrado hoy"; isOpen = false }
        else if (today.type === "Horario Corrido") { hoursDisplay = `${today.open} - ${today.close}`; isOpen = true }
        else if (today.type === "Horario Comercial") { hoursDisplay = `${today.open} - ${today.close}, ${today.reopen} - ${today.reclose}`; isOpen = true }
      }
    } catch (e) { console.error("[unhandled error]", e) }
  }

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ "--primary": accentColor, "--ring": accentColor } as React.CSSProperties}>
      {/* ==================== HERO BANNER ==================== */}
      <div
        className="relative flex min-h-[260px] items-end overflow-hidden sm:min-h-[320px]"
        style={
          store.banner
            ? { backgroundImage: `url(${store.banner})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: `linear-gradient(135deg, #184BBF 0%, ${accentColor} 100%)` }
        }
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-6">
          <div className="flex items-end gap-4">
            <div className="size-16 shrink-0 overflow-hidden rounded-2xl border-2 border-background/50 bg-muted shadow-lg sm:size-20">
              {store.logo ? (
                <img src={store.logo} alt={store.name} loading="lazy" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <Store className="size-6" />
                </div>
              )}
            </div>
            <div className="text-white drop-shadow-sm">
              <h1 className="text-xl font-bold sm:text-2xl">{store.name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-white/80">
                <span className="flex items-center gap-1"><MapPin className="size-3" /> {store.address || "Envío a domicilio"}</span>
                {hoursDisplay && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    <span className={`inline-block size-1.5 rounded-full ${isOpen ? "bg-green-400" : "bg-red-400"}`} />
                    {hoursDisplay}
                  </span>
                )}
                <span className="flex items-center gap-1"><Timer className="size-3" /> 30-45 min</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== STICKY MENU BAR ==================== */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm shadow-xs">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center gap-3 py-2.5">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Buscar en el menú..."
              />
            </div>

            {/* Desktop category nav */}
            <div className="hidden md:flex gap-1 overflow-x-auto no-scrollbar flex-1">
              <Button
                variant={selectedCategory === null && !activeSection ? "default" : "ghost"}
                size="sm"
                className="rounded-full shrink-0 text-xs h-8 px-3"
                style={selectedCategory === null && !activeSection ? { backgroundColor: accentColor, color: "#102A43" } : {}}
                onClick={() => { setSelectedCategory(null); setActiveSection(null); window.scrollTo({ top: 320, behavior: "smooth" }) }}
              >
                <UtensilsCrossed className="size-3 mr-1" /> Todo
              </Button>
              {store.categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={activeSection === cat.id ? "default" : "ghost"}
                  size="sm"
                  className="rounded-full shrink-0 text-xs h-8 px-3"
                  style={activeSection === cat.id ? { backgroundColor: accentColor, color: "#102A43" } : {}}
                  onClick={() => handleSectionClick(cat.id)}
                >
                  {cat.name}
                </Button>
              ))}
            </div>

            {/* Mobile category trigger */}
            <Button
              variant="outline"
              size="sm"
              className="md:hidden rounded-full h-8 px-3 gap-1"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              <UtensilsCrossed className="size-3" />
              Menú
              <ChevronRight className={`size-3 transition-transform ${showMobileMenu ? "rotate-90" : ""}`} />
            </Button>

            {/* Cart button */}
            <Button
              onClick={() => onCartOpen(true)}
              className="relative shrink-0 rounded-full h-9 px-3 gap-1.5"
              style={{ backgroundColor: accentColor, color: "#102A43" }}
            >
              <ShoppingCart className="size-4" />
              <span className="text-xs font-bold tabular-nums">{cartCount}</span>
            </Button>
          </div>

          {/* Mobile menu dropdown */}
          <AnimatePresence>
            {showMobileMenu && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden md:hidden"
              >
                <div className="flex flex-wrap gap-1.5 pb-3">
                  <Button
                    variant={selectedCategory === null ? "default" : "ghost"}
                    size="sm"
                    className="rounded-full text-xs h-8"
                    style={selectedCategory === null ? { backgroundColor: accentColor, color: "#102A43" } : {}}
                    onClick={() => { setSelectedCategory(null); setShowMobileMenu(false) }}
                  >
                    Todo
                  </Button>
                  {store.categories.map((cat) => (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.id ? "default" : "ghost"}
                      size="sm"
                      className="rounded-full text-xs h-8"
                      style={selectedCategory === cat.id ? { backgroundColor: accentColor, color: "#102A43" } : {}}
                      onClick={() => { setSelectedCategory(selectedCategory === cat.id ? null : cat.id); setShowMobileMenu(false) }}
                    >
                      {cat.name}
                    </Button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <main ref={menuRef} className="mx-auto max-w-6xl px-4 py-6 pb-28">
        {search && filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <Search className="size-10 text-muted-foreground/40" />
            <p className="text-sm font-semibold">No se encontraron productos</p>
          </div>
        ) : search ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                bcvRate={bcvRate}
                accentColor={accentColor}
              />
            ))}
          </div>
        ) : (
          <>
            {/* Open now indicator */}
            <div className="flex items-center gap-2 mb-6 px-1">
              <span className={`inline-block size-2 rounded-full ${isOpen ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
              <span className="text-xs font-semibold text-muted-foreground">
                {isOpen ? "Abierto ahora" : "Cerrado"} {hoursDisplay && `— ${hoursDisplay}`}
              </span>
            </div>

            {/* Category sections */}
            {categories.map((cat) => (
              <section
                key={cat.id}
                id={`section-${cat.id}`}
                ref={(el) => { sectionRefs.current[cat.id] = el }}
                className="mb-10 scroll-mt-24"
              >
                <div className="flex items-center gap-3 mb-4 border-b border-border pb-2">
                  <h2 className="text-lg font-bold">{cat.name}</h2>
                  <span className="text-xs text-muted-foreground">{cat.products.length} producto{cat.products.length !== 1 ? "s" : ""}</span>
                </div>
                {cat.products.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {cat.products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAddToCart={onAddToCart}
                        bcvRate={bcvRate}
                        accentColor={accentColor}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">No hay productos en esta categoría</p>
                )}
              </section>
            ))}

            {/* Uncategorized products */}
            {hasUncategorized && (
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4 border-b border-border pb-2">
                  <h2 className="text-lg font-bold">Otros productos</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {uncategorized.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={onAddToCart}
                      bcvRate={bcvRate}
                      accentColor={accentColor}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* ==================== FLOATING CART BAR ==================== */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3 shadow-lg">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-4" style={{ color: accentColor }} />
              <span className="font-semibold">{cartCount} producto{cartCount !== 1 ? "s" : ""}</span>
            </div>
            {cartCount > 0 && (
              <span className="text-muted-foreground font-semibold">
                ${cartTotal.toFixed(2)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {cartCount > 0 && (
              <Button
                onClick={() => onCartOpen(true)}
                className="rounded-full px-5 gap-2 h-10"
                style={{ backgroundColor: accentColor, color: "#102A43" }}
              >
                Ver Carrito
                <ChevronRight className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ==================== CART SHEET ==================== */}
      <CartSheet
        items={cart}
        onUpdateQty={onUpdateQty}
        onRemove={onRemove}
        onCheckout={onCheckout}
        isOpen={cartOpen}
        onClose={() => onCartOpen(false)}
      />

      {/* ==================== FOOTER ==================== */}
      <footer className="w-full bg-foreground">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="size-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
                  {store.logo ? (
                    <img src={store.logo} alt="" loading="lazy" className="size-6 rounded object-cover" />
                  ) : (
                    <UtensilsCrossed className="size-4 text-primary-foreground/70" />
                  )}
                </div>
                <span className="text-sm font-bold text-primary-foreground">{store.name}</span>
              </div>
              <p className="text-xs text-primary-foreground/60 leading-relaxed">
                {store.description || "Tu restaurante de confianza. Pedidos con entrega a domicilio."}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold tracking-wider text-primary-foreground/80 uppercase mb-3">Horario</h4>
              <div className="space-y-1.5">
                {hoursDisplay && (
                  <p className="flex items-center gap-2 text-xs text-primary-foreground/60">
                    <Clock className="size-3.5" />
                    {isOpen ? "Abierto" : "Cerrado"} &middot; {hoursDisplay}
                  </p>
                )}
                <p className="flex items-center gap-2 text-xs text-primary-foreground/60">
                  <Timer className="size-3.5" /> Tiempo estimado: 30-45 min
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold tracking-wider text-primary-foreground/80 uppercase mb-3">Contacto</h4>
              <div className="space-y-2">
                {store.whatsapp && (
                  <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-primary-foreground/60 hover:text-primary-foreground transition-colors">
                    <Phone className="size-3.5" /> WhatsApp
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
              <h4 className="text-xs font-semibold tracking-wider text-primary-foreground/80 uppercase mb-3">Métodos de pago</h4>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-md bg-primary-foreground/10 px-2 py-1 text-[10px] text-primary-foreground/60">Efectivo</span>
                <span className="rounded-md bg-primary-foreground/10 px-2 py-1 text-[10px] text-primary-foreground/60">Transferencia</span>
                <span className="rounded-md bg-primary-foreground/10 px-2 py-1 text-[10px] text-primary-foreground/60">Divisas</span>
                <span className="rounded-md bg-primary-foreground/10 px-2 py-1 text-[10px] text-primary-foreground/60">Pago móvil</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-primary-foreground/10 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <p className="text-[10px] text-primary-foreground/40">&copy; {new Date().getFullYear()} {store.name}. Todos los derechos reservados.</p>
            <p className="text-[10px] text-primary-foreground/30">Powered by Panitas</p>
          </div>
        </div>
      </footer>

      {/* ==================== WHATSAPP FLOAT ==================== */}
      {store.whatsapp && (
        <WhatsAppFloat phone={store.whatsapp} message="Hola, quiero hacer un pedido" />
      )}
    </div>
  )
}
