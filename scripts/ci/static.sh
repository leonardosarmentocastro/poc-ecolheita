#!/usr/bin/env bash
# CI job `static`: typecheck, lint, build — every package, through Turbo.
# Runs from any cwd; needs Node + pnpm, nothing else. Stops at the first red check so
# the log names it.
# Formatting is checked, never written, here: the hook writes, CI only refuses.
set -euo pipefail
cd "$(dirname "$0")/../.."

pnpm typecheck
pnpm lint
pnpm prettier --check .
pnpm build
