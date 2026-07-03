"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import {
  User, Store, Handshake, Package, Scissors, Sparkles, Heart, Hand,
  Dumbbell, Camera, ClipboardList, BookOpen, Music, Palette,
  UtensilsCrossed, ShoppingBag, Truck, Shirt, Footprints, Gem,
  Smartphone, Home, Gamepad2, Trophy, IceCream, Croissant, Wine,
  Pill, PawPrint, Flower2, Wrench, Car, Users,
} from "lucide-react"

const iconMap: Record<string, LucideIcon> = {
  User, Store, Handshake, Package, Scissors, Sparkles, Heart, Hand,
  Dumbbell, Camera, ClipboardList, BookOpen, Music, Palette,
  UtensilsCrossed, ShoppingBag, Truck, Shirt, Footprints, Gem,
  Smartphone, Home, Gamepad2, Trophy, IceCream, Croissant, Wine,
  Pill, PawPrint, Flower2, Wrench, Car, Users,
}

interface Props {
  value: string
  label: string
  description?: string
  icon?: string
  selected: boolean
  onSelect: () => void
}

export function QuizOptionCard({ value, label, description, icon, selected, onSelect }: Props) {
  const IconComponent = icon ? iconMap[icon] : undefined

  return (
    <motion.button
      onClick={onSelect}
      className={cn(
        "relative flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all",
        selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card hover:border-primary/40 hover:bg-muted/30 hover:shadow-sm"
      )}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      {IconComponent && (
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted">
          <IconComponent className="size-5 text-primary icon-hover-bounce" />
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{label}</p>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
        )}
      >
        {selected && <Check className="size-4" />}
      </div>
    </motion.button>
  )
}
