#!/usr/bin/env bash
# CI job `web`: the web app's jsdom unit suite. Needs Node + pnpm only.
set -euo pipefail
cd "$(dirname "$0")/../.."

pnpm --filter web test
