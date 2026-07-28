"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SalesScoringBar } from "./sales-scoring-bar"
import { SalesPhase, SalesPhaseNav } from "./sales-phase"
import { SalesSummary } from "./sales-summary"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { PLAN_RECOMMENDATIONS, getRoutesForPlan, SALES_ROUTES, BUSINESS_TYPES_SALUD, BUSINESS_TYPES_BELLEZA } from "@/lib/crm/constants"
import type { SalesRoute } from "@/lib/crm/constants"
import {
  Play,
  Loader2,
  Clock,
  History,
  ArrowLeft,
  CalendarCheck,
  Route,
  ShoppingCart,
  Building2,
  Calendar,
  Lock,
  Stethoscope,
  Scissors,
} from "lucide-react"

interface Question {
  id: string
  texto: string
  tipo: string
  opciones?: string | null
  requerida: boolean
  placeholder?: string | null
  condicionLogica?: string | null
  subtexto?: string | null
  maxChars?: number | null
}

interface Section {
  id: string
  nombre: string
  descripcion?: string | null
  icono?: string | null
  tipo?: string
  guiaVendedor?: string | null
  questions: Question[]
}

interface Session {
  id: string
  puntuacion: number
  temperatura: string
  planRecomendado: string
  planSeleccionado?: string | null
  routeSeleccionada?: string | null
  resumen: string
  objeciones?: string | null
  completadaAt?: string | null
  createdAt: string
}

interface SalesScriptTabProps {
  prospectId: string
  prospect: {
    nombreNegocio: string
    propietario: string
    categoria: string
    estadoProspecto: string
    telefono: string | null
    whatsapp: string | null
    email: string | null
    instagram: string | null
    facebook: string | null
    paginaWeb: string | null
    ciudad: string | null
    estado: string | null
    direccion: string | null
    notas: string | null
  }
}

type ViewMode = "idle" | "plan_selection" | "business_type_selection" | "route_selection" | "in_progress" | "completed" | "history"

const PLAN_ICONS: Record<string, React.ReactNode> = {
  agenda: <Calendar className="size-8" />,
  emprendedor: <ShoppingCart className="size-8" />,
  empresarial: <Building2 className="size-8" />,
}

