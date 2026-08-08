"use client"

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react"
import { ArrowUp, Command, Mic, Paperclip, Square } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import type { AssistantChat } from "@/hooks/use-assistant-chat"
import { AttachmentPreview } from "./attachment-preview"

export interface ChatCommand {
  prefix: string
  label: string
  description: string
  prompt: string
}

interface ChatInputProps {
  chat: AssistantChat
  placeholder?: string
  disabled?: boolean
  commands?: ChatCommand[]
  className?: string
}

const ACCEPTED_TYPES = ["image/", "audio/", "application/pdf"]
const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_FILES = 4

/**
 * Input de chat estilo ChatGPT (FASE 5B).
 * Contenedor redondeado, textarea auto-ajustable, botón de adjuntar (imágenes,
 * audio, PDF), grabación de audio, drag & drop de archivos y envío.
 */
export function ChatInput({ chat, placeholder = "Pregúntale cualquier cosa a Panitas...", disabled, commands, className }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const commandPaletteRef = useRef<HTMLDivElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [activeCommand, setActiveCommand] = useState(-1)
  const [recording, setRecording] = useState(false)

  const busy = disabled || chat.loading

  const visibleCommands = useCallback(() => {
    if (!commands || commands.length === 0) return []
    const prefix = chat.value.trim().toLowerCase()
    if (!prefix.startsWith("/") || prefix.includes(" ")) return []
    return commands.filter((cmd) => cmd.prefix.toLowerCase().startsWith(prefix))
  }, [commands, chat.value])

  const availableCommands = visibleCommands()
  const openPalette = showCommandPalette && availableCommands.length > 0

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const trigger = document.querySelector("[data-command-trigger]")
      if (commandPaletteRef.current && !commandPaletteRef.current.contains(target) && !trigger?.contains(target)) {
        setShowCommandPalette(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
  }, [chat.value])

  function acceptFiles(files: FileList | File[]) {
    const list = Array.from(files)
    const room = MAX_FILES - chat.attachments.length
    if (room <= 0) {
      toast.info(`Puedes adjuntar hasta ${MAX_FILES} archivos.`)
      return
    }
    const accepted = list.slice(0, room).filter((file) => {
      if (!ACCEPTED_TYPES.some((prefix) => file.type.startsWith(prefix)) && file.type !== "application/pdf") return false
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name} supera los 5 MB.`)
        return false
      }
      return true
    })
    if (accepted.length > 0) chat.addAttachments(accepted)
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    if (event.dataTransfer.files.length > 0) acceptFiles(event.dataTransfer.files)
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (files && files.length > 0) acceptFiles(files)
    event.target.value = ""
  }

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop()
      return
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Tu navegador no soporta grabación de audio.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const type = recorder.mimeType || "audio/webm"
        const blob = new Blob(chunksRef.current, { type })
        if (blob.size === 0) {
          setRecording(false)
          return
        }
        const file = new File([blob], `audio-${Date.now()}.webm`, { type })
        chat.addAttachments([file])
        setRecording(false)
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      toast.error("No se pudo acceder al micrófono. Revisa los permisos.")
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (openPalette) {
      const available = availableCommands
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveCommand((prev) => (prev < available.length - 1 ? prev + 1 : 0))
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveCommand((prev) => (prev > 0 ? prev - 1 : available.length - 1))
        return
      }
      if (e.key === "Tab" || e.key === "Enter") {
        const command = available[Math.max(activeCommand, 0)]
        if (command) {
          e.preventDefault()
          chat.setValue(command.prompt + " ")
          setShowCommandPalette(false)
          requestAnimationFrame(() => textareaRef.current?.focus())
          return
        }
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setShowCommandPalette(false)
        return
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (chat.value.trim() && !busy) chat.handleSend()
    }
  }

  const hasText = chat.value.trim().length > 0

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        if (e.currentTarget === e.target) setIsDragging(false)
      }}
      onDrop={onDrop}
      className={cn("relative", className)}
    >
      <AttachmentPreview attachments={chat.attachments} onRemove={chat.removeAttachment} />

      <div
        className={cn(
          "relative flex items-end gap-1.5 rounded-2xl border border-border/70 bg-background/80 p-2 shadow-sm backdrop-blur-xl transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40",
          isDragging && "border-brand-primary/60 ring-4 ring-brand-primary/10",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,audio/*,application/pdf"
          multiple
          className="hidden"
          onChange={onFileChange}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Adjuntar archivo"
          title="Adjuntar imagen, audio o PDF"
          className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          disabled={busy || recording}
        >
          <Paperclip className="size-4" />
        </button>

        <button
          type="button"
          onClick={toggleRecording}
          aria-label={recording ? "Detener grabación" : "Grabar audio"}
          title={recording ? "Detener grabación" : "Grabar audio"}
          className={cn(
            "mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50",
            recording && "bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive",
          )}
          disabled={busy}
        >
          {recording ? <Square className="size-3.5" /> : <Mic className="size-4" />}
        </button>

        {commands && commands.length > 0 ? (
          <button
            type="button"
            data-command-trigger
            onClick={(e) => {
              e.stopPropagation()
              setShowCommandPalette((prev) => !prev)
            }}
            aria-label="Comandos rápidos"
            title="Comandos rápidos"
            className={cn(
              "mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50",
              showCommandPalette && "bg-muted text-foreground",
            )}
            disabled={busy || recording}
          >
            <Command className="size-4" />
          </button>
        ) : null}

        <textarea
          ref={textareaRef}
          value={chat.value}
          onChange={(e) => {
            chat.setValue(e.target.value)
            const value = e.target.value.trim()
            if (commands && commands.length > 0 && value.startsWith("/") && !value.includes(" ")) {
              setActiveCommand(0)
              setShowCommandPalette(true)
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={recording ? "Grabando audio… habla ahora" : placeholder}
          rows={1}
          disabled={busy}
          className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-1.5 py-2 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60 disabled:opacity-50"
          style={{ overflow: "hidden" }}
        />

        <button
          type="button"
          onClick={() => chat.handleSend()}
          aria-label="Enviar mensaje"
          disabled={!hasText || busy}
          className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground/50 disabled:shadow-none"
        >
          <ArrowUp className="size-4" />
        </button>
      </div>

      {openPalette && commands ? (
        <div
          ref={commandPaletteRef}
          className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-xl border border-border bg-background shadow-xl shadow-black/5 backdrop-blur-xl"
        >
          <div className="py-1.5">
            {availableCommands.map((cmd, index) => (
              <button
                key={cmd.prefix}
                type="button"
                onClick={() => {
                  chat.setValue(cmd.prompt + " ")
                  setShowCommandPalette(false)
                  requestAnimationFrame(() => textareaRef.current?.focus())
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                  activeCommand === index ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{cmd.label}</span>
                  <span className="block truncate text-xs text-muted-foreground/70">{cmd.description}</span>
                </span>
                <span className="ml-auto shrink-0 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {cmd.prefix}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
