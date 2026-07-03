import type { OnboardingEvent } from "@/lib/onboarding/types"

export function track(event: OnboardingEvent, properties?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[analytics] ${event}`, properties ?? "")
  }
  try {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, properties, timestamp: new Date().toISOString() }),
      keepalive: true,
    }).catch(() => {})
  } catch {}
}
