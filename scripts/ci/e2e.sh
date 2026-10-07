#!/usr/bin/env bash
# CI job `e2e`: the Playwright suite. Boots api + web on the e2e ports (E2E_API_PORT /
# E2E_WEB_PORT, default 4333 / 4300) and provisions `ecolheita_e2e` itself through the
# server's `ecolheita` database (E2E_DATABASE_URL). Never starts Postgres.
set -euo pipefail
cd "$(dirname "$0")/../.."

pnpm e2e:install
pnpm e2e
