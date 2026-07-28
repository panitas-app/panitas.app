"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SALES_QUESTION_TYPES } from "@/lib/crm/constants"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Plus,
  Loader2,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  GripVertical,
  ChevronRight,
  Save,
  X,
  ListChecks,
  Trophy,
  Target,
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
  orden: number
  puntaje?: string | null
}

interface Section {
  id: string
  nombre: string
  descripcion?: string | null
  icono?: string | null
  tipo?: string
  route?: string | null
  guiaVendedor?: string | null
  orden: number
  questions: Question[]
}

interface ScoringRule {
  id: string
  nombre: string
  campo: string
  valor: string
  puntos: number
}

interface PlanRule {
  id: string
  plan: string
  minScore: number
  maxScore: number
  descripcion: string
}

type AccordionState = Record<string, boolean>

const emptyQuestion = {
  texto: "",
  tipo: "radio",
  opciones: "",
  requerida: true,
  placeholder: "",
  condicionLogica: "",
  subtexto: "",
  maxChars: "",
  puntaje: "",
}

const emptySection = {
  nombre: "",
  descripcion: "",
  icono: "",
  tipo: "questions",
  route: "",
  guiaVendedor: "",
}

const emptyScoringRule = {
  nombre: "",
  campo: "",
  valor: "",
  puntos: 0,
}

const emptyPlanRule = {
  plan: "agenda",
  minScore: 0,
  maxScore: 100,
  descripcion: "",
}

