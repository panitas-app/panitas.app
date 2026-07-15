<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Panitas SaaS platform. PostHog is initialized client-side via `instrumentation-client.ts` (Next.js 15.3+ pattern) with a reverse proxy through `/ingest` to avoid ad blockers. A shared server-side client in `src/lib/posthog-server.ts` powers server-side tracking in API routes. Environment variables (`NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST`) are stored in `.env.local`. The `next.config.ts` was updated with the PostHog ingest rewrites, `skipTrailingSlashRedirect: true`, and an expanded CSP `connect-src`.

Six client-side events capture key user actions across the registration, subscription, store checkout, and POS flows. Three server-side events provide reliable, ad-blocker-resistant confirmation of the most critical business operations: user registration, store order creation, and subscription creation. User identification (`posthog.identify`) is called on successful email registration and on subscription submission.

| Event name | Description | File |
|---|---|---|
| `user_registered` | Fired on the client when a user successfully creates an account via email or Google | `src/components/auth/register-content.tsx` |
| `plan_selected` | Fired when a user clicks a plan CTA on the pricing page | `src/app/pricing/page.tsx` |
| `subscription_submitted` | Fired when a user successfully submits a subscription payment request | `src/app/subscribe/page.tsx` |
| `checkout_completed` | Fired on the client when a store customer's order is successfully placed | `src/app/store/[slug]/checkout/page.tsx` |
| `coupon_applied` | Fired when a customer successfully applies a discount coupon during checkout | `src/app/store/[slug]/checkout/page.tsx` |
| `pos_sale_completed` | Fired when a merchant processes a new sale through the POS terminal | `src/app/dashboard/nueva-venta/page.tsx` |
| `order_created` | Server-side event fired when an order is successfully persisted in the database | `src/app/api/checkout/route.ts` |
| `user_registered` | Server-side confirmation event fired after a new user account is saved | `src/app/api/auth/register/route.ts` |
| `subscription_created` | Server-side event fired when a subscription request is created pending admin approval | `src/app/api/subscriptions/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard**: [Analytics basics (wizard)](https://us.posthog.com/project/512880/dashboard/1851897)
- **Insight**: [New registrations by plan (wizard)](https://us.posthog.com/project/512880/insights/TOCrdXUy)
- **Insight**: [Subscription funnel (wizard)](https://us.posthog.com/project/512880/insights/8rJSJOb9)
- **Insight**: [Store orders created over time (wizard)](https://us.posthog.com/project/512880/insights/pO3E3lAe)
- **Insight**: [Checkout completion funnel (wizard)](https://us.posthog.com/project/512880/insights/kYjTYTLO)
- **Insight**: [POS sales volume (wizard)](https://us.posthog.com/project/512880/insights/f9Up7Pgd)

## Verify before merging

- [ ] Run a full production build (`npm run build`) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` to `.env.example` and any deployment environment configuration (Vercel, Docker, CI) so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or the Next.js bundler upload step) into CI so production stack traces de-minify in PostHog Error Tracking.
- [ ] Confirm the returning-visitor path also calls `identify` — currently `identify` is called on registration and subscription. Add an `identify` call wherever a user session is restored on page load (e.g. in a layout that reads the NextAuth session) so returning sessions are not left on anonymous distinct IDs.

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
