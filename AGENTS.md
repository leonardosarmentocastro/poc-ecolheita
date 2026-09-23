# poc-ecolheita — agent working agreements

<!-- hitl:start -->
<!-- hitl:knob local-gates -->
## Local gates

Local setup, once per clone: `pnpm install`, `pnpm db:up`, `pnpm --filter api db:migrate`
(the dev `ecolheita` database; the test and e2e harnesses migrate their own databases),
`pnpm e2e:install`.

Run before a PR opens:

- `pnpm test` — API suite (Vitest over HTTP, real Postgres, real embedding model) and web unit suite.
- `pnpm test:stories` — every story's `play()` in headless Chromium.
- `pnpm e2e` — Playwright against a production web build and the API on the e2e ports.

CI runs the same scripts (`scripts/ci/<job>.sh`); it is the backstop, not the first run.
<!-- hitl:end -->

## Test tiers

- API: HTTP tests in `apps/api/src/modules/<module>/__tests__/*.api.test.ts`; unit tests
  for pure logic beside them. See `apps/api/AGENTS.md`.
- Web: `unit > story + play() > e2e`. Every presentational component under
  `apps/web/src/modules/*/components/` and `apps/web/src/components/` has co-located
  stories; a component that fetches is a container, has no story, and renders a
  presentational component that receives everything as props. See `apps/web/AGENTS.md`.
- E2E: `e2e/modules/<domain>/*.test.ts`, elements located by role and visible text, serial.

## Accessibility (web)

WCAG 2.2 AA baseline. Targets at least 44×44 px; every gesture has a keyboard path and every
target an accessible name; an overlay is a `dialog` labelled by visible text, closes on
Escape and returns focus; never colour alone; amounts are `tabular-nums`; motion respects
`prefers-reduced-motion` (Mantine `theme.respectReducedMotion`).

## Domain

`CONTEXT.md` is ground truth for products, prices and what "the same product" means.
