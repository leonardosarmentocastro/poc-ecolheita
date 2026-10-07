import { defineConfig } from "@playwright/test";
import { e2eDatabaseUrl } from "./fixtures/db";

// Dedicated e2e ports (dev API is 3333, dev web is 3000). Overridable so a second suite —
// a self-hosted CI job on the same machine — never collides with a local run.
const API_PORT = Number(process.env.E2E_API_PORT ?? 4333);
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 4300);
const API_URL = `http://localhost:${API_PORT}`;
const DB_URL = e2eDatabaseUrl();

process.env.E2E_API_URL = API_URL; // seed.ts + tests read this
process.env.E2E_DATABASE_URL = DB_URL;

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.test.ts",
  fullyParallel: false,
  workers: 1,
  globalSetup: "./global-setup.ts",
  // The web app is served from a production build (see `webServer` below), so no test
  // pays a first-hit route compile and retries no longer paper one over. They stay for a
  // genuinely transient failure: the suite finishes rather than stopping at it, and the
  // retry's trace says "flaky" rather than "broken". `failOnFlakyTests` below keeps the job
  // red regardless.
  retries: process.env.CI ? 2 : 0,
  // A flake is a red job, not a green one. Without this a test that fails and then passes
  // on a retry is reported "1 flaky" and the process still exits 0, so a failing test
  // would read as a passing check.
  failOnFlakyTests: !!process.env.CI,
  // Both paths are relative to this file, so a failed run leaves its evidence under e2e/
  // — where .gitignore and the CI job's failure upload look for it. (An unset outputDir
  // would default to <cwd>/test-results, i.e. the repo root.)
  outputDir: "test-results",
  reporter: [["html", { outputFolder: "playwright-report", open: "never" }], ["list"]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    // A red run is read from its artifacts, not from the log.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "pnpm --filter api start",
      port: API_PORT,
      reuseExistingServer: false,
      // The API loads the embedding model before it listens; a cold model cache also
      // downloads it. Three minutes covers both on a runner.
      timeout: 180_000,
      // The scenario asserts the calibrated default threshold. An empty value is read as
      // unset by the API's env schema, and dotenv never overrides a variable already set,
      // so neither the shell nor apps/api/.env can move it.
      env: { PORT: String(API_PORT), DATABASE_URL: DB_URL, SEARCH_SIMILARITY_THRESHOLD: "" },
    },
    {
      // NEXT_PUBLIC_* is inlined at build time, so the build must see API_URL — which is
      // why it runs here, inside the same env block, and not in scripts/ci/e2e.sh.
      command: "pnpm --filter web build && pnpm --filter web start",
      port: WEB_PORT,
      reuseExistingServer: false,
      // Five minutes. The build measures 9.6-14.1s on a runner and 11.5-12.0s locally, and
      // Playwright's one-minute default leaves a cold build no margin. A *failed* build
      // does not consume this: the `&&` means the server never starts, and Playwright
      // rejects an early exit with "Process from config.webServer was not able to start",
      // so the piped build error is what a reader sees.
      timeout: 300_000,
      // So the build's own timing and errors reach the CI log.
      stdout: "pipe",
      env: { PORT: String(WEB_PORT), NEXT_PUBLIC_API_URL: API_URL },
    },
  ],
});
