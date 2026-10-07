#!/usr/bin/env bash
# CI job `stories`: every story's play() in headless Chromium (Vitest browser mode).
# Installs the browser itself (a no-op on a warm cache); the OS packages Chromium needs
# on a bare runner are the workflow's job, not this script's.
#
# `pnpm e2e:install` installs the Chromium build that @playwright/test (root) wants; the
# Vitest browser provider runs apps/web's `playwright`. They must be the same version or
# the provider asks for a Chromium build that was never installed — refuse early, by name.
set -euo pipefail
cd "$(dirname "$0")/../.."

root_pw="$(node -p "require('@playwright/test/package.json').version")"
web_pw="$(node -p "require('./apps/web/node_modules/playwright/package.json').version")"
if [ "$root_pw" != "$web_pw" ]; then
  echo "stories: @playwright/test is $root_pw but apps/web's playwright is $web_pw — bump them together" >&2
  exit 1
fi

pnpm e2e:install
pnpm --filter web test:stories
