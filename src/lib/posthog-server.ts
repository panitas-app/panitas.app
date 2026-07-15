import { PostHog } from "posthog-node"

let posthogClient: PostHog | null = null

export function getPostHogClient(): PostHog {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  if (!token) {
    console.warn("PostHog project token is missing. Analytics is disabled.")
    // Return a dummy/mock client to avoid crashing runtime
    return {
      identify: () => {},
      capture: () => {},
      flush: async () => {},
    } as unknown as PostHog
  }

  if (!posthogClient) {
    posthogClient = new PostHog(token, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return posthogClient
}
