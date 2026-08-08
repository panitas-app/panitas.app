"use client"

import { Mic, X } from "lucide-react"

import type { ChatAttachment } from "@/hooks/use-assistant-chat"

/**
 * Previsualización de archivos adjuntos del usuario (FASE 5B).
 */
export function AttachmentPreview({
  attachments,
  onRemove,
}: {
  attachments: ChatAttachment[]
  onRemove: (id: string) => void
}) {
  if (attachments.length === 0) return null

  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {attachments.map((attachment) => {
        const isImage = attachment.type.startsWith("image/")
        return (
          <div
            key={attachment.id}
            className="flex items-center gap-2 rounded-xl border border-border bg-background/80 py-1 pl-1 pr-2 text-xs shadow-sm"
          >
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={attachment.dataUrl} alt={attachment.name} className="size-7 rounded-lg object-cover" />
            ) : (
              <Mic className="size-4 text-muted-foreground" />
            )}
            <span className="max-w-36 truncate text-foreground">{attachment.name}</span>
            <button
              type="button"
              onClick={() => onRemove(attachment.id)}
              aria-label={`Quitar adjunto ${attachment.name}`}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
