"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Bell,
  Boxes,
  Info,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  Users,
  Zap,
} from "lucide-react"
import { toast } from "sonner"

import {
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/design-system/page-header"
import {
  Section,
  SectionDescription,
  SectionHeader,
  SectionTitle,
} from "@/components/design-system/section"
import { MetricCard } from "@/components/design-system/metric-card"
import { AICallout } from "@/components/design-system/ai-callout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { Input } from "@/components/ui/input"
import { LoadingState } from "@/components/ui/loading-state"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const COLOR_TOKENS: { group: string; tokens: { name: string; var: string; value: string }[] }[] = [
  {
    group: "Identidad (naranja Panitas)",
    tokens: [
      { name: "brand-primary", var: "--brand-primary", value: "#F97316" },
      { name: "brand-secondary", var: "--brand-secondary", value: "#FB923C" },
      { name: "brand-soft", var: "--brand-soft", value: "#FFF4EC" },
    ],
  },
  {
    group: "Semánticos",
    tokens: [
      { name: "primary", var: "--primary", value: "#F97316" },
      { name: "secondary", var: "--secondary", value: "#FFF4EC" },
      { name: "accent (amarillo)", var: "--accent", value: "#FFD600" },
      { name: "destructive", var: "--destructive", value: "#EF4444" },
      { name: "success", var: "--success", value: "#16A34A" },
      { name: "warning", var: "--warning", value: "#F59E0B" },
      { name: "info", var: "--info", value: "#0EA5E9" },
    ],
  },
  {
    group: "Superficies y texto",
    tokens: [
      { name: "background", var: "--background", value: "#FFFFFF" },
      { name: "foreground", var: "--foreground", value: "#050505" },
      { name: "card", var: "--card", value: "#FFFFFF" },
      { name: "muted", var: "--muted", value: "#F5F5F5" },
      { name: "muted-foreground", var: "--muted-foreground", value: "#6B7280" },
      { name: "border / input", var: "--border", value: "#E5E7EB" },
    ],
  },
]

function TokenSwatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="size-10 shrink-0 rounded-lg border border-border shadow-subtle"
        style={{ backgroundColor: value }}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{value}</p>
      </div>
    </div>
  )
}

function DemoBlock({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {children}
    </div>
  )
}

