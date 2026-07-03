"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface CarouselProps {
  images: string[]
  alt?: string
  className?: string
  aspectRatio?: string
}

export function Carousel({ images, alt = "", className, aspectRatio = "aspect-square" }: CarouselProps) {
  const [current, setCurrent] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const goTo = useCallback((index: number) => {
    setCurrent(index)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const prev = useCallback(() => {
    setCurrent((c) => (c === 0 ? images.length - 1 : c - 1))
  }, [images.length])

  const next = useCallback(() => {
    setCurrent((c) => (c === images.length - 1 ? 0 : c + 1))
  }, [images.length])

  useEffect(() => {
    if (images.length <= 1) return
    intervalRef.current = setInterval(next, 5000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [images.length, next])

  if (images.length === 0) return null

  return (
    <div
      className={cn("relative overflow-hidden rounded-xl bg-muted", aspectRatio, className)}
      onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
      onTouchMove={(e) => setTouchEnd(e.touches[0].clientX)}
      onTouchEnd={() => {
        if (touchStart - touchEnd > 50) next()
        if (touchEnd - touchStart > 50) prev()
      }}
    >
      <div
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {images.map((src, i) => (
          <div key={i} className="relative h-full w-full shrink-0">
            <img src={src} alt={`${alt} ${i + 1}`} className="size-full object-cover" loading={i === 0 ? "eager" : "lazy"} />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-background/80 text-foreground shadow-xs hover:bg-background transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-background/80 text-foreground shadow-xs hover:bg-background transition-colors"
            aria-label="Siguiente"
          >
            <ChevronRight className="size-4" />
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={cn(
                  "size-2 rounded-full transition-all",
                  i === current ? "bg-primary w-4" : "bg-background/60 hover:bg-background/80"
                )}
                aria-label={`Imagen ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
