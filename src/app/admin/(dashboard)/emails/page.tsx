"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Mail } from "lucide-react"

export default function AdminEmailsPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/emails").then(r => r.json()).then(d => { setData(d.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Emails</h1>
        <p className="text-sm text-muted-foreground">Historial de correos enviados</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destinatario</TableHead>
                <TableHead>Asunto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Intentos</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Mail className="size-8 text-muted-foreground/50" />
                    <p>Sin emails registrados aún</p>
                  </div>
                </TableCell></TableRow>
              ) : (
                data.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{e.to}</TableCell>
                    <TableCell className="text-sm">{e.subject}</TableCell>
                    <TableCell>
                      <Badge className={e.status === "sent" ? "bg-green-100 text-green-700" : e.status === "failed" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}>
                        {e.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{e.attempts}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.createdAt ? format(new Date(e.createdAt), "dd/MM/yyyy HH:mm") : "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
