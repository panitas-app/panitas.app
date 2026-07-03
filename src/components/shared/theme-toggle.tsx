"use client"

import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={cn(
        "flex items-center justify-center rounded-full p-2 transition-all duration-300",
        theme === "dark"
          ? "text-amber-400 hover:bg-white/10"
          : "text-slate-500 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/10",
        className
      )}
      aria-label="Cambiar modo oscuro"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}
