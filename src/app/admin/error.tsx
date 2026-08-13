"use client"

import { ErrorState } from "@/components/ui/error-state"

export default function ErrorPage({
  reset,
}: {
  reset: () => void
}) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <ErrorState onRetry={reset} />
    </div>
  )
}
