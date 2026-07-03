"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { createPortal } from "react-dom"
import { ChevronDown, Phone } from "lucide-react"
import { COUNTRY_CODES } from "@/lib/phone-codes"
import type { CountryCode } from "@/lib/phone-codes"

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  onEnter?: () => void
}

function parsePhone(raw: string, dial: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ""
  const code = COUNTRY_CODES.find((c) => c.dial === dial)
  if (code) {
    const prefix = code.dial.replace(/\D/g, "")
    if (trimmed.startsWith("+" + prefix)) {
      return trimmed.slice(prefix.length + 1)
    }
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length)
    }
  }
  return trimmed.replace(/^\+/, "").replace(/^\d{1,3}/, "")
}

export function PhoneInput({ value, onChange, placeholder, autoFocus, onEnter }: Props) {
  const selectedCode = useMemo(() => {
    const matched = COUNTRY_CODES.find((c) => value.startsWith(c.dial.replace(/\D/g, "").slice(0, 3)) || value.startsWith(c.dial))
    return matched || COUNTRY_CODES[0]
  }, [value])

  const numberPart = useMemo(() => {
    return parsePhone(value, selectedCode.dial)
  }, [value, selectedCode.dial])

  const [isOpen, setIsOpen] = useState(false)
  const [menuTop, setMenuTop] = useState(0)
  const [menuLeft, setMenuLeft] = useState(0)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const updatePosition = useCallback(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuTop(rect.top - 8)
      setMenuLeft(rect.left)
    }
  }, [isOpen])

  useEffect(() => {
    updatePosition()
    window.addEventListener("scroll", updatePosition, true)
    window.addEventListener("resize", updatePosition)
    return () => {
      window.removeEventListener("scroll", updatePosition, true)
      window.removeEventListener("resize", updatePosition)
    }
  }, [isOpen, updatePosition])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        !(e.target as Element)?.closest?.("[data-phone-dropdown]")
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handleCodeSelect(code: CountryCode) {
    const full = `${code.dial}${numberPart}`
    onChange(full)
    setIsOpen(false)
    inputRef.current?.focus()
  }

  function handleNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "")
    onChange(`${selectedCode.dial}${raw}`)
  }

  return (
    <div className="flex gap-2">
      <div>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-14 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium hover:border-primary/50 transition-colors"
        >
          <span className="text-lg leading-none">{selectedCode.flag}</span>
          <span className="text-foreground">{selectedCode.dial}</span>
          <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      <div className="relative flex-1">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Phone className="size-4" />
        </span>
        <input
          ref={inputRef}
          type="tel"
          value={numberPart}
          onChange={handleNumberChange}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          placeholder={placeholder || "412 123 4567"}
          autoFocus={autoFocus}
          className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {isOpen && typeof document !== "undefined" &&
        createPortal(
          <div
            data-phone-dropdown
            style={{
              position: "fixed",
              top: menuTop,
              left: menuLeft,
              zIndex: 9999,
            }}
            className="w-[280px] rounded-xl border bg-white shadow-2xl"
          >
            <div className="max-h-[260px] overflow-y-auto p-1">
              {COUNTRY_CODES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCodeSelect(c)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted ${
                    c.code === selectedCode.code ? "bg-primary/5 font-medium" : ""
                  }`}
                >
                  <span className="text-lg leading-none">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-muted-foreground text-xs">{c.dial}</span>
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
