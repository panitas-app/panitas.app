"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { CheckCircle, Loader2, Sparkles } from "lucide-react"

interface Props {
  negocioId: string
  onComplete: () => void
}

const TASKS = [
  { id: "analyzing", label: "Analizando tu tipo de negocio" },
  { id: "description", label: "Generando descripción profesional" },
  { id: "categories", label: "Creando categorías iniciales" },
  { id: "recommendations", label: "Configurando recomendaciones" },
  { id: "store", label: "Preparando tu tienda" },
  { id: "finalizing", label: "Finalizando" },
]

export function AiPreparingScreen({ negocioId, onComplete }: Props) {
  const [completedTasks, setCompletedTasks] = useState<string[]>([])
  const [currentTask, setCurrentTask] = useState(0)
  const completedRef = useRef(false)

  useEffect(() => {
    if (completedRef.current || currentTask >= TASKS.length) return

    const delay = currentTask === 0 ? 2000 : 1600
    const timer = setTimeout(() => {
      setCompletedTasks((prev) => [...prev, TASKS[currentTask].id])
      setCurrentTask((i) => i + 1)
    }, delay)

    return () => clearTimeout(timer)
  }, [currentTask])

  useEffect(() => {
    if (completedTasks.length === TASKS.length && !completedRef.current) {
      completedRef.current = true
      const timer = setTimeout(() => {
        onComplete()
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [completedTasks, onComplete])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <motion.div
        className="mx-auto max-w-md rounded-2xl bg-white/95 dark:bg-slate-900/95 p-8 shadow-2xl backdrop-blur-md text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="mb-8"
        >
          <span className="inline-flex size-20 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="size-10 text-primary" />
          </span>
        </motion.div>

        <h2 className="mb-2 text-2xl font-bold tracking-tight">Preparando tu negocio...</h2>
        <p className="mb-10 text-muted-foreground">
          Nuestra IA está configurando todo para que empieces rápido
        </p>

        <div className="space-y-3 text-left">
          {TASKS.map((task, i) => {
            const isDone = completedTasks.includes(task.id)
            const isCurrent = i === currentTask
            return (
              <motion.div
                key={task.id}
                className={`flex items-center gap-3 rounded-xl px-5 py-3.5 transition-colors ${
                  isDone ? "bg-primary/5" : isCurrent ? "bg-muted/30" : "opacity-30"
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: isDone || isCurrent ? 1 : 0.3, x: 0 }}
                transition={{ delay: i * 0.12 }}
              >
                {isDone ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                  >
                    <CheckCircle className="size-5 text-primary" />
                  </motion.div>
                ) : isCurrent ? (
                  <Loader2 className="size-5 animate-spin text-primary" />
                ) : (
                  <div className="size-5 rounded-full border-2 border-muted-foreground/20" />
                )}
                <span
                  className={`text-sm font-medium ${
                    isDone ? "text-primary" : isCurrent ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {task.label}
                </span>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
