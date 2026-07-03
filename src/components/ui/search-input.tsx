"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Search, X } from "lucide-react"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  large?: boolean
  autoFocus?: boolean
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
  className,
  large,
  autoFocus,
}: SearchInputProps) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus()
  }, [autoFocus])

  return (
    <div
      className={cn(
        "relative flex items-center transition-all duration-200",
        large ? "h-14" : "h-10",
        focused ? "ring-2 ring-primary/30" : "",
        className
      )}
    >
      <Search
        className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors",
          large ? "size-5" : "size-4",
          focused ? "text-primary" : ""
        )}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none",
          large ? "h-full pl-12 pr-12 text-base" : "h-full pl-10 pr-10 text-sm"
        )}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors",
            large ? "right-4" : "right-3"
          )}
          aria-label="Limpiar búsqueda"
        >
          <X className={large ? "size-5" : "size-4"} />
        </button>
      )}
    </div>
  )
}
