import { cn } from "@/lib/utils"
import { ImageOff } from "lucide-react"

interface GalleryProps {
  images: string[]
  alt?: string
  className?: string
  columns?: 2 | 3 | 4
}

export function Gallery({ images, alt = "", className, columns = 3 }: GalleryProps) {
  if (images.length === 0) return null

  return (
    <div
      className={cn(
        "grid gap-2",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-2 sm:grid-cols-3",
        columns === 4 && "grid-cols-2 sm:grid-cols-4",
        className
      )}
    >
      {images.map((src, i) => (
        <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
          {src ? (
            <img
              src={src}
              alt={`${alt} ${i + 1}`}
              className="size-full object-cover transition-transform duration-300 hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground/40">
              <ImageOff className="size-8" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