export function SalesScriptAdmin() {
  const [sections, setSections] = useState<Section[]>([])
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>([])
  const [planRules, setPlanRules] = useState<PlanRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [expandedSections, setExpandedSections] = useState<AccordionState>({})

  const [sectionDialogOpen, setSectionDialogOpen] = useState(false)
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false)
  const [scoringDialogOpen, setScoringDialogOpen] = useState(false)
  const [planDialogOpen, setPlanDialogOpen] = useState(false)

  const [editingSection, setEditingSection] = useState<Section | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [editingScoringRule, setEditingScoringRule] = useState<ScoringRule | null>(null)
  const [editingPlanRule, setEditingPlanRule] = useState<PlanRule | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)

  const [sectionForm, setSectionForm] = useState(emptySection)
  const [questionForm, setQuestionForm] = useState(emptyQuestion)
  const [scoringForm, setScoringForm] = useState(emptyScoringRule)
  const [planForm, setPlanForm] = useState(emptyPlanRule)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/sales-script")
      if (res.ok) {
        const data = await res.json()
        setSections(data.sections || [])
        setScoringRules(data.scoringRules || [])
        setPlanRules(data.planRules || [])
        const expanded: AccordionState = {}
        for (const s of data.sections || []) {
          expanded[s.id] = false
        }
        setExpandedSections(expanded)
      }
    } catch {
      toast.error("Error al cargar configuracion")
    } finally {
      setLoading(false)
    }
  }

  async function handleSeed() {
    setSeeding(true)
    try {
      const res = await fetch("/api/admin/sales-script/seed", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Error al sembrar datos")
        return
      }
      toast.success(`Datos sembrados: ${data.sections} secciones, ${data.questions} preguntas, ${data.scoringRules} reglas de scoring, ${data.planRules} reglas de plan`)
      loadData()
    } catch {
      toast.error("Error al sembrar datos iniciales")
    } finally {
      setSeeding(false)
    }
  }

  function toggleSection(id: string) {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function openCreateSection() {
    setEditingSection(null)
    setSectionForm(emptySection)
    setSectionDialogOpen(true)
  }

  function openEditSection(section: Section) {
    setEditingSection(section)
    setSectionForm({
      nombre: section.nombre,
      descripcion: section.descripcion || "",
      icono: section.icono || "",
      tipo: section.tipo || "questions",
      route: section.route || "",
      guiaVendedor: section.guiaVendedor || "",
    })
    setSectionDialogOpen(true)
  }

  async function saveSection() {
    if (!sectionForm.nombre.trim()) {
      toast.error("Nombre es requerido")
      return
    }
    setSaving(true)
    try {
      const url = editingSection
        ? `/api/admin/sales-sections/${editingSection.id}`
        : "/api/admin/sales-sections"
      const res = await fetch(url, {
        method: editingSection ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: sectionForm.nombre.trim(),
          descripcion: sectionForm.descripcion.trim() || null,
          icono: sectionForm.icono.trim() || null,
          tipo: sectionForm.tipo || "questions",
          route: sectionForm.route?.trim() || null,
          guiaVendedor: sectionForm.guiaVendedor?.trim() || null,
          orden: editingSection ? editingSection.orden : sections.length,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al guardar")
      }
      toast.success(editingSection ? "Seccion actualizada" : "Seccion creada")
      setSectionDialogOpen(false)
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error inesperado")
    } finally {
      setSaving(false)
    }
  }

  async function deleteSection(id: string) {
    if (!confirm("Eliminar esta seccion y todas sus preguntas?")) return
    try {
      const res = await fetch(`/api/admin/sales-sections/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Error al eliminar")
      toast.success("Seccion eliminada")
      loadData()
    } catch {
      toast.error("Error al eliminar seccion")
    }
  }

  async function reorderSection(sectionId: string, direction: "up" | "down") {
    const idx = sections.findIndex((s) => s.id === sectionId)
    if (idx < 0) return
    if (direction === "up" && idx === 0) return
    if (direction === "down" && idx === sections.length - 1) return

    const newSections = [...sections]
    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    ;[newSections[idx], newSections[swapIdx]] = [newSections[swapIdx], newSections[idx]]
    const ordered = newSections.map((s, i) => ({ ...s, orden: i }))
    setSections(ordered)

    try {
      await fetch("/api/admin/sales-sections/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: ordered.map((s) => ({ id: s.id, orden: s.orden })),
        }),
      })
    } catch {
      loadData()
    }
  }

  function openCreateQuestion(sectionId: string) {
    setEditingQuestion(null)
    setQuestionForm(emptyQuestion)
    setActiveSectionId(sectionId)
    setQuestionDialogOpen(true)
  }

  function openEditQuestion(question: Question, sectionId: string) {
    setEditingQuestion(question)
    setActiveSectionId(sectionId)
    setQuestionForm({
      texto: question.texto,
      tipo: question.tipo,
      opciones: question.opciones || "",
      requerida: question.requerida,
      placeholder: question.placeholder || "",
      condicionLogica: question.condicionLogica || "",
      subtexto: question.subtexto || "",
      maxChars: question.maxChars?.toString() || "",
      puntaje: question.puntaje || "",
    })
    setQuestionDialogOpen(true)
  }

  async function saveQuestion() {
    if (!questionForm.texto.trim() || !activeSectionId) {
      toast.error("Texto de pregunta es requerido")
      return
    }
    setSaving(true)
    try {
      const section = sections.find((s) => s.id === activeSectionId)
      const url = editingQuestion
        ? `/api/admin/sales-questions/${editingQuestion.id}`
        : "/api/admin/sales-questions"
      const res = await fetch(url, {
        method: editingQuestion ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: activeSectionId,
          texto: questionForm.texto.trim(),
          tipo: questionForm.tipo,
          opciones: questionForm.opciones.trim() || null,
          requerida: questionForm.requerida,
          placeholder: questionForm.placeholder.trim() || null,
          condicionLogica: questionForm.condicionLogica.trim() || null,
          subtexto: questionForm.subtexto.trim() || null,
          maxChars: questionForm.maxChars ? parseInt(questionForm.maxChars) : null,
          puntaje: questionForm.puntaje.trim() || null,
          orden: editingQuestion ? editingQuestion.orden : (section?.questions.length || 0),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al guardar")
      }
      toast.success(editingQuestion ? "Pregunta actualizada" : "Pregunta creada")
      setQuestionDialogOpen(false)
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error inesperado")
    } finally {
      setSaving(false)
    }
  }

  async function deleteQuestion(id: string) {
    if (!confirm("Eliminar esta pregunta?")) return
    try {
      const res = await fetch(`/api/admin/sales-questions/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Error al eliminar")
      toast.success("Pregunta eliminada")
      loadData()
    } catch {
      toast.error("Error al eliminar pregunta")
    }
  }

  async function reorderQuestion(questionId: string, sectionId: string, direction: "up" | "down") {
    const section = sections.find((s) => s.id === sectionId)
    if (!section) return
    const idx = section.questions.findIndex((q) => q.id === questionId)
    if (idx < 0) return
    if (direction === "up" && idx === 0) return
    if (direction === "down" && idx === section.questions.length - 1) return

    const newQuestions = [...section.questions]
    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    ;[newQuestions[idx], newQuestions[swapIdx]] = [newQuestions[swapIdx], newQuestions[idx]]
    const ordered = newQuestions.map((q, i) => ({ ...q, orden: i }))

    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, questions: ordered } : s))
    )

    try {
      await fetch("/api/admin/sales-questions/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: ordered.map((q) => ({ id: q.id, orden: q.orden })),
        }),
      })
    } catch {
      loadData()
    }
  }

  function openCreateScoringRule() {
    setEditingScoringRule(null)
    setScoringForm(emptyScoringRule)
    setScoringDialogOpen(true)
  }

  function openEditScoringRule(rule: ScoringRule) {
    setEditingScoringRule(rule)
    setScoringForm({
      nombre: rule.nombre,
      campo: rule.campo,
      valor: rule.valor,
      puntos: rule.puntos,
    })
    setScoringDialogOpen(true)
  }

  async function saveScoringRule() {
    if (!scoringForm.nombre.trim() || !scoringForm.campo.trim()) {
      toast.error("Nombre y campo son requeridos")
      return
    }
    setSaving(true)
    try {
      const url = editingScoringRule
        ? `/api/admin/sales-scoring-rules/${editingScoringRule.id}`
        : "/api/admin/sales-scoring-rules"
      const res = await fetch(url, {
        method: editingScoringRule ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scoringForm),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al guardar")
      }
      toast.success(editingScoringRule ? "Regla actualizada" : "Regla creada")
      setScoringDialogOpen(false)
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error inesperado")
    } finally {
      setSaving(false)
    }
  }

  async function deleteScoringRule(id: string) {
    if (!confirm("Eliminar esta regla de scoring?")) return
    try {
      const res = await fetch(`/api/admin/sales-scoring-rules/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Error al eliminar")
      toast.success("Regla eliminada")
      loadData()
    } catch {
      toast.error("Error al eliminar regla")
    }
  }

  function openCreatePlanRule() {
    setEditingPlanRule(null)
    setPlanForm(emptyPlanRule)
    setPlanDialogOpen(true)
  }

  function openEditPlanRule(rule: PlanRule) {
    setEditingPlanRule(rule)
    setPlanForm({
      plan: rule.plan,
      minScore: rule.minScore,
      maxScore: rule.maxScore,
      descripcion: rule.descripcion,
    })
    setPlanDialogOpen(true)
  }

  async function savePlanRule() {
    if (!planForm.descripcion.trim()) {
      toast.error("Descripcion es requerida")
      return
    }
    setSaving(true)
    try {
      const url = editingPlanRule
        ? `/api/admin/sales-plan-rules/${editingPlanRule.id}`
        : "/api/admin/sales-plan-rules"
      const res = await fetch(url, {
        method: editingPlanRule ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planForm),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al guardar")
      }
      toast.success(editingPlanRule ? "Regla actualizada" : "Regla creada")
      setPlanDialogOpen(false)
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error inesperado")
    } finally {
      setSaving(false)
    }
  }

  async function deletePlanRule(id: string) {
    if (!confirm("Eliminar esta regla de recomendacion?")) return
    try {
      const res = await fetch(`/api/admin/sales-plan-rules/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Error al eliminar")
      toast.success("Regla eliminada")
      loadData()
    } catch {
      toast.error("Error al eliminar regla")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Administrar Guion de Venta</h2>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Secciones</h3>
          <Button size="sm" onClick={openCreateSection}>
            <Plus className="size-3.5" />
            Nueva Seccion
          </Button>
        </div>

        {sections.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                No hay secciones creadas. Agrega la primera para comenzar o siembra los datos iniciales.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeed}
                disabled={seeding}
              >
                {seeding ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                {seeding ? "Sembrando..." : "Sembrar datos iniciales"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {sections.map((section, sectionIdx) => {
              const isExpanded = expandedSections[section.id] ?? false
              return (
                <Card key={section.id} className="overflow-visible">
                  <div
                    className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none hover:bg-muted/30 transition-colors"
                    onClick={() => toggleSection(section.id)}
                  >
                    <GripVertical className="size-4 text-muted-foreground/40 shrink-0" />
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      {isExpanded ? (
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="font-medium text-sm truncate">
                        {section.nombre}
                      </span>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {section.questions.length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openEditSection(section)}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => reorderSection(section.id, "up")}
                        disabled={sectionIdx === 0}
                      >
                        <ChevronUp className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => reorderSection(section.id, "down")}
                        disabled={sectionIdx === sections.length - 1}
                      >
                        <ChevronDown className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => deleteSection(section.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t px-4 py-3 space-y-2">
                      {section.questions
                        .sort((a, b) => a.orden - b.orden)
                        .map((question, qIdx) => (
                          <div
                            key={question.id}
                            className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/30"
                          >
                            <span className="text-xs text-muted-foreground font-mono w-5 shrink-0">
                              {question.orden + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {question.texto}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge variant="outline" className="text-[10px]">
                                  {SALES_QUESTION_TYPES.find((t) => t.value === question.tipo)?.label || question.tipo}
                                </Badge>
                                {question.requerida && (
                                  <Badge variant="secondary" className="text-[10px]">req</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() =>
                                  reorderQuestion(question.id, section.id, "up")
                                }
                                disabled={qIdx === 0}
                              >
                                <ChevronUp className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() =>
                                  reorderQuestion(question.id, section.id, "down")
                                }
                                disabled={qIdx === section.questions.length - 1}
                              >
                                <ChevronDown className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() =>
                                  openEditQuestion(question, section.id)
                                }
                              >
                                <Pencil className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => deleteQuestion(question.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          </div>
                        ))}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => openCreateQuestion(section.id)}
                      >
                        <Plus className="size-3.5" />
                        Agregar pregunta
                      </Button>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Trophy className="size-4" />
            Reglas de Scoring
          </h3>
          <Button size="sm" variant="outline" onClick={openCreateScoringRule}>
            <Plus className="size-3.5" />
            Agregar
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nombre</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Campo</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Valor</TableHead>
                  <TableHead className="text-xs text-right">Puntos</TableHead>
                  <TableHead className="text-xs w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scoringRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                      Sin reglas de scoring
                    </TableCell>
                  </TableRow>
                ) : (
                  scoringRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="text-sm font-medium">{rule.nombre}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                        {rule.campo}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                        {rule.valor}
                      </TableCell>
                      <TableCell className="text-sm text-right font-mono">
                        +{rule.puntos}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openEditScoringRule(rule)}
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => deleteScoringRule(rule.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="border-t pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Target className="size-4" />
            Reglas de Recomendacion de Plan
          </h3>
          <Button size="sm" variant="outline" onClick={openCreatePlanRule}>
            <Plus className="size-3.5" />
            Agregar
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Plan</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Min</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Max</TableHead>
                  <TableHead className="text-xs">Descripcion</TableHead>
                  <TableHead className="text-xs w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                      Sin reglas de recomendacion
                    </TableCell>
                  </TableRow>
                ) : (
                  planRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="text-sm font-medium capitalize">{rule.plan}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                        {rule.minScore}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                        {rule.maxScore}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {rule.descripcion}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openEditPlanRule(rule)}
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => deletePlanRule(rule.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSection ? "Editar Seccion" : "Nueva Seccion"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                value={sectionForm.nombre}
                onChange={(e) =>
                  setSectionForm((p) => ({ ...p, nombre: e.target.value }))
                }
                placeholder="Ej: Situacion actual"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descripcion</Label>
              <Textarea
                value={sectionForm.descripcion}
                onChange={(e) =>
                  setSectionForm((p) => ({ ...p, descripcion: e.target.value }))
                }
                placeholder="Descripcion breve de esta fase"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Icono (lucide-react)</Label>
              <Input
                value={sectionForm.icono}
                onChange={(e) =>
                  setSectionForm((p) => ({ ...p, icono: e.target.value }))
                }
                placeholder="Ej: Users, Building2"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de seccion</Label>
              <Select
                value={sectionForm.tipo}
                onValueChange={(v) =>
                  setSectionForm((p) => ({ ...p, tipo: v ?? "questions" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="questions">Preguntas</SelectItem>
                  <SelectItem value="info">Informativa (guia vendedor)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ruta (dejar vacio para todas)</Label>
              <Select
                value={sectionForm.route || "__all__"}
                onValueChange={(v) =>
                   setSectionForm((p) => ({ ...p, route: (v && v !== "__all__") ? v : "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas las rutas</SelectItem>
                  <SelectItem value="emprendedor_presencial">Emprendedor Presencial</SelectItem>
                  <SelectItem value="emprendedor_online">Emprendedor Online</SelectItem>
                  <SelectItem value="agenda_salud">Agenda — Salud</SelectItem>
                  <SelectItem value="agenda_belleza">Agenda — Belleza</SelectItem>
                  <SelectItem value="empresarial_default">Empresarial (Proximamente)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {sectionForm.tipo === "info" && (
              <div className="space-y-1.5">
                <Label>Guia para el vendedor</Label>
                <Textarea
                  value={sectionForm.guiaVendedor}
                  onChange={(e) =>
                    setSectionForm((p) => ({ ...p, guiaVendedor: e.target.value }))
                  }
                  placeholder="Instrucciones, tips, frases sugeridas..."
                  rows={4}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSectionDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={saveSection} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {editingSection ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? "Editar Pregunta" : "Nueva Pregunta"}
            </DialogTitle>
            <DialogDescription>
              {sections.find((s) => s.id === activeSectionId)?.nombre}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Texto *</Label>
              <Textarea
                value={questionForm.texto}
                onChange={(e) =>
                  setQuestionForm((p) => ({ ...p, texto: e.target.value }))
                }
                placeholder="Ej: Tiene sistema administrativo?"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Subtexto / descripcion</Label>
              <Input
                value={questionForm.subtexto}
                onChange={(e) =>
                  setQuestionForm((p) => ({ ...p, subtexto: e.target.value }))
                }
                placeholder="Instruccion adicional opcional"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select
                  value={questionForm.tipo}
                  onValueChange={(val) =>
                    val && setQuestionForm((p) => ({ ...p, tipo: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SALES_QUESTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Opciones (una por linea)</Label>
                <Textarea
                  value={questionForm.opciones}
                  onChange={(e) =>
                    setQuestionForm((p) => ({ ...p, opciones: e.target.value }))
                  }
                  placeholder={"Si\nNo"}
                  rows={3}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Placeholder</Label>
                <Input
                  value={questionForm.placeholder}
                  onChange={(e) =>
                    setQuestionForm((p) => ({ ...p, placeholder: e.target.value }))
                  }
                  placeholder="Texto guia"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max caracteres</Label>
                <Input
                  type="number"
                  value={questionForm.maxChars}
                  onChange={(e) =>
                    setQuestionForm((p) => ({ ...p, maxChars: e.target.value }))
                  }
                  placeholder="Sin limite"
                  min={0}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Condicion logica (JSON)</Label>
              <Input
                value={questionForm.condicionLogica}
                onChange={(e) =>
                  setQuestionForm((p) => ({
                    ...p,
                    condicionLogica: e.target.value,
                  }))
                }
                placeholder='{"questionId":"xxx","value":"Si"}'
              />
              <p className="text-[11px] text-muted-foreground">
                Si se cumple, la pregunta se muestra. Ejemplo: solo mostrar si respondio "Si"
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Puntaje (JSON)</Label>
              <Input
                value={questionForm.puntaje}
                onChange={(e) =>
                  setQuestionForm((p) => ({ ...p, puntaje: e.target.value }))
                }
                placeholder='{"Si": 10, "No": 0}'
              />
              <p className="text-[11px] text-muted-foreground">
                Mapa de respuestas a puntos. Ej: {'{"Si": 10, "No": 0}'}
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={questionForm.requerida}
                onChange={(e) =>
                  setQuestionForm((p) => ({ ...p, requerida: e.target.checked }))
                }
                className="size-4 rounded border-input"
              />
              <span className="text-sm font-medium">Pregunta requerida</span>
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuestionDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={saveQuestion} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {editingQuestion ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scoringDialogOpen} onOpenChange={setScoringDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingScoringRule ? "Editar Regla" : "Nueva Regla de Scoring"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                value={scoringForm.nombre}
                onChange={(e) =>
                  setScoringForm((p) => ({ ...p, nombre: e.target.value }))
                }
                placeholder="Ej: Tiene sistema administrativo"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Campo *</Label>
                <Input
                  value={scoringForm.campo}
                  onChange={(e) =>
                    setScoringForm((p) => ({ ...p, campo: e.target.value }))
                  }
                  placeholder="Ej: pregunta_id"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor esperado</Label>
                <Input
                  value={scoringForm.valor}
                  onChange={(e) =>
                    setScoringForm((p) => ({ ...p, valor: e.target.value }))
                  }
                  placeholder="Ej: Si"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Puntos</Label>
              <Input
                type="number"
                value={scoringForm.puntos || ""}
                onChange={(e) =>
                  setScoringForm((p) => ({
                    ...p,
                    puntos: parseInt(e.target.value) || 0,
                  }))
                }
                placeholder="0"
                min={0}
                max={100}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScoringDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={saveScoringRule} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {editingScoringRule ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPlanRule
                ? "Editar Regla de Plan"
                : "Nueva Regla de Plan"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Plan *</Label>
              <Select
                value={planForm.plan}
                onValueChange={(val) =>
                  val && setPlanForm((p) => ({ ...p, plan: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agenda">Plan Agenda</SelectItem>
                  <SelectItem value="emprendedor">Plan Emprendedor</SelectItem>
                  <SelectItem value="empresarial">Plan Empresarial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Score minimo</Label>
                <Input
                  type="number"
                  value={planForm.minScore}
                  onChange={(e) =>
                    setPlanForm((p) => ({
                      ...p,
                      minScore: parseInt(e.target.value) || 0,
                    }))
                  }
                  min={0}
                  max={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Score maximo</Label>
                <Input
                  type="number"
                  value={planForm.maxScore}
                  onChange={(e) =>
                    setPlanForm((p) => ({
                      ...p,
                      maxScore: parseInt(e.target.value) || 100,
                    }))
                  }
                  min={0}
                  max={100}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descripcion *</Label>
              <Textarea
                value={planForm.descripcion}
                onChange={(e) =>
                  setPlanForm((p) => ({ ...p, descripcion: e.target.value }))
                }
                placeholder="Criterio para recomendar este plan"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPlanDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={savePlanRule} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {editingPlanRule ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
