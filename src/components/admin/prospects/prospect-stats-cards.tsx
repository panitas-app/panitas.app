import { Card, CardContent } from "@/components/ui/card"
import { Users, MapPin, Clock, TrendingUp } from "lucide-react"

interface ProspectStats {
  totalProspects: number
  newThisMonth: number
  visitsToday: number
  pendingFollowUps: number
  converted: number
  lost: number
  monthlyConversion: number
  yearlyConversion: number
}

interface ProspectStatsCardsProps {
  stats: ProspectStats
}

export function ProspectStatsCards({ stats }: ProspectStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card size="sm">
        <CardContent className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Users className="size-8 text-primary/40" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-heading font-bold leading-none">
              {stats.totalProspects}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total Prospectos</p>
            <p className="text-[10px] text-muted-foreground">
              +{stats.newThisMonth} este mes
            </p>
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
            <MapPin className="size-8 text-primary/40" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-heading font-bold leading-none">
              {stats.visitsToday}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Visitas Hoy</p>
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
            <Clock className="size-8 text-primary/40" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-heading font-bold leading-none">
              {stats.pendingFollowUps}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Seguimientos Pendientes</p>
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
            <TrendingUp className="size-8 text-primary/40" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-heading font-bold leading-none">
              {stats.monthlyConversion}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Conversión</p>
            <p className="text-[10px] text-muted-foreground">
              {stats.yearlyConversion}% anual
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
