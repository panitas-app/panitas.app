"use client"

import { useState, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/store/product-card"
import { CartSheet } from "@/components/store/cart-sheet"
import { SearchInput } from "@/components/ui/search-input"
import { FilterChip } from "@/components/ui/filter-chip"
import { Carousel } from "@/components/ui/carousel"
import { WhatsAppFloat } from "@/components/ui/whatsapp-float"
import { AnimatePresence, motion } from "framer-motion"
import {
  Search, ShoppingCart, Store, Calendar,
  ChevronRight, MapPin, Clock, Phone, Mail,
  Heart, Sparkles, ArrowRight,
  Package, Shield, CreditCard, Globe,
} from "lucide-react"
import type { TemplateComponentProps } from "./types"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export function ModernTemplate({
  store, products, bcvRate, slug, accentColor,
  cart, cartCount, cartOpen, onCartOpen,
  onAddToCart, onUpdateQty, onRemove, onCheckout,
  canBook,
}: TemplateComponentProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const featuredRef = useRef<HTMLDivElement>(null)

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
      const matchCategory = !selectedCategory || p.category?.id === selectedCategory
      return matchSearch && matchCategory
    })
  }, [products, search, selectedCategory])

  const socialFields = ["instagram", "facebook", "tiktok", "twitter", "youtube", "linkedin"] as const
  const socialLinks = useMemo(() => {
    const s = store as any
    return socialFields.filter((k) => s[k]).map((k) => ({ key: k, url: s[k], label: k.charAt(0).toUpperCase() + k.slice(1) }))
  }, [store])

  const heroImages = useMemo(() => {
    return products
      .filter((p) => p.images.length > 0)
      .slice(0, 5)
      .map((p) => p.images[0])
  }, [products])

  const featuredProducts = useMemo(() => {
    return products.filter((_, i) => i < 4)
  }, [products])

  const categories = useMemo(() => {
    return store.categories.map((c) => ({
      ...c,
      count: products.filter((p) => p.category?.id === c.id).length,
    }))
  }, [store.categories, products])

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ "--primary": accentColor, "--ring": accentColor } as React.CSSProperties}>
      {/* ==================== HEADER / HERO ==================== */}
      <header>
        {heroImages.length >= 2 ? (
          <div className="relative">
            <Carousel images={heroImages} alt={store.name} aspectRatio="aspect-[21/9] max-h-[70vh]" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/20 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 sm:bottom-10 sm:left-10">
              <div className="mx-auto max-w-6xl">
                <h1 className="text-2xl font-bold text-white drop-shadow-lg sm:text-4xl">{store.name}</h1>
                {store.description && (
                  <p className="mt-1 max-w-xl text-xs text-white/80 drop-shadow sm:text-sm">{store.description}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="relative flex min-h-[280px] items-end overflow-hidden sm:min-h-[360px]"
            style={
              store.banner
                ? { backgroundImage: `url(${store.banner})`, backgroundSize: "cover", backgroundPosition: "center" }
                : { background: `linear-gradient(135deg, #184BBF 0%, ${accentColor} 100%)` }
            }
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
            <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-8 sm:pb-12">
              <h1 className="text-2xl font-bold text-white drop-shadow-lg sm:text-4xl">{store.name}</h1>
              {store.description && (
                <p className="mt-1 max-w-xl text-xs text-white/80 drop-shadow sm:text-sm">{store.description}</p>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ==================== STORE INFO BAR ==================== */}
      <div className="mx-auto max-w-6xl px-4">
        <div className="relative -mt-10 flex flex-col items-center sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col items-center sm:flex-row sm:items-end gap-3 sm:gap-5">
            <div className="size-24 shrink-0 overflow-hidden rounded-2xl border-4 border-background shadow-lg bg-muted sm:size-28">
              {store.logo ? (
                <img src={store.logo} alt={store.name} loading="lazy" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <Store className="size-8" />
                </div>
              )}
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-xl font-bold">{store.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {store.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" /> {store.address}
                  </span>
                )}
                {store.storeHours && <HoursDisplay storeHours={store.storeHours} />}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 sm:mt-0">
            {canBook && (
              <Button
                onClick={() => router.push(`/store/${slug}/booking`)}
                className="rounded-full px-4 h-9 text-xs font-semibold whitespace-nowrap gap-1.5"
                style={{ backgroundColor: accentColor, color: "#102A43" }}
              >
                <Calendar className="size-3.5" /> Reservar Cita
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ==================== SEARCH + CATEGORIES BAR ==================== */}
      <div className="mx-auto max-w-6xl px-4 mt-6">
        <div className="flex items-center gap-4">
          <div className="hidden flex-1 sm:block max-w-md">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar productos..." />
          </div>
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="flex sm:hidden size-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <Search className="size-4" />
          </button>
          <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1 sm:flex-none">
            <FilterChip label="Todo" active={selectedCategory === null} onClick={() => setSelectedCategory(null)} />
            {categories.map((cat) => (
              <FilterChip
                key={cat.id}
                label={`${cat.name} (${cat.count})`}
                active={selectedCategory === cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                onRemove={() => setSelectedCategory(null)}
              />
            ))}
          </div>
        </div>

        <AnimatePresence>
          {showMobileSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden sm:hidden"
            >
              <div className="pt-3 pb-2">
                <SearchInput value={search} onChange={setSearch} placeholder="Buscar productos..." autoFocus />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ==================== CATEGORIES ==================== */}
      {categories.length > 0 && !selectedCategory && !search && (
        <section className="mx-auto max-w-6xl px-4 mt-8">
          <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-3">Categorías</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="rounded-full border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                {cat.name}
                <span className="ml-1.5 text-xs text-muted-foreground">({cat.count})</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ==================== FEATURED PRODUCTS ==================== */}
      {featuredProducts.length > 0 && !selectedCategory && !search && (
        <section className="mx-auto max-w-6xl px-4 mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Destacados</h2>
            <button
              onClick={() => featuredRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="text-xs font-semibold flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver todos <ArrowRight className="size-3" />
            </button>
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          >
            {featuredProducts.map((product) => (
              <motion.div key={product.id} variants={itemVariants}>
                <ProductCard
                  product={product}
                  onAddToCart={onAddToCart}
                  bcvRate={bcvRate}
                  accentColor={accentColor}
                />
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {/* ==================== FEATURES BANNER ==================== */}
      {!selectedCategory && !search && (
        <section className="mx-auto max-w-6xl px-4 mt-10">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: Package, label: "Envío coordinado" },
              { icon: Shield, label: "Pago seguro" },
              { icon: CreditCard, label: "Pagos en divisas" },
              { icon: Heart, label: "Atención personalizada" },
            ].map((feat) => (
              <div key={feat.label} className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 py-5 px-3 text-center">
                <div className="flex size-10 items-center justify-center rounded-full" style={{ backgroundColor: accentColor + "20" }}>
                  <feat.icon className="size-5" style={{ color: accentColor }} />
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground">{feat.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==================== ALL PRODUCTS ==================== */}
      <section ref={featuredRef} className="mx-auto max-w-6xl px-4 mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
            {search || selectedCategory ? "Resultados" : "Todos los productos"}
          </h2>
          <span className="text-xs text-muted-foreground">{filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""}</span>
        </div>
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <Search className="size-10 text-muted-foreground/40" />
            <p className="text-sm font-semibold">No se encontraron productos</p>
            <p className="text-xs">Prueba con otros términos o cambia de categoría.</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          >
            {filteredProducts.map((product) => (
              <motion.div key={product.id} variants={itemVariants}>
                <ProductCard
                  product={product}
                  onAddToCart={onAddToCart}
                  bcvRate={bcvRate}
                  accentColor={accentColor}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* ==================== ABOUT SECTION ==================== */}
      {store.description && !selectedCategory && !search && (
        <section className="mx-auto max-w-6xl px-4 mt-16">
          <div className="rounded-2xl bg-muted/30 p-8 sm:p-12 text-center">
            <h2 className="text-lg font-bold mb-3">Sobre {store.name}</h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">{store.description}</p>
          </div>
        </section>
      )}

      {/* ==================== FOOTER ==================== */}
      <footer className="mt-16 w-full bg-foreground">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
              <p className="text-xs text-primary-foreground/60 leading-relaxed">
                {store.description || "Tu tienda de confianza en Panitas."}
              </p>
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
              <h4 className="text-xs font-semibold tracking-wider text-primary-foreground/80 uppercase mb-3">Links</h4>
              <div className="space-y-2">
                <button onClick={() => router.push(`/store/${slug}`)}
                  className="block text-xs text-primary-foreground/60 hover:text-primary-foreground transition-colors">
                  Inicio
                </button>
                {store.whatsapp && (
                  <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="block text-xs text-primary-foreground/60 hover:text-primary-foreground transition-colors">
                    Contacto
                  </a>
                )}
              </div>
            </div>

            {socialLinks.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold tracking-wider text-primary-foreground/80 uppercase mb-3">Redes</h4>
                <div className="flex gap-3 flex-wrap">
                  {socialLinks.map((s) => (
                    <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer"
                      className="flex size-9 items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground/60 hover:bg-primary-foreground/20 hover:text-primary-foreground transition-all"
                      title={s.label}>
                      <Globe className="size-4" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-primary-foreground/10 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <p className="text-[10px] text-primary-foreground/40">&copy; {new Date().getFullYear()} {store.name}. Todos los derechos reservados.</p>
            <p className="text-[10px] text-primary-foreground/30">Powered by Panitas</p>
          </div>
        </div>
      </footer>

      {/* ==================== FLOATING COMPONENTS ==================== */}
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
        className="fixed bottom-24 right-6 z-40 flex items-center gap-2.5 rounded-full px-5 py-3 shadow-lg shadow-black/10 transition-all active:scale-95 hover:brightness-105"
        style={{ backgroundColor: accentColor, color: "#102A43" }}
      >
        <ShoppingCart className="size-5" />
        <span className="text-sm font-bold whitespace-nowrap">{cartCount}</span>
      </button>

      {store.whatsapp && (
        <WhatsAppFloat phone={store.whatsapp} message="Hola, quiero información sobre sus productos" />
      )}
    </div>
  )
}

function HoursDisplay({ storeHours }: { storeHours: string }) {
  const todayKey = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"][new Date().getDay()]
  let hoursDisplay: string | null = null
  let isOpen = false
  try {
    const schedule = JSON.parse(storeHours)
    const today = schedule[todayKey]
    if (today) {
      if (today.type === "Cerrado") {
        hoursDisplay = "Cerrado hoy"
        isOpen = false
      } else if (today.type === "Horario Corrido") {
        hoursDisplay = `${today.open} - ${today.close}`
        isOpen = true
      } else if (today.type === "Horario Comercial") {
        hoursDisplay = `${today.open} - ${today.close}, ${today.reopen} - ${today.reclose}`
        isOpen = true
      }
    }
  } catch {}
  return hoursDisplay ? (
    <span className="flex items-center gap-1">
      <Clock className="size-3" />
      <span className={`inline-block size-1.5 rounded-full ${isOpen ? "bg-green-500" : "bg-red-500"}`} />
      {isOpen ? "Abierto" : "Cerrado"} &middot; {hoursDisplay}
    </span>
  ) : null
}
