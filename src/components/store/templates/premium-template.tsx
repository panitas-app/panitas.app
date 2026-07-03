"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/store/product-card"
import { CartSheet } from "@/components/store/cart-sheet"
import { Carousel } from "@/components/ui/carousel"
import { WhatsAppFloat } from "@/components/ui/whatsapp-float"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import {
  Search, ShoppingCart, Store, Sparkles, ChevronRight,
  Menu, X, ArrowUpRight,
  Gem, Award, Shield,
} from "lucide-react"
import type { TemplateComponentProps } from "./types"

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
}

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.12 } },
}

export function PremiumTemplate({
  store, products, bcvRate, slug, accentColor,
  cart, cartCount, cartOpen, onCartOpen,
  onAddToCart, onUpdateQty, onRemove, onCheckout,
}: TemplateComponentProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
      const matchCategory = !selectedCategory || p.category?.id === selectedCategory
      return matchSearch && matchCategory
    })
  }, [products, search, selectedCategory])

  const heroImages = useMemo(() => {
    return products
      .filter((p) => p.images.length > 0)
      .slice(0, 5)
      .map((p) => p.images[0])
  }, [products])

  const featuredProducts = useMemo(() => products.filter((_, i) => i < 4), [products])

  const categories = useMemo(() => {
    return store.categories.map((c) => ({
      ...c,
      count: products.filter((p) => p.category?.id === c.id).length,
    }))
  }, [store.categories, products])

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ "--primary": accentColor, "--ring": accentColor } as React.CSSProperties}>
      {/* ==================== NAVBAR ==================== */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? "bg-background/90 backdrop-blur-xl shadow-sm" : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`size-9 overflow-hidden rounded-full transition-opacity ${scrolled ? "opacity-100" : "opacity-80"}`}>
              {store.logo ? (
                <img src={store.logo} alt={store.name} loading="lazy" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center bg-white/20 backdrop-blur-sm">
                  <Store className="size-4 text-white" />
                </div>
              )}
            </div>
            <span className={`text-sm font-bold tracking-wider transition-colors ${scrolled ? "text-foreground" : "text-white"}`}>
              {store.name}
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className={`text-xs tracking-widest uppercase transition-colors hover:opacity-70 ${scrolled ? "text-foreground" : "text-white"}`}>
              Inicio
            </button>
            {categories.length > 0 && (
              <button onClick={() => document.getElementById("coleccion")?.scrollIntoView({ behavior: "smooth" })}
                className={`text-xs tracking-widest uppercase transition-colors hover:opacity-70 ${scrolled ? "text-foreground" : "text-white"}`}>
                Colección
              </button>
            )}
            {store.description && (
              <button onClick={() => document.getElementById("historia")?.scrollIntoView({ behavior: "smooth" })}
                className={`text-xs tracking-widest uppercase transition-colors hover:opacity-70 ${scrolled ? "text-foreground" : "text-white"}`}>
                Historia
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onCartOpen(true)}
              className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                scrolled
                  ? "text-foreground bg-muted hover:bg-muted/80"
                  : "text-white bg-white/20 backdrop-blur-sm hover:bg-white/30"
              }`}
            >
              <ShoppingCart className="size-3.5" />
              {cartCount > 0 && <span>{cartCount}</span>}
            </button>
            <button
              onClick={() => setMobileMenu(!mobileMenu)}
              className={`md:hidden p-1.5 rounded-full transition-colors ${
                scrolled ? "text-foreground" : "text-white"
              }`}
            >
              {mobileMenu ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden bg-background border-t border-border md:hidden"
            >
              <div className="px-6 py-4 space-y-3">
                <button onClick={() => { setMobileMenu(false); window.scrollTo({ top: 0, behavior: "smooth" }) }}
                  className="block text-sm font-semibold w-full text-left">Inicio</button>
                {categories.length > 0 && (
                  <button onClick={() => { setMobileMenu(false); document.getElementById("coleccion")?.scrollIntoView({ behavior: "smooth" }) }}
                    className="block text-sm font-semibold w-full text-left">Colección</button>
                )}
                {store.description && (
                  <button onClick={() => { setMobileMenu(false); document.getElementById("historia")?.scrollIntoView({ behavior: "smooth" }) }}
                    className="block text-sm font-semibold w-full text-left">Historia</button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ==================== HERO ==================== */}
      <section ref={heroRef} className="relative min-h-screen flex items-end overflow-hidden">
        {heroImages.length > 0 ? (
          <Carousel images={heroImages} alt={store.name} aspectRatio="min-h-screen" />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: store.banner
                ? `url(${store.banner}) center/cover no-repeat`
                : `linear-gradient(135deg, #0a0a1a 0%, ${accentColor}88 50%, #0a0a1a 100%)`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-background/10" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 sm:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
          >
            <div className="max-w-2xl">
              <h1 className="text-4xl font-bold text-white sm:text-6xl lg:text-7xl tracking-tight">
                {store.name}
              </h1>
              {store.description && (
                <p className="mt-4 text-sm text-white/70 sm:text-base max-w-lg leading-relaxed">
                  {store.description}
                </p>
              )}
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  onClick={() => document.getElementById("coleccion")?.scrollIntoView({ behavior: "smooth" })}
                  className="rounded-full px-6 h-11 gap-2 text-sm"
                  style={{ backgroundColor: accentColor, color: "#102A43" }}
                >
                  Ver Colección <ArrowUpRight className="size-4" />
                </Button>
                {store.whatsapp && (
                  <Button
                    variant="outline"
                    className="rounded-full px-6 h-11 gap-2 text-sm border-white/30 text-white hover:bg-white/10"
                    onClick={() => window.open(`https://wa.me/${store.whatsapp!.replace(/\D/g, "")}`, "_blank")}
                  >
                    Contactar
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
        >
          <span className="text-[10px] text-white/40 tracking-widest uppercase">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="size-1 rounded-full bg-white/40"
          />
        </motion.div>
      </section>

      {/* ==================== CATEGORIES ("COLECCIÓN") ==================== */}
      {categories.length > 0 && (
        <section id="coleccion" className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="text-center mb-14">
              <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground/60">Explora</span>
              <h2 className="text-2xl font-bold mt-2 sm:text-3xl">La Colección</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">Cada pieza cuenta una historia.</p>
            </motion.div>

            <motion.div variants={fadeUp} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  className="group relative overflow-hidden rounded-2xl bg-muted aspect-[4/3] transition-all duration-500 hover:shadow-xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <p className="text-lg font-bold text-white">{cat.name}</p>
                    <p className="text-xs text-white/60">{cat.count} artículo{cat.count !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="absolute right-5 top-5 size-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowUpRight className="size-4 text-white" />
                  </div>
                </button>
              ))}
            </motion.div>
          </motion.div>
        </section>
      )}

      {/* ==================== FEATURED PRODUCTS ==================== */}
      {featuredProducts.length > 0 && !selectedCategory && !search && (
        <section className="mx-auto max-w-7xl px-6 pb-20 sm:pb-28">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="text-center mb-12">
              <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground/60">Selección</span>
              <h2 className="text-2xl font-bold mt-2 sm:text-3xl">Destacados</h2>
            </motion.div>

            <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {featuredProducts.map((product) => (
                <div key={product.id} className="transform transition-all duration-500 hover:scale-[1.02]">
                  <ProductCard
                    product={product}
                    onAddToCart={onAddToCart}
                    bcvRate={bcvRate}
                    accentColor={accentColor}
                  />
                </div>
              ))}
            </motion.div>
          </motion.div>
        </section>
      )}

      {/* ==================== STORY / ABOUT ==================== */}
      {store.description && (
        <section id="historia" className="bg-muted/30">
          <div className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="text-center max-w-3xl mx-auto"
            >
              <motion.div variants={fadeUp}>
                <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground/60">Nuestra Historia</span>
                <h2 className="text-2xl font-bold mt-2 sm:text-3xl">{store.name}</h2>
                <div className="mt-6 mx-auto w-12 h-px bg-muted-foreground/20" />
                <p className="mt-6 text-sm text-muted-foreground leading-relaxed sm:text-base">
                  {store.description}
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ==================== SEARCH + ALL PRODUCTS ==================== */}
      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <div className="max-w-md mx-auto mb-10">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar en la colección..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-12 rounded-full border border-border bg-muted/50 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
          </div>

          <motion.div variants={fadeUp}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs tracking-[0.2em] uppercase text-muted-foreground/60">
                {search || selectedCategory ? "Resultados" : `Todos los artículos (${filteredProducts.length})`}
              </h3>
              {(search || selectedCategory) && (
                <button
                  onClick={() => { setSearch(""); setSelectedCategory(null) }}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
                <Search className="size-10 text-muted-foreground/40" />
                <p className="text-sm font-semibold">No se encontraron artículos</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="transform transition-all duration-300 hover:scale-[1.02]"
                  >
                    <ProductCard
                      product={product}
                      onAddToCart={onAddToCart}
                      bcvRate={bcvRate}
                      accentColor={accentColor}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* ==================== VALUE PROPS ==================== */}
      {!selectedCategory && !search && (
        <section className="mx-auto max-w-7xl px-6 pb-20">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="grid grid-cols-1 gap-6 sm:grid-cols-3"
          >
            {[
              { icon: Gem, title: "Calidad Superior", desc: "Cada producto es seleccionado cuidadosamente para garantizar la mejor calidad." },
              { icon: Award, title: "Autenticidad Garantizada", desc: "Todos nuestros artículos son 100% originales con garantía de autenticidad." },
              { icon: Shield, title: "Compra Segura", desc: "Pago coordinado con protección al comprador y atención personalizada." },
            ].map((item) => (
              <motion.div key={item.title} variants={fadeUp} className="text-center p-8 rounded-2xl bg-muted/30 border border-border/50">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted mb-4">
                  <item.icon className="size-6" style={{ color: accentColor }} />
                </div>
                <h4 className="text-sm font-bold mb-2">{item.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {/* ==================== FOOTER ==================== */}
      <footer className="w-full bg-foreground">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
                  {store.logo ? (
                    <img src={store.logo} alt="" loading="lazy" className="size-7 rounded object-cover" />
                  ) : (
                    <Sparkles className="size-5 text-primary-foreground/70" />
                  )}
                </div>
                <div>
                  <span className="text-sm font-bold text-primary-foreground">{store.name}</span>
                  <p className="text-[10px] text-primary-foreground/40 tracking-widest uppercase">Colección Exclusiva</p>
                </div>
              </div>
              <p className="text-xs text-primary-foreground/60 leading-relaxed max-w-xs">
                {store.description || "Tienda de artículos exclusivos. Cada pieza es única."}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold tracking-widest text-primary-foreground/80 uppercase mb-4">Navegación</h4>
              <div className="space-y-2.5">
                <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="block text-xs text-primary-foreground/60 hover:text-primary-foreground transition-colors">Inicio</button>
                <button onClick={() => document.getElementById("coleccion")?.scrollIntoView({ behavior: "smooth" })}
                  className="block text-xs text-primary-foreground/60 hover:text-primary-foreground transition-colors">Colección</button>
                {store.whatsapp && (
                  <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="block text-xs text-primary-foreground/60 hover:text-primary-foreground transition-colors">Contacto</a>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold tracking-widest text-primary-foreground/80 uppercase mb-4">Contacto</h4>
              <div className="space-y-2.5">
                {store.whatsapp && (
                  <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-primary-foreground/60 hover:text-primary-foreground transition-colors">
                    <Sparkles className="size-3.5" /> WhatsApp
                  </a>
                )}
                {store.address && (
                  <p className="flex items-center gap-2 text-xs text-primary-foreground/60">
                    <Store className="size-3.5" /> {store.address}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold tracking-widest text-primary-foreground/80 uppercase mb-4">Pagos</h4>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-primary-foreground/10 px-3 py-1 text-[10px] text-primary-foreground/60">Divisas</span>
                <span className="rounded-full bg-primary-foreground/10 px-3 py-1 text-[10px] text-primary-foreground/60">Transferencia</span>
                <span className="rounded-full bg-primary-foreground/10 px-3 py-1 text-[10px] text-primary-foreground/60">Zelle</span>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-primary-foreground/10 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p className="text-[10px] text-primary-foreground/30 tracking-wider">
              &copy; {new Date().getFullYear()} {store.name}. Todos los derechos reservados.
            </p>
            <p className="text-[10px] text-primary-foreground/20 tracking-widest uppercase">Powered by Panitas</p>
          </div>
        </div>
      </footer>

      {/* ==================== FLYOUTS ==================== */}
      <CartSheet
        items={cart}
        onUpdateQty={onUpdateQty}
        onRemove={onRemove}
        onCheckout={onCheckout}
        isOpen={cartOpen}
        onClose={() => onCartOpen(false)}
      />

      <button
        onClick={() => onCartOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full px-5 py-3 shadow-lg shadow-black/10 transition-all active:scale-95 hover:brightness-105"
        style={{ backgroundColor: accentColor, color: "#102A43" }}
      >
        <ShoppingCart className="size-5" />
        <span className="text-sm font-bold tabular-nums">{cartCount}</span>
      </button>

      {store.whatsapp && (
        <WhatsAppFloat phone={store.whatsapp} message="Hola, quiero información sobre su colección exclusiva" />
      )}
    </div>
  )
}
