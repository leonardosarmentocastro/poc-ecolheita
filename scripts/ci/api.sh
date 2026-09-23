#!/usr/bin/env bash
# CI job `api`: the API's Vitest suite. Needs a Postgres holding both `ecolheita` (the
# server's default database) and `ecolheita_test`, and DATABASE_URL pointing at
# `ecolheita_test` (the suite defaults to that URL when unset).
set -euo pipefail
cd "$(dirname "$0")/../.."

pnpm --filter api test
