"use client"

import { MemoryPanel } from "@/components/business-memory/memory-panel"

/**
 * Panitas Business Memory (FASE 5G).
 * Panel de gestión de la memoria estable del negocio: ver, editar, eliminar
 * recuerdos, activar/desactivar el aprendizaje automático y restablecer.
 */
export default function MemoryPage() {
  return (
    <div className="h-full p-4 sm:p-6">
      <MemoryPanel />
    </div>
  )
}