export function SalesScriptTab({ prospectId, prospect }: SalesScriptTabProps) {
  const [mode, setMode] = useState<ViewMode>("idle")
  const [loading, setLoading] = useState(true)
  const [sections, setSections] = useState<Section[]>([])
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [score, setScore] = useState(0)
  const [temperatura, setTemperatura] = useState("frio")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [completedSessions, setCompletedSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)
  const [availableRoutes, setAvailableRoutes] = useState<SalesRoute[]>([])
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const answersRef = useRef(answers)
  answersRef.current = answers

  useEffect(() => {
    loadInitial()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospectId])

  async function loadInitial() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/prospects/${prospectId}/session`)
      if (res.ok) {
        const data = await res.json()
        if (data.session && !data.session.completadaAt) {
          setSessionId(data.session.id)
          setAnswers(data.session.answers || {})
          setSections(data.sections || [])
          setScore(data.session.puntuacion || 0)
          setTemperatura(data.session.temperatura || "frio")
          setSelectedPlan(data.session.planSeleccionado || null)
          setSelectedRoute(data.session.routeSeleccionada || null)
          setCompletedSessions(data.completedSessions || [])
          setMode("in_progress")
        } else if (data.session && data.session.completadaAt) {
          setCompletedSessions(data.completedSessions || [data.session])
          setSections(data.sections || [])
          setActiveSession(data.session)
          setMode("completed")
        } else {
          setSections(data.sections || [])
          setCompletedSessions(data.completedSessions || [])
          setMode("idle")
        }
      } else {
        setSections([])
        setMode("idle")
      }
    } catch {
      toast.error("Error al cargar datos del guion")
    } finally {
      setLoading(false)
    }
  }

  function handlePlanSelect(plan: string) {
    setSelectedPlan(plan)
    if (plan === "agenda") {
      setMode("business_type_selection")
      return
    }
    const routes = getRoutesForPlan(plan)
    setAvailableRoutes(routes)
    const disponible = routes.filter((r) => r.disponible)
    if (disponible.length === 1) {
      setSelectedRoute(disponible[0].value)
      startSession(plan, disponible[0].value)
    } else if (disponible.length === 0) {
      toast.info("Este plan esta en desarrollo proximamente")
    } else {
      setMode("route_selection")
    }
  }

  function handleRouteSelect(route: string) {
    setSelectedRoute(route)
    startSession(selectedPlan!, route)
  }

  function handleBusinessTypeSelect(businessType: string) {
    const isSalud = BUSINESS_TYPES_SALUD.some((t) => t.value === businessType)
    const route = isSalud ? "agenda_salud" : "agenda_belleza"
    setSelectedRoute(route)
    startSession("agenda", route)
  }

  async function startSession(plan: string, route: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/prospects/${prospectId}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSeleccionado: plan, routeSeleccionada: route }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al iniciar sesion")
      }
      const data = await res.json()
      setSessionId(data.session.id)
      setSections(data.sections || [])
      setAnswers({})
      setScore(0)
      setTemperatura("frio")
      setCurrentSectionIndex(0)
      setMode("in_progress")
      toast.success("Visita iniciada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error inesperado")
    } finally {
      setLoading(false)
    }
  }

  function debouncedSave(qId: string, value: string) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveAnswer(qId, value)
    }, 800)
  }

  async function saveAnswer(questionId: string, value: string) {
    if (!sessionId) return
    try {
      const res = await fetch(
        `/api/admin/prospects/${prospectId}/session/answer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, questionId, valor: value }),
        }
      )
      if (res.ok) {
        const data = await res.json()
        if (data.puntuacion !== undefined) setScore(data.puntuacion)
        if (data.temperatura) setTemperatura(data.temperatura)
      }
    } catch {
      // silent retry
    }
  }

  function handleAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    debouncedSave(questionId, value)
  }

  async function handleComplete(prospectData?: Record<string, unknown>) {
    if (!sessionId) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/prospects/${prospectId}/session/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, prospectData }),
        }
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al finalizar")
      }
      const data = await res.json()
      setActiveSession(data.session)
      setCompletedSessions((prev) => [data.session, ...prev])
      setMode("completed")
      toast.success("Visita finalizada exitosamente")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error inesperado")
    } finally {
      setLoading(false)
    }
  }

  const handleNext = useCallback(() => {
    if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex((i) => i + 1)
    } else {
      setActiveSession({
        id: sessionId || "",
        puntuacion: score,
        temperatura,
        planRecomendado: selectedPlan || "",
        planSeleccionado: selectedPlan,
        routeSeleccionada: selectedRoute,
        resumen: "",
        createdAt: new Date().toISOString(),
      })
      setMode("completed")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSectionIndex, sections.length, sessionId, score, temperatura, selectedPlan, selectedRoute])

  const handlePrev = useCallback(() => {
    setCurrentSectionIndex((i) => Math.max(0, i - 1))
  }, [])

  const canAdvance = (() => {
    const section = sections[currentSectionIndex]
    if (!section) return true
    if (section.tipo === "info") return true
    const visibleQuestions = section.questions.filter((q) => {
      if (!q.condicionLogica) return true
      try {
        const c = JSON.parse(q.condicionLogica) as { questionId: string; value: string }
        return answers[c.questionId] === c.value
      } catch {
        return true
      }
    })
    return visibleQuestions
      .filter((q) => q.requerida)
      .every((q) => answers[q.id]?.trim())
  })()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Guion de Venta</h3>
        {mode === "in_progress" && (
          <Badge variant="secondary">
            <Clock className="size-3" />
            En progreso
          </Badge>
        )}
      </div>

      {mode === "plan_selection" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecciona el plan que mejor se adapte a este negocio
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(Object.entries(PLAN_RECOMMENDATIONS) as [string, typeof PLAN_RECOMMENDATIONS["agenda"]][]).map(
              ([key, plan]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePlanSelect(key)}
                  disabled={loading}
                  className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all text-center ${
                    selectedPlan === key
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <div className="text-primary">{PLAN_ICONS[key]}</div>
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">{plan.label}</p>
                    <p className="text-xs text-muted-foreground">{plan.precio}</p>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {plan.features.map((f) => (
                        <span key={f} className="text-[10px] bg-muted rounded-full px-2 py-0.5">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              )
            )}
          </div>
        </div>
      )}

      {mode === "business_type_selection" && (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setMode("plan_selection")}>
            <ArrowLeft className="size-4" />
            Cambiar plan
          </Button>
          <p className="text-sm text-muted-foreground">
            Que tipo de negocio atiende este prospecto?
          </p>
          <Card>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Stethoscope className="size-3.5" />
                  Salud y profesionales medicos
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BUSINESS_TYPES_SALUD.map((bt) => (
                    <button
                      key={bt.value}
                      type="button"
                      onClick={() => handleBusinessTypeSelect(bt.value)}
                      disabled={loading}
                      className="text-left text-sm px-3 py-2 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      {bt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t pt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Scissors className="size-3.5" />
                  Barberias, belleza y estetica
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BUSINESS_TYPES_BELLEZA.map((bt) => (
                    <button
                      key={bt.value}
                      type="button"
                      onClick={() => handleBusinessTypeSelect(bt.value)}
                      disabled={loading}
                      className="text-left text-sm px-3 py-2 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      {bt.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {mode === "route_selection" && (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setMode("plan_selection")}>
            <ArrowLeft className="size-4" />
            Cambiar plan
          </Button>
          <p className="text-sm text-muted-foreground">
            Selecciona como funciona principalmente este negocio
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableRoutes.map((route) => (
              <button
                key={route.value}
                type="button"
                onClick={() => route.disponible ? handleRouteSelect(route.value) : toast.info(route.descripcion)}
                disabled={loading}
                className={`flex flex-col items-start gap-3 p-5 rounded-xl border-2 transition-all text-left ${
                  !route.disponible
                    ? "border-border opacity-50 cursor-not-allowed"
                    : selectedRoute === route.value
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Route className="size-5 text-primary" />
                  {!route.disponible && <Lock className="size-4 text-muted-foreground" />}
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-sm">{route.label}</p>
                  <p className="text-xs text-muted-foreground">{route.descripcion}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "in_progress" && sessionId && (
        <>
          <SalesScoringBar score={score} temperatura={temperatura} />
          <SalesPhase
            section={sections[currentSectionIndex]}
            answers={answers}
            onAnswer={handleAnswer}
            currentIndex={currentSectionIndex}
            totalSections={sections.length}
          />
          <SalesPhaseNav
            onPrev={handlePrev}
            onNext={handleNext}
            isFirst={currentSectionIndex === 0}
            isLast={currentSectionIndex === sections.length - 1}
            canAdvance={canAdvance}
          />
        </>
      )}

      {mode === "idle" && (
        <Card>
          <CardContent className="py-8 text-center space-y-4">
            <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center">
              <Play className="size-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Iniciar Nueva Visita</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Selecciona un plan, una ruta de venta, responde el guion y captura los datos del cliente al final
              </p>
            </div>
            <Button onClick={() => setMode("plan_selection")} disabled={loading}>
              <Play className="size-4" />
              Iniciar Visita
            </Button>
            {completedSessions.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setMode("history")}>
                <History className="size-4" />
                Ver historial ({completedSessions.length})
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {mode === "completed" && activeSession && (
        <SalesSummary
          session={activeSession}
          prospect={prospect}
          finalized={!!activeSession.completadaAt}
          onComplete={() => setMode("idle")}
          onBack={() => setMode("idle")}
          onSaveAndComplete={(prospectData) => handleComplete(prospectData)}
        />
      )}

      {mode === "history" && (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setMode("idle")}>
            <ArrowLeft className="size-4" />
            Volver
          </Button>
          <Card>
            <CardContent className="space-y-2 pt-0">
              {completedSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay visitas completadas aun
                </p>
              ) : (
                completedSessions.map((s) => {
                  const route = SALES_ROUTES.find((r) => r.value === s.routeSeleccionada)
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {s.puntuacion}/100
                          </Badge>
                          <Badge className={s.temperatura === "muy_caliente" ? "bg-red-100 text-red-700" : s.temperatura === "caliente" ? "bg-orange-100 text-orange-700" : s.temperatura === "tibio" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}>
                            {s.temperatura === "muy_caliente" ? "Muy caliente" : s.temperatura === "caliente" ? "Caliente" : s.temperatura === "tibio" ? "Tibio" : "Frio"}
                          </Badge>
                          {route && (
                            <Badge variant="outline" className="text-xs">
                              {route.label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarCheck className="size-3" />
                          {formatDistanceToNow(new Date(s.completadaAt || s.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActiveSession(s)
                          setMode("completed")
                        }}
                      >
                        Ver resumen
                      </Button>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