export default function DesignSystemPage() {
  const [radioValue, setRadioValue] = useState("personal")
  const [notifications, setNotifications] = useState(true)
  const [skeletonLoading, setSkeletonLoading] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setSkeletonLoading(false), 4000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <PageHeader>
        <div>
          <Badge variant="secondary" className="mb-3 gap-1">
            <Sparkles className="size-3" />
            Panitas Design System · FASE 9A
          </Badge>
          <PageHeaderTitle>Sistema de diseño Panitas</PageHeaderTitle>
          <PageHeaderDescription>
            Tokens, primitivas y patrones oficiales del producto. Construido
            sobre Tailwind CSS v4 + Base UI + shadcn. Todo componente aquí es
            real y se puede reutilizar directamente en el negocio.
          </PageHeaderDescription>
        </div>
        <PageHeaderActions>
          <Button variant="outline" size="sm" render={<Link href="/dashboard" />}>
            <Store className="size-4" />
            Ir al dashboard
          </Button>
          <Button size="sm" onClick={() => toast.success("Hola 👋 — notificación del sistema")}>
            <Plus className="size-4" />
            Crear acción
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <Separator className="my-10" />

      {/* ── Tokens de color ── */}
      <Section>
        <SectionHeader>
          <SectionTitle>Tokens de color</SectionTitle>
          <SectionDescription>
            Definidos en <code className="rounded bg-muted px-1.5 py-0.5 text-xs">:root</code> en
            globals.css. Re-anclados a la identidad naranja Panitas.
          </SectionDescription>
        </SectionHeader>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {COLOR_TOKENS.map((group) => (
            <Card key={group.group}>
              <CardHeader>
                <CardTitle className="text-sm">{group.group}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {group.tokens.map((t) => (
                  <TokenSwatch key={t.var} name={t.name} value={t.value} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Separator className="my-10" />

      {/* ── Tipografía ── */}
      <Section>
        <SectionHeader>
          <SectionTitle>Tipografía</SectionTitle>
          <SectionDescription>
            Body: <strong>Systemia</strong> (400/500/700). Headings:{" "}
            <strong>Polymath Display</strong> (700). Cargadas como webfonts
            locales.
          </SectionDescription>
        </SectionHeader>
        <Card>
          <CardContent className="flex flex-col gap-3 py-5">
            <h1 className="font-heading text-4xl font-bold">Heading 1 · Hola, gerente</h1>
            <h2 className="font-heading text-2xl font-bold">Heading 2 · Vista general</h2>
            <h3 className="font-heading text-xl font-bold">Heading 3 · Ventas de hoy</h3>
            <p className="text-base">
              Cuerpo de texto — Reunimos todas tus ventas, inventario y clientes
              en un solo lugar.
            </p>
            <p className="text-sm text-muted-foreground">
              Texto secundario — Tendencias, notas y descripciones de apoyo.
            </p>
            <p className="text-xs text-muted-foreground">
              Texto auxiliar — Captions, metadatos y timestamps.
            </p>
          </CardContent>
        </Card>
      </Section>

      <Separator className="my-10" />

      {/* ── Botones ── */}
      <Section>
        <SectionHeader>
          <SectionTitle>Botones</SectionTitle>
          <SectionDescription>Una acción principal por pantalla. El naranja es reservado para la acción.</SectionDescription>
        </SectionHeader>
        <Card>
          <CardContent className="grid gap-6 py-5 sm:grid-cols-2">
            <DemoBlock title="Variantes">
              <div className="flex flex-wrap items-center gap-2">
                <Button>Primario</Button>
                <Button variant="secondary">Secundario</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Eliminar</Button>
                <Button variant="link">Enlace</Button>
              </div>
            </DemoBlock>
            <DemoBlock title="Tamaños e iconos">
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline">
                  <Plus className="size-3.5" /> Pequeño
                </Button>
                <Button>
                  <Zap className="size-4" /> Normal
                </Button>
                <Button size="lg" variant="secondary">
                  Grande <ArrowRight className="size-4" />
                </Button>
                <Button size="icon" aria-label="Notificaciones">
                  <Bell className="size-4" />
                </Button>
                <Button size="icon-sm" variant="outline" aria-label="Buscar">
                  <Search className="size-3.5" />
                </Button>
              </div>
            </DemoBlock>
            <DemoBlock title="Estados">
              <div className="flex flex-wrap items-center gap-2">
                <Button disabled>Deshabilitado</Button>
                <Button variant="outline" disabled>
                  <ShoppingCart className="size-4" /> Sin stock
                </Button>
              </div>
            </DemoBlock>
            <DemoBlock title="Feedback">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    toast("Guardado", {
                      description: "Los cambios se aplicaron correctamente.",
                    })
                  }
                >
                  Guardar
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    toast.error("Ocurrió un error", {
                      description: "No se pudo conectar con el servidor.",
                    })
                  }
                >
                  Simular error
                </Button>
              </div>
            </DemoBlock>
          </CardContent>
        </Card>
      </Section>

      <Separator className="my-10" />

      {/* ── Badges y estados ── */}
      <Section>
        <SectionHeader>
          <SectionTitle>Badges</SectionTitle>
          <SectionDescription>Estados de negocio: activo, pendiente, error, oferta.</SectionDescription>
        </SectionHeader>
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 py-5">
            <Badge>Activo</Badge>
            <Badge variant="secondary">Pendiente</Badge>
            <Badge variant="outline">Borrador</Badge>
            <Badge variant="destructive">Agotado</Badge>
            <Badge variant="outline" className="border-accent bg-accent/10 text-accent-foreground">
              Oferta
            </Badge>
            <Badge className="border-success/30 bg-success-soft text-success">Pagado</Badge>
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="size-3 text-brand-primary" />
              IA
            </Badge>
          </CardContent>
        </Card>
      </Section>

      <Separator className="my-10" />

      {/* ── Formularios ── */}
      <Section>
        <SectionHeader>
          <SectionTitle>Formularios</SectionTitle>
          <SectionDescription>Inputs ≥ 44px en móvil, texto ≥ 16px para evitar zoom en iOS.</SectionDescription>
        </SectionHeader>
        <Card>
          <CardContent className="grid gap-6 py-5 sm:grid-cols-2">
            <div className="flex flex-col gap-4">
              <DemoBlock title="Texto">
                <Input placeholder="Nombre del producto" />
              </DemoBlock>
              <DemoBlock title="Con icono y búsqueda">
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Buscar clientes…" />
                </div>
              </DemoBlock>
              <DemoBlock title="Select">
                <Select defaultValue="venta">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="venta">Venta directa</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                    <SelectItem value="apartado">Apartado</SelectItem>
                  </SelectContent>
                </Select>
              </DemoBlock>
              <DemoBlock title="Área de texto">
                <Textarea placeholder="Notas internas…" rows={3} />
              </DemoBlock>
            </div>
            <div className="flex flex-col gap-4">
              <DemoBlock title="Interruptores">
                <div className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div className="flex items-center gap-3">
                    <Bell className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Notificaciones</p>
                      <p className="text-xs text-muted-foreground">Alertas de inventario y ventas</p>
                    </div>
                  </div>
                  <Switch checked={notifications} onCheckedChange={setNotifications} />
                </div>
              </DemoBlock>
              <DemoBlock title="Checkbox">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox />
                  Recordar esta sesión
                </label>
              </DemoBlock>
              <DemoBlock title="Radio group">
                <RadioGroup value={radioValue} onValueChange={setRadioValue}>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="personal" />
                    Negocio personal
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="sociedad" />
                    Sociedad / empresa
                  </label>
                </RadioGroup>
              </DemoBlock>
            </div>
          </CardContent>
        </Card>
      </Section>

      <Separator className="my-10" />

      {/* ── Alertas y AI callouts ── */}
      <Section>
        <SectionHeader>
          <SectionTitle>Alertas y lenguaje visual de IA</SectionTitle>
          <SectionDescription>
            Alertas para errores del sistema; AICallout para insights y
            recomendaciones generadas por Panitas.
          </SectionDescription>
        </SectionHeader>
        <div className="grid gap-4">
          <Alert variant="default">
            <Info className="size-4" />
            <AlertTitle>Información</AlertTitle>
            <AlertDescription>
              Tu plan incluye 3 colaboradores activos.
            </AlertDescription>
          </Alert>
          <Alert variant="success">
            <Zap className="size-4" />
            <AlertTitle>Pago verificado</AlertTitle>
            <AlertDescription>
              El comprobante fue revisado y la suscripción está activa.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <Zap className="size-4" />
            <AlertTitle>Error de sincronización</AlertTitle>
            <AlertDescription>
              No pudimos sincronizar el inventario. Reintenta en unos minutos.
            </AlertDescription>
          </Alert>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <AICallout variant="insight" title="Panitas · Insight">
            Las ventas de sábados suben un 34% en las últimas 4 semanas.
          </AICallout>
          <AICallout variant="recommendation" title="Panitas · Recomendación">
            Reabastece el producto «Agua 5L» antes del jueves para no perder ventas.
          </AICallout>
          <AICallout variant="warning" title="Atención">
            3 productos tienen stock menor al umbral mínimo.
          </AICallout>
          <AICallout variant="success" title="Meta cumplida">
            Alcanzaste el objetivo de ventas del mes. 🎉
          </AICallout>
        </div>
      </Section>

      <Separator className="my-10" />

      {/* ── Métricas y cards ── */}
      <Section>
        <SectionHeader>
          <SectionTitle>Métricas</SectionTitle>
          <SectionDescription>La métrica es la protagonista: número grande primero, contexto después.</SectionDescription>
        </SectionHeader>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Ventas de hoy" value="Bs 1.250,00" delta={12.4} icon={<Zap className="size-4" />} />
          <MetricCard label="Pedidos pendientes" value="8" delta={-3.1} icon={<Boxes className="size-4" />} />
          <MetricCard label="Clientes nuevos" value="23" icon={<Users className="size-4" />} />
          <MetricCard label="Alertas de stock" value="3" delta={40} icon={<Bell className="size-4" />} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Card con acciones</CardTitle>
            <CardDescription>Encabezado con acción a la derecha.</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm">
                <Plus className="size-4" />
                Nuevo
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              La estructura <code className="rounded bg-muted px-1.5 py-0.5 text-xs">CardHeader / CardContent / CardFooter</code>{" "}
              es la base de todos los módulos.
            </p>
          </CardContent>
          <CardFooter className="justify-between">
            <p className="text-xs text-muted-foreground">Actualizado hace 2 min</p>
            <Button variant="outline" size="sm">Ver todos</Button>
          </CardFooter>
        </Card>
      </Section>

      <Separator className="my-10" />

      {/* ── Tablas y tabs ── */}
      <Section>
        <SectionHeader>
          <SectionTitle>Datos: tabs y tablas</SectionTitle>
          <SectionDescription>En móvil las tablas se apilan en cards automáticamente (data-label).</SectionDescription>
        </SectionHeader>
        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">Productos</TabsTrigger>
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
          </TabsList>
          <TabsContent value="products" className="pt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell data-label="Producto">Agua mineral 5L</TableCell>
                      <TableCell data-label="Precio">Bs 25,00</TableCell>
                      <TableCell data-label="Stock">120</TableCell>
                      <TableCell data-label="Estado"><Badge>Activo</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell data-label="Producto">Harina pan 1kg</TableCell>
                      <TableCell data-label="Precio">Bs 12,50</TableCell>
                      <TableCell data-label="Stock">0</TableCell>
                      <TableCell data-label="Estado"><Badge variant="destructive">Agotado</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell data-label="Producto">Aceina 1L</TableCell>
                      <TableCell data-label="Precio">Bs 18,00</TableCell>
                      <TableCell data-label="Stock">45</TableCell>
                      <TableCell data-label="Estado"><Badge variant="secondary">Bajo stock</Badge></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="orders" className="pt-4">
            <Card>
              <CardContent className="flex flex-col gap-3 p-5">
                <p className="text-sm text-muted-foreground">
                  Aquí iría la lista de pedidos. Los tabs preservan el estado al navegar.
                </p>
                <Button variant="secondary" size="sm" className="w-fit">
                  <ShoppingCart className="size-4" /> Ver pedidos
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Section>

      <Separator className="my-10" />

      {/* ── Overlays ── */}
      <Section>
        <SectionHeader>
          <SectionTitle>Overlays: diálogo, drawer y tooltip</SectionTitle>
          <SectionDescription>Usa diálogo para confirmaciones, sheet para paneles y tooltip para acciones con icono.</SectionDescription>
        </SectionHeader>
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 py-5">
            <Dialog>
              <DialogTrigger render={<Button variant="outline">Abrir diálogo</Button>} />
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>¿Eliminar este producto?</DialogTitle>
                  <DialogDescription>
                    Esta acción no se puede deshacer. El producto se quitará del
                    inventario y de la tienda.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="ghost">Cancelar</Button>} />
                  <Button variant="destructive">Eliminar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger render={<Button variant="outline">Abrir panel lateral</Button>} />
              <SheetContent side="right" className="w-full sm:max-w-sm">
                <SheetHeader>
                  <SheetTitle>Detalle del cliente</SheetTitle>
                  <SheetDescription>
                    Historial, deuda y contacto en un vistazo.
                  </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-4 px-4 text-sm text-muted-foreground">
                  <p>María Pérez · 0412-555-8877 · Negocio en crédito.</p>
                  <Button variant="secondary" size="sm">
                    <Users className="size-4" /> Ver historial
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<Button size="icon" variant="outline" aria-label="Info"><Info className="size-4" /></Button>} />
                <TooltipContent>Más información sobre esta sección</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardContent>
        </Card>
      </Section>

      <Separator className="my-10" />

      {/* ── Estados de carga y vacío ── */}
      <Section>
        <SectionHeader>
          <SectionTitle>Estados</SectionTitle>
          <SectionDescription>Skeleton para cargas, EmptyState para listas vacías, ErrorState para fallos.</SectionDescription>
        </SectionHeader>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Skeleton</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {skeletonLoading ? (
                <>
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">Cargado</p>
                  <p className="text-xs text-muted-foreground">Se recarga cada 4s.</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Empty</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState icon={Boxes} title="Sin productos todavía" description="Crea tu primer producto para empezar a vender." action={<Button size="sm"><Plus className="size-4" /> Crear producto</Button>} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <ErrorState onRetry={() => toast("Reintentando…")} />
            </CardContent>
          </Card>
        </div>
        <LoadingState message="Cargando módulo…" />
      </Section>

      <Separator className="my-10" />

      {/* ── Radios y sombras ── */}
      <Section>
        <SectionHeader>
          <SectionTitle>Radius, sombras y spacing</SectionTitle>
          <SectionDescription>
            Escalas canónicas. <code className="rounded bg-muted px-1.5 py-0.5 text-xs">shadow-subtle</code>,{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">shadow-medium</code> y{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">shadow-elevated</code>.
          </SectionDescription>
        </SectionHeader>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Radius</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3"><div className="size-10 rounded-sm bg-primary" /><span className="text-xs text-muted-foreground">rounded-sm</span></div>
              <div className="flex items-center gap-3"><div className="size-10 rounded-lg bg-primary" /><span className="text-xs text-muted-foreground">rounded-lg (8px)</span></div>
              <div className="flex items-center gap-3"><div className="size-10 rounded-xl bg-primary" /><span className="text-xs text-muted-foreground">rounded-xl (12px)</span></div>
              <div className="flex items-center gap-3"><div className="size-10 rounded-2xl bg-primary" /><span className="text-xs text-muted-foreground">rounded-2xl (16px)</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Sombras</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3"><div className="size-10 rounded-lg bg-background shadow-subtle ring-1 ring-border" /><span className="text-xs text-muted-foreground">subtle</span></div>
              <div className="flex items-center gap-3"><div className="size-10 rounded-lg bg-background shadow-medium ring-1 ring-border" /><span className="text-xs text-muted-foreground">medium</span></div>
              <div className="flex items-center gap-3"><div className="size-10 rounded-lg bg-background shadow-elevated ring-1 ring-border" /><span className="text-xs text-muted-foreground">elevated</span></div>
              <div className="flex items-center gap-3"><div className="size-10 rounded-lg bg-brand-primary shadow-glow" /><span className="text-xs text-muted-foreground">glow (brand)</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Spacing base</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              {[4, 8, 12, 16, 24].map((s) => (
                <div key={s} className="flex items-center gap-3">
                  <div className="flex-1 border-t border-dashed border-border" style={{ marginTop: s / 2 }} />
                  <span className="text-xs text-muted-foreground tabular-nums">{s}px</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </Section>

      <footer className="mt-14 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        Panitas Design System · FASE 9A · globals.css + src/components/design-system
      </footer>
    </div>
  )
}
