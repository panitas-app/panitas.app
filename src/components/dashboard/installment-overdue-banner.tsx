"use client"

import { useState } from "react"
import { AlertTriangle, X } from "lucide-react"

interface Props {
  subscriptionId: string
  dueDate: Date
  amount: number
}

export function InstallmentOverdueBanner({ subscriptionId, dueDate, amount }: Props) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const daysOverdue = Math.floor((Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
      <AlertTriangle className="size-5 text-red-500 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-800">Segunda cuota vencida</p>
        <p className="text-xs text-red-700 mt-0.5">
          Tu segunda cuota de <strong>${amount.toFixed(2)}</strong> venció hace {daysOverdue} día{daysOverdue !== 1 ? "s" : ""}. Si no pagas, el servicio será suspendido.
        </p>
      </div>
      <button onClick={() => setDismissed(true)} className="text-red-400 hover:text-red-600">
        <X className="size-4" />
      </button>
    </div>
  )
}
