# Product vector search — slice 1: register and list

**Reviewed:** round 1 (2026-09-22) · round 2 (2026-09-22).
**Owns:** Registering a product and seeing it listed: the monorepo scaffold copied from treasury-2, pgvector Postgres, the `products` table, `POST` and `GET /products` (list and by id), the products page with its table and create drawer, the API, story and e2e harnesses, CI, and the durable docs (`AGENTS.md` local gates, `CONTEXT.md`, the two app `AGENTS.md`).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. In this repository the orchestrator is `/implement-stack`, which runs the implementer agent on this plan.

**Goal:** A person opens `/produtos`, registers a product through a drawer, and sees it in the table with its final price; the API proves the same over HTTP.

**Architecture:** pnpm and turbo monorepo with `apps/api` (Express 5, Drizzle, pg, Zod, Vitest over HTTP) and `apps/web` (Next 16, Mantine plus Tailwind v4, react-query, Storybook stories in Chromium), plus a root `e2e/` Playwright suite. Postgres 16 with pgvector from docker compose. Every file below is adapted from `treasury-2` at `/home/dev/code/leonardosarmentocastro/treasury-2` (a sibling checkout on this machine); the plan shows the adapted content in full, so the implementer never has to guess an adaptation.

**Tech Stack:** Node 24, pnpm 10, turbo 2, TypeScript 5.9, Express 5.2, drizzle-orm 0.45, drizzle-kit 0.31, pg 8, zod 4, Vitest 4, Next 16.2, React 19.2, @mantine/core 9.6, Tailwind 4.3, @tanstack/react-query 5, react-hook-form 7, Storybook 10.5, @playwright/test 1.62.

**Spec:** `docs/superpowers/specs/2026-09-22-product-vector-search-design.md`

## Global Constraints

- Branch `feat/product-vector-search-slice-1` off `feat/product-vector-search`; commits small, one TDD cycle each; never commit to `main`.
- **This slice crosses the twenty-file tripwire.** The scaffold (workspace, two apps, harnesses, CI) is unavoidable and cannot be split horizontally without producing slices with no behaviour to test.
- Ports and databases: API 3333, web 3000, e2e API 4333, e2e web 4300; databases `ecolheita`, `ecolheita_test`, `ecolheita_e2e`; Postgres image `pgvector/pgvector:pg16`; credentials `ecolheita` / `ecolheita`.
- Money is integer cents everywhere in the API and in web types; `finalPrice = Math.round(price * (100 - discountPercentage) / 100)`; the web formats with `formatBRL` and never computes a final price.
- Product row: `id` integer serial, `shopName`, `name`, `price`, `quantity`, `discountPercentage`, `createdAt`, `updatedAt`. **No `embedding` column in this slice** (slice 2 adds it). Duplicates of shop and name are allowed.
- Validation: strings trimmed and non-empty; `price >= 0`, `quantity >= 0`, `0 <= discountPercentage <= 100`, all integers. Errors: `ZodError → 400`, `NotFoundError → 404`, else `500`.
- UI copy in Portuguese; identifiers, routes, files and story names in English. Module folder `modules/products` (snake_case would be `products` anyway).
- Web rules from the spec and treasury-2's web `AGENTS.md`: Mantine owns behaviour, Tailwind owns layout, colours from Mantine's palette, no `style={{}}`, targets at least 44 px, every gesture has a keyboard path, a story asserts in `play()` what its name claims, containers that fetch are split from presentational components and have no stories.
- Not copied from treasury-2: `the-owl`, shadcn/`src/components/ui`, `sonner`, `next-themes`, `@base-ui`, `dnd-kit`, `lucide-react`, the calendar package, the `main` ruleset, every payroll module.
- Local gates named in `AGENTS.md` by this slice: `pnpm test`, `pnpm test:stories`, `pnpm e2e`. All three run green before the PR opens.
- The implementer reads `apps/web/node_modules/next/dist/docs/` before writing any Next.js file (the version differs from training data).

## Review Focus

Inputs the spec implies that no acceptance criterion exercises, each pinned by a test in the task that owns the code:

1. A price with decimals (`4.99`) or a string (`"4,99"`) sent to `POST /products` is rejected with 400, never silently truncated. (Task 3)
2. A discount of 101 or -1 is rejected with 400. (Task 3)
3. A malformed JSON body is 400 with `invalid_json`, not 500. (Task 2)
4. `GET /products/:id` with a non-numeric id is 404, not 500. (Task 4)
5. The reais input accepts `1.234,56` and `4.99` and rejects `abc`, so a person typing either Brazilian or keyboard-style decimals is not blocked. (Task 7)

---

### Task 1: Workspace scaffold and Postgres with pgvector

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.nvmrc`, `.prettierrc`, `.prettierignore`, `eslint.config.base.mjs`, `lefthook.yml`, `.env.example`, `docker-compose.yml`, `docker/postgres/init.sql`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `pnpm db:up` boots Postgres with pgvector on 5432 with databases `ecolheita` and `ecolheita_test`; `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:stories`, `pnpm e2e` run through turbo or Playwright.

This task is configuration, validated by watching it run (HITL: no test written to make config "TDD").

- [ ] **Step 1: Create the branch**

```bash
git checkout feat/product-vector-search
git pull --ff-only origin feat/product-vector-search
git checkout -b feat/product-vector-search-slice-1
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "poc-ecolheita",
  "private": true,
  "packageManager": "pnpm@10.33.2",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "db:up": "docker compose up -d",
    "db:down": "docker compose down",
    "e2e": "playwright test --config e2e/playwright.config.ts",
    "e2e:install": "playwright install chromium",
    "test:stories": "turbo run test:stories",
    "storybook": "pnpm --filter web storybook",
    "prepare": "if [ -z \"$CI\" ]; then lefthook install; fi"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.5",
    "@playwright/test": "^1.62.1",
    "@types/pg": "^8.20.0",
    "drizzle-orm": "^0.45.2",
    "eslint": "^9.39.5",
    "lefthook": "^2.1.12",
    "pg": "^8.22.0",
    "prettier": "^3.9.6",
    "turbo": "^2.10.7",
    "typescript-eslint": "^8.65.0",
    "vitest": "^4.1.10"
  }
}
```

- [ ] **Step 3: Write `pnpm-workspace.yaml`, `turbo.json`, `.nvmrc`, `.prettierrc`**

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"

ignoredBuiltDependencies:
  - sharp
  - unrs-resolver
```

`turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["eslint.config.base.mjs"],
  "tasks": {
    "build": { "outputs": ["dist/**", ".next/**"], "dependsOn": ["^build"] },
    "lint": {},
    "typecheck": {},
    "test": {},
    "test:stories": {},
    "dev": { "cache": false, "persistent": true }
  }
}
```

`.nvmrc`:

```
24
```

`.prettierrc`:

```json
{ "printWidth": 100 }
```

- [ ] **Step 4: Write `.prettierignore`**

```
# Build and tool output
node_modules/
dist/
.next/
.turbo/
storybook-static/
test-results/
e2e/test-results/
e2e/playwright-report/
__screenshots__/

# Generated
apps/api/drizzle/
pnpm-lock.yaml

# Prose is not formatted: AGENTS.md, CONTEXT.md, HITL.md and the agent prompts under
# .claude/ are read as instructions; a formatter changing a table in them is a behaviour
# change nothing tests.
*.md
```

- [ ] **Step 5: Write `eslint.config.base.mjs`**

```js
// Shared ESLint config for apps/api. apps/web keeps Next's own config. Recommended sets
// only — style is Prettier's job — plus one option: names that start with `_` are unused
// on purpose.
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default defineConfig([
  { ignores: ["dist/**", "drizzle/**", ".models/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
]);
```

- [ ] **Step 6: Write `lefthook.yml`**

```yaml
# Pre-commit only; there is no pre-push hook. Tests stay with the mandated local gates
# and CI. `prettier` runs first and alone, rewriting and re-staging the staged files, then
# the parallel group reads them.
pre-commit:
  jobs:
    - name: prettier
      glob:
        - "*.{ts,tsx,js,mjs,cjs,json,yml,yaml,css}"
        - ".prettierrc"
      run: pnpm prettier --write {staged_files}
      stage_fixed: true

    - name: checks
      group:
        parallel: true
        jobs:
          - name: eslint-web
            root: "apps/web/"
            glob: "*.{ts,tsx,mjs}"
            run: pnpm eslint {staged_files}
          - name: eslint-api
            root: "apps/api/"
            glob: "*.ts"
            run: pnpm eslint {staged_files}
          - name: typecheck
            run: pnpm typecheck
```

- [ ] **Step 7: Write `.env.example`, `docker-compose.yml`, `docker/postgres/init.sql`**

`.env.example`:

```
# apps/api
DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5432/ecolheita
TEST_DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5432/ecolheita_test
E2E_DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5432/ecolheita_e2e
PORT=3333

# apps/web
NEXT_PUBLIC_API_URL=http://localhost:3333
```

`docker-compose.yml`:

```yaml
services:
  postgres:
    # Postgres 16 with the pgvector extension available (slice 2 runs CREATE EXTENSION).
    image: pgvector/pgvector:pg16
    restart: unless-stopped
    environment:
      POSTGRES_USER: ecolheita
      POSTGRES_PASSWORD: ecolheita
      POSTGRES_DB: ecolheita
    ports:
      - "5432:5432"
    volumes:
      - ecolheita_pgdata:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ecolheita -d ecolheita"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  ecolheita_pgdata:
```

`docker/postgres/init.sql`:

```sql
CREATE DATABASE ecolheita_test;
```

- [ ] **Step 8: Append to `.gitignore`**

```
node_modules/
.env
.env.local
dist/
.next/
.turbo/
/e2e/test-results/
/e2e/playwright-report/
/e2e/.playwright/
test-results/
storybook-static/

# Vitest browser mode writes failure screenshots beside the story file
__screenshots__/
```

- [ ] **Step 9: Install and boot Postgres; watch it run**

```bash
pnpm install
pnpm db:up
docker compose ps
psql postgres://ecolheita:ecolheita@localhost:5432/ecolheita -c "SELECT 1"
psql postgres://ecolheita:ecolheita@localhost:5432/ecolheita_test -c "SELECT 1"
psql postgres://ecolheita:ecolheita@localhost:5432/ecolheita -c "SELECT name FROM pg_available_extensions WHERE name = 'vector'"
```

Expected: the container is healthy, both databases answer, and the last query prints one row `vector`. If the `ecolheita_test` database is missing, the volume predates this file: run `pnpm db:down && docker volume rm poc-ecolheita_ecolheita_pgdata && pnpm db:up`.

- [ ] **Step 10: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json .nvmrc .prettierrc .prettierignore eslint.config.base.mjs lefthook.yml .env.example docker-compose.yml docker/postgres/init.sql .gitignore
git commit -m "chore: pnpm workspace, turbo and pgvector postgres"
```

---

### Task 2: API skeleton with a health endpoint and the products table migration

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/vitest.config.ts`, `apps/api/drizzle.config.ts`, `apps/api/eslint.config.mjs`, `apps/api/.env.example`, `apps/api/src/config/env.ts`, `apps/api/src/db/client.ts`, `apps/api/src/db/data/errors.ts`, `apps/api/src/db/schema.ts`, `apps/api/src/server/server.ts`, `apps/api/src/server/start.ts`, `apps/api/src/server/ensure-port-available.ts`, `apps/api/src/server/middlewares/connect.ts`, `apps/api/src/server/middlewares/error-handler-middleware.ts`, `apps/api/src/server/middlewares/__tests__/error-handler-middleware.test.ts`, `apps/api/src/server/routes/connect.ts`, `apps/api/src/modules/health/routes.ts`, `apps/api/src/modules/health/resolvers/index.ts`, `apps/api/src/modules/health/resolvers/get-health-resolver.ts`, `apps/api/src/modules/health/__tests__/health.api.test.ts`, `apps/api/src/modules/products/model.ts`, `apps/api/drizzle/0000_*.sql` (generated), `apps/api/test/global-setup.ts`, `apps/api/test/setup.ts`, `apps/api/test/helpers.ts`

**Interfaces:**
- Produces: `createApp(): Express` from `@/server/server`; `startServer()` / `stopServer()` from `@test/helpers`; `db` and `pool` from `@/db/client`; `NotFoundError` from `@/db/data/errors`; `products` table from `@/modules/products/model`.

The products model and its migration are created here because the test harness migrates on setup and Drizzle's migrator needs at least one migration to exist. The model's behaviour is proven in Task 3. This task takes HITL's "no test runner yet" allowance: the harness and the server skeleton are written together, and the health and error-handler tests are written and run red (Steps 7 and 8) before the code that makes them pass (Steps 9 and 10).

- [ ] **Step 1: Write `apps/api/package.json`**

```json
{
  "name": "api",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/server/start.ts",
    "start": "tsx src/server/start.ts",
    "build": "tsc",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "test": "vitest run"
  },
  "dependencies": {
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "drizzle-orm": "^0.45.2",
    "drizzle-zod": "^0.8.3",
    "express": "^5.2.1",
    "pg": "^8.22.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/node": "^24.13.3",
    "@types/pg": "^8.20.0",
    "drizzle-kit": "^0.31.10",
    "tsx": "^4.23.1",
    "typescript": "^5.9.3",
    "vite": "^6",
    "vitest": "^4.1.10"
  }
}
```

- [ ] **Step 2: Write `apps/api/tsconfig.json`, `vitest.config.ts`, `drizzle.config.ts`, `eslint.config.mjs`, `.env.example`**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@test/*": ["test/*"]
    },
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src", "test"],
  "exclude": ["node_modules", "dist"]
}
```

`vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

process.env.NODE_ENV ||= "test";
process.env.DATABASE_URL ||= "postgres://ecolheita:ecolheita@localhost:5432/ecolheita_test";

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@test\//, replacement: fileURLToPath(new URL("./test/", import.meta.url)) },
      { find: /^@\//, replacement: fileURLToPath(new URL("./src/", import.meta.url)) },
    ],
  },
  test: {
    globalSetup: ["./test/global-setup.ts"],
    setupFiles: ["./test/setup.ts"],
    fileParallelism: false,
  },
});
```

`drizzle.config.ts`:

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://ecolheita:ecolheita@localhost:5432/ecolheita",
  },
});
```

`eslint.config.mjs`:

```js
export { default } from "../../eslint.config.base.mjs";
```

`.env.example`:

```
DATABASE_URL=postgres://ecolheita:ecolheita@localhost:5432/ecolheita
PORT=3333
```

- [ ] **Step 3: Write config, db client, errors and schema**

`src/config/env.ts`:

```ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().default(3333),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
```

`src/db/client.ts`:

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/config/env";

// `pool` manages a reusable set of Postgres connections, lending one out per query.
export const pool = new Pool({ connectionString: env.DATABASE_URL });
// `db` builds typed queries and delegates execution to `pool`.
export const db = drizzle(pool);
```

`src/db/data/errors.ts`:

```ts
/** Raised when a data lookup finds no matching record; the error handler maps it to 404. */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}
```

`src/db/schema.ts`:

```ts
export * from "@/modules/products/model";
```

- [ ] **Step 4: Write the products model (structure only; behaviour is Task 3)**

`src/modules/products/model.ts`:

```ts
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  shopName: text("shop_name").notNull(),
  name: text("name").notNull(),
  // Integer cents (CONTEXT.md). The discounted price is derived, never stored.
  price: integer("price").notNull(),
  // Stock available, in units.
  quantity: integer("quantity").notNull(),
  discountPercentage: integer("discount_percentage").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 5: Write the test harness**

`test/global-setup.ts`:

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

export default async function setup(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
}
```

`test/setup.ts`:

```ts
import { afterAll, beforeEach } from "vitest";
import { pool } from "@/db/client";

beforeEach(async () => {
  await pool.query("TRUNCATE TABLE products RESTART IDENTITY CASCADE");
});

afterAll(async () => {
  await pool.end();
});
```

`test/helpers.ts`:

```ts
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "@/server/server";

export const startServer = async (): Promise<{ server: Server; base: string }> => {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  return { server, base: `http://localhost:${port}` };
};

export const stopServer = (server: Server): Promise<void> =>
  new Promise((resolve) => server.close(() => resolve()));

export const json = (base: string, path: string, init?: RequestInit) =>
  fetch(`${base}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
```

- [ ] **Step 6: Generate the first migration**

```bash
cd apps/api && pnpm install && pnpm db:generate
ls drizzle
```

Expected: one `0000_<name>.sql` creating `products` and a `meta/` folder. Open the SQL and confirm the eight columns.

- [ ] **Step 7: Write the failing health and error-handler tests**

`src/modules/health/__tests__/health.api.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { startServer, stopServer } from "@test/helpers";

describe("GET /health", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    ({ server, base } = await startServer());
  });
  afterAll(async () => {
    await stopServer(server);
  });

  it("returns ok", async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
```

`src/server/middlewares/__tests__/error-handler-middleware.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { startServer, stopServer } from "@test/helpers";

describe("error handler", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    ({ server, base } = await startServer());
  });
  afterAll(async () => {
    await stopServer(server);
  });

  it("maps a malformed JSON body to 400 invalid_json", async () => {
    const res = await fetch(`${base}/test/middlewares/json`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ not json",
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_json");
  });

  it("maps a ZodError to 400 validation_error with issues", async () => {
    const res = await fetch(`${base}/test/middlewares/zod-error`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("validation_error");
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it("maps NotFoundError to 404", async () => {
    const res = await fetch(`${base}/test/middlewares/not-found`);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("resource not found");
  });

  it("maps anything else to 500", async () => {
    const res = await fetch(`${base}/test/middlewares/boom`);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("internal_server_error");
  });
});
```

- [ ] **Step 8: Run the tests to verify they fail**

```bash
cd apps/api && pnpm test
```

Expected: FAIL — `@/server/server` does not exist yet, so `startServer` cannot import `createApp`.

- [ ] **Step 9: Write the server**

`src/server/server.ts`:

```ts
import express, { type Express } from "express";
import { connectErrorHandler, connectMiddlewares } from "@/server/middlewares/connect";
import { connectRoutes } from "@/server/routes/connect";

export const createApp = (): Express => {
  const app = express();
  connectMiddlewares(app);
  connectRoutes(app);
  connectErrorHandler(app);
  return app;
};
```

`src/server/start.ts`:

```ts
import "dotenv/config";
import { createApp } from "@/server/server";
import { env } from "@/config/env";
import { ensurePortAvailable, reportPortInUse } from "@/server/ensure-port-available";

await ensurePortAvailable(env.PORT);

const server = createApp().listen(env.PORT, () => {
  console.log(`api listening on http://localhost:${env.PORT}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") reportPortInUse(env.PORT);
  throw err;
});
```

`src/server/ensure-port-available.ts`: copy verbatim from `treasury-2/apps/api/src/server/ensure-port-available.ts` (no treasury-specific content).

`src/server/middlewares/connect.ts`:

```ts
import cors from "cors";
import express, { type Express } from "express";
import { errorHandlerMiddleware } from "@/server/middlewares/error-handler-middleware";

/** Global request middlewares, applied BEFORE routes. */
export const connectMiddlewares = (app: Express): void => {
  app.use(cors({ origin: true }));
  app.use(express.json());
};

/** Terminal error handler; Express only routes errors to it when registered AFTER routes. */
export const connectErrorHandler = (app: Express): void => {
  app.use(errorHandlerMiddleware);
};
```

`src/server/middlewares/error-handler-middleware.ts`:

```ts
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { NotFoundError } from "@/db/data/errors";

// `express.json()` throws a SyntaxError tagged `entity.parse.failed` when the body is not
// valid JSON. That is a client mistake (400), not a server fault (500).
const isBodyParseError = (err: unknown): boolean =>
  err instanceof SyntaxError &&
  "type" in err &&
  (err as { type?: unknown }).type === "entity.parse.failed";

export const errorHandlerMiddleware = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (isBodyParseError(err)) {
    res.status(400).json({ error: "invalid_json" });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: "validation_error", issues: err.issues });
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "internal_server_error" });
};
```

`src/server/routes/connect.ts`:

```ts
import { Router, type Express } from "express";
import { z } from "zod";
import { NotFoundError } from "@/db/data/errors";
import { healthRouter } from "@/modules/health/routes";

/** Mounts every module's router under its base path. The single source of truth for routing. */
export const connectRoutes = (app: Express): void => {
  app.use("/health", healthRouter);

  // Test-only routes that trigger each branch of the error handler, so middleware behaviour
  // is tested where it is owned instead of through a domain module.
  if (process.env.NODE_ENV === "test") {
    const testMiddlewaresRouter = Router();
    testMiddlewaresRouter.post("/json", (_req, res) => {
      res.status(200).json({ ok: true });
    });
    testMiddlewaresRouter.get("/zod-error", () => {
      z.object({ id: z.string() }).parse({});
    });
    testMiddlewaresRouter.get("/not-found", () => {
      throw new NotFoundError("resource not found");
    });
    testMiddlewaresRouter.get("/boom", () => {
      throw new Error("unexpected failure");
    });
    app.use("/test/middlewares", testMiddlewaresRouter);
  }
};
```

- [ ] **Step 10: Write the health module**

`src/modules/health/routes.ts`:

```ts
import { Router } from "express";
import * as resolvers from "@/modules/health/resolvers";

export const healthRouter = Router();

healthRouter.get("/", resolvers.getHealthResolver);
```

`src/modules/health/resolvers/index.ts`:

```ts
export * from "@/modules/health/resolvers/get-health-resolver";
```

`src/modules/health/resolvers/get-health-resolver.ts`:

```ts
import type { Request, Response } from "express";

export const getHealthResolver = (_req: Request, res: Response): void => {
  res.status(200).json({ status: "ok" });
};
```

- [ ] **Step 11: Run the tests to verify they pass; migrate the dev database**

```bash
cd apps/api && pnpm test && pnpm typecheck && pnpm lint
pnpm db:migrate
psql postgres://ecolheita:ecolheita@localhost:5432/ecolheita -c "\\d products"
```

Expected: both test files green; `db:migrate` applies `0000_*` to the dev `ecolheita` database (the test harness migrates only `ecolheita_test`, the e2e setup only `ecolheita_e2e`), and `\d products` lists the eight columns. Every later migration is applied to the dev database the same way, right after it is generated.

- [ ] **Step 12: Commit**

```bash
git add apps/api
git commit -m "feat(api): express skeleton, health endpoint, products table migration"
```

---

### Task 3: `POST /products` with validation and `finalPrice`

**Files:**
- Create: `apps/api/src/modules/products/schema.ts`, `apps/api/src/modules/products/types.ts`, `apps/api/src/modules/products/utils/final-price.ts`, `apps/api/src/modules/products/utils/to-product.ts`, `apps/api/src/modules/products/repository.ts`, `apps/api/src/modules/products/resolvers/create-product-resolver.ts`, `apps/api/src/modules/products/resolvers/index.ts`, `apps/api/src/modules/products/routes.ts`, `apps/api/src/modules/products/__tests__/fixtures.ts`, `apps/api/src/modules/products/__tests__/final-price.test.ts`, `apps/api/src/modules/products/__tests__/create-product.api.test.ts`
- Modify: `apps/api/src/server/routes/connect.ts`

**Interfaces:**
- Produces: `createProductSchema` and `CreateProductInput` from `@/modules/products/schema`; `ProductRow` and `Product` (row plus `finalPrice`) from `@/modules/products/types`; `finalPrice(price, discountPercentage): number`; `toProduct(row): Product`; `productsRepository.create(input): Promise<Product>`; `productsRouter` mounted at `/products`.

- [ ] **Step 1: Write the failing `finalPrice` unit test**

`src/modules/products/__tests__/final-price.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { finalPrice } from "@/modules/products/utils/final-price";

describe("finalPrice", () => {
  it("applies the discount to integer cents", () => {
    expect(finalPrice(600, 50)).toBe(300);
    expect(finalPrice(800, 80)).toBe(160);
  });

  it("rounds half up", () => {
    // 333 * 0.5 = 166.5 → 167
    expect(finalPrice(333, 50)).toBe(167);
  });

  it("is the price itself at 0% and zero at 100%", () => {
    expect(finalPrice(499, 0)).toBe(499);
    expect(finalPrice(499, 100)).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd apps/api && pnpm vitest run src/modules/products/__tests__/final-price.test.ts
```

Expected: FAIL, module not found.

- [ ] **Step 3: Implement `finalPrice` and `toProduct`**

`src/modules/products/utils/final-price.ts`:

```ts
/** Discounted price in integer cents, rounded half up (CONTEXT.md). */
export const finalPrice = (price: number, discountPercentage: number): number =>
  Math.round((price * (100 - discountPercentage)) / 100);
```

`src/modules/products/types.ts`:

```ts
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { products } from "@/modules/products/model";

export type ProductRow = InferSelectModel<typeof products>;
export type NewProduct = InferInsertModel<typeof products>;

/** The API's product: the row plus the derived final price. */
export type Product = ProductRow & { finalPrice: number };
```

`src/modules/products/utils/to-product.ts`:

```ts
import type { Product, ProductRow } from "@/modules/products/types";
import { finalPrice } from "@/modules/products/utils/final-price";

/** Shapes a row for the API: adds `finalPrice`. */
export const toProduct = (row: ProductRow): Product => ({
  ...row,
  finalPrice: finalPrice(row.price, row.discountPercentage),
});
```

- [ ] **Step 4: Run the unit test to verify it passes**

```bash
cd apps/api && pnpm vitest run src/modules/products/__tests__/final-price.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write the failing HTTP test for create**

`src/modules/products/__tests__/fixtures.ts`:

```ts
export const bananaPrata = {
  shopName: "VEC Hortifruti",
  name: "Banana prata",
  price: 500,
  quantity: 10,
  discountPercentage: 30,
};
```

`src/modules/products/__tests__/create-product.api.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { json, startServer, stopServer } from "@test/helpers";
import { bananaPrata } from "./fixtures";

describe("POST /products", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    ({ server, base } = await startServer());
  });
  afterAll(async () => {
    await stopServer(server);
  });

  it("creates a product and returns it with finalPrice (201)", async () => {
    const res = await json(base, "/products", { method: "POST", body: JSON.stringify(bananaPrata) });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ ...bananaPrata, finalPrice: 350 });
    expect(typeof body.id).toBe("number");
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
  });

  it("trims shop name and name", async () => {
    const res = await json(base, "/products", {
      method: "POST",
      body: JSON.stringify({ ...bananaPrata, shopName: "  CEASA SJC  ", name: "  Banana  " }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.shopName).toBe("CEASA SJC");
    expect(body.name).toBe("Banana");
  });

  it("allows the same shop to register the same name twice (two offers)", async () => {
    const first = await json(base, "/products", { method: "POST", body: JSON.stringify(bananaPrata) });
    const second = await json(base, "/products", {
      method: "POST",
      body: JSON.stringify({ ...bananaPrata, price: 450 }),
    });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect((await first.json()).id).not.toBe((await second.json()).id);
  });

  it.each([
    ["whitespace-only shop name", { shopName: "   " }],
    ["whitespace-only name", { name: "   " }],
    ["price with decimals", { price: 4.99 }],
    ["price as a string", { price: "4,99" }],
    ["negative price", { price: -1 }],
    ["negative quantity", { quantity: -1 }],
    ["discount above 100", { discountPercentage: 101 }],
    ["negative discount", { discountPercentage: -1 }],
    ["missing discount", { discountPercentage: undefined }],
  ])("rejects %s (400)", async (_label, patch) => {
    const res = await json(base, "/products", {
      method: "POST",
      body: JSON.stringify({ ...bananaPrata, ...patch }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("validation_error");
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

```bash
cd apps/api && pnpm vitest run src/modules/products/__tests__/create-product.api.test.ts
```

Expected: FAIL with 404 responses (route not mounted).

- [ ] **Step 7: Implement schema, repository, resolver, routes**

`src/modules/products/schema.ts`:

```ts
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { products } from "@/modules/products/model";

const insertSchema = createInsertSchema(products, {
  shopName: (s) => s.trim().min(1, "shopName is required"),
  name: (s) => s.trim().min(1, "name is required"),
  price: () => z.number().int().min(0),
  quantity: () => z.number().int().min(0),
  discountPercentage: () => z.number().int().min(0).max(100),
});

export const createProductSchema = insertSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
```

`src/modules/products/repository.ts`:

```ts
import { db } from "@/db/client";
import { products } from "@/modules/products/model";
import type { CreateProductInput } from "@/modules/products/schema";
import type { Product } from "@/modules/products/types";
import { toProduct } from "@/modules/products/utils/to-product";

/**
 * Every products write goes through here. Slice 2 adds the embedding step to `create`,
 * which is why this repository is the one write path (spec § Embedding module).
 */
export const productsRepository = {
  async create(input: CreateProductInput): Promise<Product> {
    const [row] = await db.insert(products).values(input).returning();
    return toProduct(row);
  },
};
```

`src/modules/products/resolvers/create-product-resolver.ts`:

```ts
import type { Request, Response, NextFunction } from "express";
import { productsRepository } from "@/modules/products/repository";
import { createProductSchema } from "@/modules/products/schema";

export const createProductResolver = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const input = createProductSchema.parse(req.body);
    res.status(201).json(await productsRepository.create(input));
  } catch (err) {
    next(err);
  }
};
```

`src/modules/products/resolvers/index.ts`:

```ts
export * from "@/modules/products/resolvers/create-product-resolver";
```

`src/modules/products/routes.ts`:

```ts
import { Router } from "express";
import * as resolvers from "@/modules/products/resolvers";

export const productsRouter = Router();

productsRouter.post("/", resolvers.createProductResolver);
```

In `src/server/routes/connect.ts`, add the import and the mount right after `/health`:

```ts
import { productsRouter } from "@/modules/products/routes";
// ...
app.use("/products", productsRouter);
```

- [ ] **Step 8: Run the tests to verify they pass**

```bash
cd apps/api && pnpm test && pnpm typecheck && pnpm lint
```

Expected: all green. If `drizzle-zod`'s number refinement signature complains, replace the `price`, `quantity` and `discountPercentage` overrides with `(s) => s.int().min(0)` style refinements on the generated schema; the test is the contract.

- [ ] **Step 9: Commit**

```bash
git add apps/api
git commit -m "feat(api): POST /products with validation and finalPrice"
```

---

### Task 4: `GET /products` (newest first) and `GET /products/:id`

**Files:**
- Create: `apps/api/src/modules/products/resolvers/list-products-resolver.ts`, `apps/api/src/modules/products/resolvers/get-product-resolver.ts`, `apps/api/src/modules/products/__tests__/list-products.api.test.ts`, `apps/api/src/modules/products/__tests__/get-product.api.test.ts`
- Modify: `apps/api/src/modules/products/repository.ts`, `apps/api/src/modules/products/resolvers/index.ts`, `apps/api/src/modules/products/routes.ts`

**Interfaces:**
- Produces: `productsRepository.findAll(): Promise<Product[]>` (newest first), `productsRepository.findById(id: number): Promise<Product | undefined>`; routes `GET /products`, `GET /products/:id`.

- [ ] **Step 1: Write the failing tests**

`src/modules/products/__tests__/list-products.api.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { json, startServer, stopServer } from "@test/helpers";
import { bananaPrata } from "./fixtures";

describe("GET /products", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    ({ server, base } = await startServer());
  });
  afterAll(async () => {
    await stopServer(server);
  });

  it("returns an empty list when nothing is registered", async () => {
    const res = await fetch(`${base}/products`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("lists products newest first, each with finalPrice", async () => {
    await json(base, "/products", { method: "POST", body: JSON.stringify({ ...bananaPrata, name: "Banana" }) });
    await json(base, "/products", { method: "POST", body: JSON.stringify({ ...bananaPrata, name: "Banana nanica" }) });
    const res = await fetch(`${base}/products`);
    const body = await res.json();
    expect(body.map((p: { name: string }) => p.name)).toEqual(["Banana nanica", "Banana"]);
    expect(body[0].finalPrice).toBe(350);
  });
});
```

`src/modules/products/__tests__/get-product.api.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { json, startServer, stopServer } from "@test/helpers";
import { bananaPrata } from "./fixtures";

describe("GET /products/:id", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    ({ server, base } = await startServer());
  });
  afterAll(async () => {
    await stopServer(server);
  });

  it("returns the product with finalPrice", async () => {
    const created = await (
      await json(base, "/products", { method: "POST", body: JSON.stringify(bananaPrata) })
    ).json();
    const res = await fetch(`${base}/products/${created.id}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ...bananaPrata, id: created.id, finalPrice: 350 });
  });

  it("is 404 for an unknown id", async () => {
    const res = await fetch(`${base}/products/999999`);
    expect(res.status).toBe(404);
  });

  it("is 404 for a non-numeric id, never 500", async () => {
    const res = await fetch(`${base}/products/abc`);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

```bash
cd apps/api && pnpm vitest run src/modules/products/__tests__/list-products.api.test.ts src/modules/products/__tests__/get-product.api.test.ts
```

Expected: FAIL with 404 on `GET /products` and on `/products/:id`.

- [ ] **Step 3: Implement repository reads and resolvers**

Add to `productsRepository` in `repository.ts` (imports: `desc, eq` from `drizzle-orm`):

```ts
  async findAll(): Promise<Product[]> {
    const rows = await db.select().from(products).orderBy(desc(products.createdAt), desc(products.id));
    return rows.map(toProduct);
  },

  async findById(id: number): Promise<Product | undefined> {
    if (!Number.isInteger(id)) return undefined;
    const [row] = await db.select().from(products).where(eq(products.id, id));
    return row ? toProduct(row) : undefined;
  },
```

`resolvers/list-products-resolver.ts`:

```ts
import type { Request, Response, NextFunction } from "express";
import { productsRepository } from "@/modules/products/repository";

export const listProductsResolver = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.status(200).json(await productsRepository.findAll());
  } catch (err) {
    next(err);
  }
};
```

`resolvers/get-product-resolver.ts`:

```ts
import type { Request, Response, NextFunction } from "express";
import { NotFoundError } from "@/db/data/errors";
import { productsRepository } from "@/modules/products/repository";

export const getProductResolver = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const found = await productsRepository.findById(Number(req.params.id));
    if (!found) throw new NotFoundError(`product ${req.params.id} not found`);
    res.status(200).json(found);
  } catch (err) {
    next(err);
  }
};
```

`resolvers/index.ts` gains the two exports; `routes.ts` becomes:

```ts
productsRouter.get("/", resolvers.listProductsResolver);
productsRouter.post("/", resolvers.createProductResolver);
productsRouter.get("/:id", resolvers.getProductResolver);
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd apps/api && pnpm test && pnpm typecheck && pnpm lint
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(api): GET /products newest first and GET /products/:id"
```

---

### Task 5: Durable docs: `CONTEXT.md`, `AGENTS.md` local gates, the two app `AGENTS.md`

**Files:**
- Create: `CONTEXT.md`, `apps/api/AGENTS.md`, `apps/web/AGENTS.md`
- Modify: `AGENTS.md`

Docs only; no test. They are written now, before the web app, so the web tasks below are held to the rules they name.

- [ ] **Step 1: Write `CONTEXT.md`**

```markdown
# Ecolheita — domain context

Business definitions and rules that agents and contributors treat as **ground truth**. Code
that contradicts them is a bug. Workflow conventions live in the `AGENTS.md` files.

## Ubiquitous language

- **Product (`produto`)** — one shop's offer of one item: `shopName` (free text typed at
  registration), `name` (free text; what a shopper searches), `price` in **integer cents**,
  `quantity` (stock available, in units), `discountPercentage` (integer 0..100).
- **Final price (`preço final`)** — derived, never stored:
  `round(price * (100 - discountPercentage) / 100)` in cents, rounding half up. The API
  computes it; the web never computes a final price.
- **Best price** — the lowest final price, never the biggest discount percentage.
- **Duplicates are two offers.** Two rows with the same shop and name are two offers and
  both are listed; there is no uniqueness rule. A shop may sell the same item in several
  lots (issue #3), and this matches it.
- **Same product across shops** — "banana", "banana prata" and "banana nanica" count as the
  same product for a shopper; cultivars are included (recall over precision, for the
  food-waste use case). "Bananada" and "bolo de banana" are different products.

## Not in the model yet

- Units and pack sizes (issue #2): every price is for the same implicit unit.
- Shops as an entity, batches, expiry dates, distance, basket (issue #3).
```

- [ ] **Step 2: Replace the local-gates line in the root `AGENTS.md`**

Change the `## Local gates` section body (inside the `hitl:knob local-gates` block) from `none yet — …` to:

```markdown
## Local gates

Local setup, once per clone: `pnpm install`, `pnpm db:up`, `pnpm --filter api db:migrate`
(the dev `ecolheita` database; the test and e2e harnesses migrate their own databases),
`pnpm e2e:install`.

Run before a PR opens:

- `pnpm test` — API suite (Vitest over HTTP, real Postgres, real embedding model) and web unit suite.
- `pnpm test:stories` — every story's `play()` in headless Chromium.
- `pnpm e2e` — Playwright against a production web build and the API on the e2e ports.

CI runs the same scripts (`scripts/ci/<job>.sh`); it is the backstop, not the first run.
```

Below the hitl block, append:

```markdown
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
```

- [ ] **Step 3: Write `apps/api/AGENTS.md`**

Copy `treasury-2/apps/api/AGENTS.md` and make these edits: title "Ecolheita API — architecture & conventions"; replace every `expense` / `expenses` example with `product` / `products`; drop the sentence about `the-owl`; in "Data access", append this paragraph:

```markdown
- **One exception, on purpose:** the products repository's `create` and `update` also
  normalise and embed the product name before writing (from slice 2 on). Every writer —
  resolvers, the seed script, tests — goes through them, so "a product without a vector
  never exists" has exactly one owner. Do not add a second write path.
```

In "Validation & errors", keep `ZodError -> 400`, `NotFoundError -> 404`, else `500` (there is no `ConflictError` here).

- [ ] **Step 4: Write `apps/web/AGENTS.md`**

Copy `treasury-2/apps/web/AGENTS.md` and make these edits: title "Ecolheita Web — conventions"; in Layout replace the `expenses` example module with `products`; delete the `components/ui/` shadcn line and the sentence "A shadcn primitive is replaced when a slice touches it"; delete the "Effective date" and "grandfathered" sentences (every component here is new); replace the notifications sentence with "Notifications go through `src/lib/notify.ts`"; in "Data & forms" write "Money display uses `modules/products/utils/format-brl.ts`; API amounts are **cents**; the form parses reais typed by a person into cents in `modules/products/utils/parse-reais-to-cents.ts`." Keep the whole Styling rule list and the `dom/` section. Keep the `nextjs-agent-rules` block at the top.

- [ ] **Step 5: Commit**

```bash
git add CONTEXT.md AGENTS.md apps/api/AGENTS.md apps/web/AGENTS.md
git commit -m "docs: CONTEXT.md, local gates and app conventions"
```

---

### Task 6: Web app skeleton, header, and the request helper

**Files:**
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.ts`, `apps/web/postcss.config.mjs`, `apps/web/eslint.config.mjs`, `apps/web/vitest.config.ts`, `apps/web/vitest.setup.ts`, `apps/web/.storybook/main.ts`, `apps/web/.storybook/preview.tsx`, `apps/web/.storybook/vitest.setup.ts`, `apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/providers.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/app/produtos/page.tsx` (placeholder heading, replaced in Task 10), `apps/web/src/app/buscar/page.tsx` (placeholder heading, replaced in slice 2), `apps/web/src/shared/api/request.ts`, `apps/web/src/shared/api/request.test.ts`, `apps/web/src/lib/notify.tsx`, `apps/web/src/components/AppHeader.tsx`, `apps/web/src/components/AppHeader.stories.tsx`

**Interfaces:**
- Produces: `request<T>(path, init)` and `ApiError` from `@/shared/api/request`; `notify.success/error`; `<AppHeader />` with links "Produtos" → `/produtos` and "Buscar" → `/buscar`.

- [ ] **Step 1: Create the app folder; read the Next docs before writing any Next file**

```bash
mkdir -p apps/web
```

After Step 2's install, run `ls apps/web/node_modules/next/dist/docs/` and read the App Router guides on pages, layouts and `"use client"`. This Next version differs from training data; the docs shipped in the package are the reference.

- [ ] **Step 2: Write `apps/web/package.json` and install**

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --project=unit",
    "test:stories": "vitest run --project=storybook",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  },
  "dependencies": {
    "@hookform/resolvers": "^5.5.7",
    "@mantine/core": "9.6.0",
    "@mantine/hooks": "9.6.0",
    "@mantine/notifications": "9.6.0",
    "@tabler/icons-react": "^3.45.0",
    "@tanstack/react-query": "^5.101.4",
    "next": "16.2.12",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "react-hook-form": "^7.83.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@storybook/addon-docs": "^10.5.10",
    "@storybook/addon-vitest": "^10.5.10",
    "@storybook/nextjs-vite": "^10.5.10",
    "@tailwindcss/postcss": "^4.3.3",
    "@testing-library/dom": "^10.4.1",
    "@testing-library/jest-dom": "^7.0.0",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^24.13.3",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@vitest/browser": "^4.1.10",
    "@vitest/browser-playwright": "^4.1.10",
    "eslint": "^9.39.5",
    "eslint-config-next": "16.2.12",
    "jsdom": "^29.1.1",
    "playwright": "^1.62.1",
    "postcss-preset-mantine": "^1.18.0",
    "postcss-simple-vars": "^7.0.1",
    "storybook": "^10.5.10",
    "tailwindcss": "^4.3.3",
    "typescript": "^5.9.3",
    "vite": "^6",
    "vitest": "^4.1.10"
  }
}
```

```bash
cd /home/dev/code/leonardosarmentocastro/poc-ecolheita && pnpm install && pnpm e2e:install
```

- [ ] **Step 3: Write the web configs**

`tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.setup.ts`, `.storybook/main.ts`, `.storybook/vitest.setup.ts`: copy verbatim from `treasury-2/apps/web/` (none carries treasury content).

`vitest.config.ts`: copy from treasury-2 and replace the `optimizeDeps.include` list with:

```ts
          include: [
            "storybook/test",
            "@mantine/core",
            "@mantine/hooks",
            "@mantine/notifications",
            "@tabler/icons-react",
            "zod",
            "react-hook-form",
            "@hookform/resolvers/zod",
            "@tanstack/react-query",
          ],
```

`.storybook/preview.tsx` (no `next-themes`, no dates):

```tsx
import type { Preview } from "@storybook/nextjs-vite";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
  },
  decorators: [
    (Story) => (
      <MantineProvider theme={{ respectReducedMotion: true }}>
        <Notifications position="bottom-center" />
        <Story />
      </MantineProvider>
    ),
  ],
};

export default preview;
```

`src/app/globals.css`:

```css
@import "tailwindcss";

html,
body {
  height: 100%;
}
```

- [ ] **Step 4: Write layout, providers, root page and placeholders**

`src/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from "next";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "./globals.css";
import { Providers } from "./providers";
import { AppHeader } from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "Ecolheita",
  description: "Ofertas com desconto, comparadas entre lojas",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  userScalable: true,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full antialiased" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <MantineProvider theme={{ respectReducedMotion: true }}>
          <Notifications position="bottom-center" />
          <Providers>
            <AppHeader />
            {children}
          </Providers>
        </MantineProvider>
      </body>
    </html>
  );
}
```

`src/app/providers.tsx`: copy verbatim from treasury-2.

`src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/produtos");
}
```

`src/app/produtos/page.tsx` and `src/app/buscar/page.tsx`, placeholders until their tasks:

```tsx
export default function ProdutosPage() {
  return (
    <main className="container mx-auto max-w-3xl p-4 sm:p-8">
      <h1 className="text-2xl font-bold">Produtos</h1>
    </main>
  );
}
```

(`buscar/page.tsx` identical with `BuscarPage` and "Buscar".)

`src/lib/notify.tsx`:

```tsx
import { notifications } from "@mantine/notifications";

/** One entry point for notifications. */
export const notify = {
  success: (message: string) => notifications.show({ message, color: "teal" }),
  error: (message: string) => notifications.show({ message, color: "red" }),
};
```

- [ ] **Step 5: Write the failing `request` unit test**

`src/shared/api/request.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, request } from "@/shared/api/request";

describe("request", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns parsed JSON on 2xx", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    await expect(request<{ ok: boolean }>("/x")).resolves.toEqual({ ok: true });
  });

  it("returns undefined on 204", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    await expect(request<void>("/x")).resolves.toBeUndefined();
  });

  it("throws ApiError with status and issues on a 400", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "validation_error", issues: [{ path: ["name"], message: "x" }] }), {
        status: 400,
      }),
    );
    const err = await request("/x").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.message).toBe("validation_error");
    expect(err.issues).toHaveLength(1);
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

```bash
cd apps/web && pnpm test
```

Expected: FAIL, module not found.

- [ ] **Step 7: Write `src/shared/api/request.ts`**

Copy verbatim from `treasury-2/apps/web/src/shared/api/request.ts` (it has no treasury content).

- [ ] **Step 8: Run the unit test to verify it passes**

```bash
cd apps/web && pnpm test
```

Expected: PASS.

- [ ] **Step 9: Write the failing `AppHeader` story**

`src/components/AppHeader.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { AppHeader } from "@/components/AppHeader";

const meta = {
  component: AppHeader,
  tags: ["autodocs"],
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On the products page: both links reachable by name, the current one marked. */
export const OnProductsPage: Story = {
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/produtos" } } },
  play: async ({ canvasElement }) => {
    const nav = within(canvasElement).getByRole("navigation", { name: "Principal" });
    const produtos = within(nav).getByRole("link", { name: "Produtos" });
    const buscar = within(nav).getByRole("link", { name: "Buscar" });
    await expect(produtos).toHaveAttribute("aria-current", "page");
    await expect(buscar).not.toHaveAttribute("aria-current");
    for (const link of [produtos, buscar]) {
      await expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  },
};

/** On the search page the mark moves. */
export const OnSearchPage: Story = {
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/buscar" } } },
  play: async ({ canvasElement }) => {
    const nav = within(canvasElement).getByRole("navigation", { name: "Principal" });
    await expect(within(nav).getByRole("link", { name: "Buscar" })).toHaveAttribute("aria-current", "page");
  },
};
```

- [ ] **Step 10: Run the stories to verify they fail**

```bash
cd apps/web && pnpm test:stories
```

Expected: FAIL, `AppHeader` not found.

- [ ] **Step 11: Write `src/components/AppHeader.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Anchor, Text } from "@mantine/core";

const LINKS = [
  { href: "/produtos", label: "Produtos" },
  { href: "/buscar", label: "Buscar" },
];

export function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="flex items-center gap-6 border-b border-[var(--mantine-color-gray-3)] px-4 py-2">
      <Text fw={600}>Ecolheita</Text>
      <nav aria-label="Principal" className="flex items-center gap-2">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Anchor
              key={link.href}
              component={Link}
              href={link.href}
              aria-current={active ? "page" : undefined}
              // The current page is told by weight as well as by aria-current — never by colour alone.
              fw={active ? 600 : 400}
              className="flex min-h-[44px] items-center px-2"
            >
              {link.label}
            </Anchor>
          );
        })}
      </nav>
    </header>
  );
}
```

- [ ] **Step 12: Run the stories, typecheck, lint, build**

```bash
cd apps/web && pnpm test:stories && pnpm typecheck && pnpm lint && pnpm build
```

Expected: green. If `parameters.nextjs.navigation.pathname` is not honoured by this Storybook version, read `node_modules/@storybook/nextjs-vite/README.md` for the current key and use that.

- [ ] **Step 13: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): next app skeleton, header, request helper"
```

---

### Task 7: Products web module: types, API client, money utilities, form schema, hooks

**Files:**
- Create: `apps/web/src/modules/products/types.ts`, `apps/web/src/modules/products/api.ts`, `apps/web/src/modules/products/api.test.ts`, `apps/web/src/modules/products/utils/format-brl.ts`, `apps/web/src/modules/products/utils/format-brl.test.ts`, `apps/web/src/modules/products/utils/parse-reais-to-cents.ts`, `apps/web/src/modules/products/utils/parse-reais-to-cents.test.ts`, `apps/web/src/modules/products/utils/to-create-product-input.ts`, `apps/web/src/modules/products/utils/to-create-product-input.test.ts`, `apps/web/src/modules/products/schema.ts`, `apps/web/src/modules/products/schema.test.ts`, `apps/web/src/modules/products/hooks/use-products.ts`, `apps/web/src/modules/products/hooks/use-product-mutations.ts`

**Interfaces:**
- Produces: `Product` (`id: number; shopName; name; price; quantity; discountPercentage; finalPrice; createdAt; updatedAt`), `CreateProductInput`; `productsAPI.list/get/create`; `formatBRL(cents)`; `parseReaisToCents(raw): number | null`; `productFormSchema`, `ProductFormValues` (`shopName, name, priceReais: string, quantity: string, discountPercentage: string`); `toCreateProductInput(values): CreateProductInput`; `useProducts()`, `productsKey`; `useCreateProduct()`.

- [ ] **Step 1: Write the failing unit tests**

`utils/format-brl.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatBRL } from "@/modules/products/utils/format-brl";

describe("formatBRL", () => {
  it("formats cents as reais with a comma", () => {
    expect(formatBRL(350)).toBe("R$ 3,50");
    expect(formatBRL(123456)).toBe("R$ 1.234,56");
    expect(formatBRL(0)).toBe("R$ 0,00");
  });
});
```

`utils/parse-reais-to-cents.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseReaisToCents } from "@/modules/products/utils/parse-reais-to-cents";

describe("parseReaisToCents", () => {
  it("parses Brazilian decimals", () => {
    expect(parseReaisToCents("4,99")).toBe(499);
    expect(parseReaisToCents("1.234,56")).toBe(123456);
  });
  it("parses keyboard-style decimals", () => {
    expect(parseReaisToCents("4.99")).toBe(499);
    expect(parseReaisToCents("6")).toBe(600);
  });
  it("accepts zero and rejects junk and negatives", () => {
    expect(parseReaisToCents("0")).toBe(0);
    expect(parseReaisToCents("abc")).toBeNull();
    expect(parseReaisToCents("")).toBeNull();
    expect(parseReaisToCents("-1")).toBeNull();
  });
});
```

`schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { productFormSchema } from "@/modules/products/schema";

const valid = { shopName: "VEC Hortifruti", name: "Banana prata", priceReais: "5,00", quantity: "10", discountPercentage: "30" };

describe("productFormSchema", () => {
  it("accepts a valid form", () => {
    expect(productFormSchema.safeParse(valid).success).toBe(true);
  });
  it.each([
    ["shopName", ""],
    ["name", "   "],
    ["priceReais", "abc"],
    ["quantity", "-1"],
    ["quantity", "1.5"],
    ["discountPercentage", "101"],
  ])("rejects %s = %j with a Portuguese message", (field, value) => {
    const result = productFormSchema.safeParse({ ...valid, [field]: value });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path[0]).toBe(field);
    expect(result.error?.issues[0].message).toMatch(/Obrigatório|Valor inválido|Inteiro|0 a 100/);
  });
});
```

`utils/to-create-product-input.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { toCreateProductInput } from "@/modules/products/utils/to-create-product-input";

describe("toCreateProductInput", () => {
  it("turns form strings into the API's integers, reais into cents", () => {
    expect(
      toCreateProductInput({ shopName: " VEC ", name: " Banana prata ", priceReais: "5,00", quantity: "10", discountPercentage: "30" }),
    ).toEqual({ shopName: "VEC", name: "Banana prata", price: 500, quantity: 10, discountPercentage: 30 });
  });
});
```

`api.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { productsAPI } from "@/modules/products/api";

describe("productsAPI", () => {
  afterEach(() => vi.restoreAllMocks());

  it("posts the input as JSON to /products", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 201 }));
    await productsAPI.create({ shopName: "a", name: "b", price: 1, quantity: 1, discountPercentage: 0 });
    const [url, init] = spy.mock.calls[0];
    expect(String(url)).toMatch(/\/products$/);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toMatchObject({ price: 1 });
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

```bash
cd apps/web && pnpm test
```

Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`types.ts`:

```ts
export interface Product {
  id: number;
  shopName: string;
  name: string;
  /** Integer cents. */
  price: number;
  quantity: number;
  discountPercentage: number;
  /** Integer cents, computed by the API. */
  finalPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  shopName: string;
  name: string;
  price: number;
  quantity: number;
  discountPercentage: number;
}
```

`api.ts`:

```ts
import { request } from "@/shared/api/request";
import type { CreateProductInput, Product } from "@/modules/products/types";

export const productsAPI = {
  list: () => request<Product[]>("/products"),
  get: (id: number) => request<Product>(`/products/${id}`),
  create: (input: CreateProductInput) =>
    request<Product>("/products", { method: "POST", body: JSON.stringify(input) }),
};
```

`utils/format-brl.ts`:

```ts
// `toLocaleString` separates "R$" from the amount with a NON-BREAKING space (U+00A0).
// The replace turns it into a plain space so "R$ 3,50" in a test matches byte for byte.
// Write the escape ` ` literally; do not paste a visible space into the pattern.
export const formatBRL = (cents: number): string =>
  (cents / 100)
    .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    .replace(/ /g, " ");
```

`utils/parse-reais-to-cents.ts`:

```ts
/**
 * Parses reais typed by a person into integer cents: "4,99" and "4.99" are 499,
 * "1.234,56" is 123456. Returns null for anything that is not a non-negative amount.
 */
export const parseReaisToCents = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!/^\d[\d.,]*$/.test(trimmed)) return null;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
};
```

`schema.ts`:

```ts
import { z } from "zod";
import { parseReaisToCents } from "@/modules/products/utils/parse-reais-to-cents";

const integerString = (min: number, max?: number) =>
  z
    .string()
    .trim()
    .min(1, "Obrigatório")
    .refine((v) => /^-?\d+$/.test(v), "Inteiro")
    .refine((v) => Number(v) >= min && (max === undefined || Number(v) <= max), max === undefined ? "Valor inválido" : `De ${min} a ${max}`);

export const productFormSchema = z.object({
  shopName: z.string().trim().min(1, "Obrigatório"),
  name: z.string().trim().min(1, "Obrigatório"),
  priceReais: z.string().trim().min(1, "Obrigatório").refine((v) => parseReaisToCents(v) !== null, "Valor inválido"),
  quantity: integerString(0),
  discountPercentage: integerString(0, 100),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
```

`utils/to-create-product-input.ts`:

```ts
import type { ProductFormValues } from "@/modules/products/schema";
import type { CreateProductInput } from "@/modules/products/types";
import { parseReaisToCents } from "@/modules/products/utils/parse-reais-to-cents";

/** Validated form strings → the API's integers. Call only after `productFormSchema` passed. */
export const toCreateProductInput = (values: ProductFormValues): CreateProductInput => ({
  shopName: values.shopName.trim(),
  name: values.name.trim(),
  price: parseReaisToCents(values.priceReais) ?? 0,
  quantity: Number(values.quantity),
  discountPercentage: Number(values.discountPercentage),
});
```

`hooks/use-products.ts`:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { productsAPI } from "@/modules/products/api";

export const productsKey = ["products"] as const;

export function useProducts() {
  return useQuery({ queryKey: productsKey, queryFn: productsAPI.list });
}
```

`hooks/use-product-mutations.ts`:

```ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { productsAPI } from "@/modules/products/api";
import { productsKey } from "@/modules/products/hooks/use-products";
import type { CreateProductInput } from "@/modules/products/types";

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) => productsAPI.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKey }),
  });
}
```

- [ ] **Step 4: Run the unit tests to verify they pass**

```bash
cd apps/web && pnpm test && pnpm typecheck && pnpm lint
```

Expected: green. If the schema test's message regex misses, adjust the message strings in `schema.ts`, never the test's expectation that the message is Portuguese and on the right field.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/modules/products
git commit -m "feat(web): products module types, api client, money utils, form schema, hooks"
```

---

### Task 8: `ProductsTable` presentational component and stories

**Files:**
- Create: `apps/web/src/modules/products/components/ProductsTable.tsx`, `apps/web/src/modules/products/components/ProductsTable.stories.tsx`

**Interfaces:**
- Produces: `<ProductsTable products={Product[]} loading={boolean} error={string | null} />`. Slice 3 adds `onEdit` and `onDelete` props.

- [ ] **Step 1: Write the failing stories**

`ProductsTable.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { ProductsTable } from "@/modules/products/components/ProductsTable";
import type { Product } from "@/modules/products/types";

const at = "2026-09-22T12:00:00.000Z";
const bananaPrata: Product = {
  id: 1, shopName: "VEC Hortifruti", name: "Banana prata", price: 500, quantity: 10,
  discountPercentage: 30, finalPrice: 350, createdAt: at, updatedAt: at,
};
const fullPriceApple: Product = {
  id: 2, shopName: "Mercadinho Candelária", name: "Maçã argentina", price: 700, quantity: 3,
  discountPercentage: 0, finalPrice: 700, createdAt: at, updatedAt: at,
};

const meta = {
  component: ProductsTable,
  tags: ["autodocs"],
  args: { products: [bananaPrata, fullPriceApple], loading: false, error: null },
} satisfies Meta<typeof ProductsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One row per product; a discounted row strikes the original price and shows the badge. */
export const DiscountedAndFullPriceRows: Story = {
  play: async ({ canvasElement }) => {
    const table = within(canvasElement).getByRole("table", { name: "Produtos" });
    const rows = within(table).getAllByRole("row").slice(1); // minus the header
    await expect(rows).toHaveLength(2);

    const banana = within(rows[0]);
    await expect(banana.getByText("VEC Hortifruti")).toBeInTheDocument();
    await expect(banana.getByText("Banana prata")).toBeInTheDocument();
    const struck = banana.getByText("R$ 5,00");
    await expect(getComputedStyle(struck).textDecorationLine).toContain("line-through");
    await expect(banana.getByText("R$ 3,50")).toBeInTheDocument();
    await expect(banana.getByText("30% off")).toBeInTheDocument();
    await expect(banana.getByText("10 un.")).toBeInTheDocument();

    const apple = within(rows[1]);
    await expect(apple.queryByText("0% off")).toBeNull();
    const price = apple.getByText("R$ 7,00");
    await expect(getComputedStyle(price).textDecorationLine).not.toContain("line-through");
  },
};

/** Nothing registered yet: the table says so instead of showing an empty grid. */
export const Empty: Story = {
  args: { products: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Nenhum produto cadastrado.")).toBeInTheDocument();
  },
};

/** While the list loads, a status line says so. */
export const Loading: Story = {
  args: { products: [], loading: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent("Carregando…");
  },
};

/** When the list fails, the error is on the screen as text. */
export const Failed: Story = {
  args: { products: [], error: "Não foi possível carregar os produtos." },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("alert")).toHaveTextContent("Não foi possível carregar os produtos.");
  },
};
```

- [ ] **Step 2: Run the stories to verify they fail**

```bash
cd apps/web && pnpm test:stories
```

Expected: FAIL, component not found.

- [ ] **Step 3: Write `ProductsTable.tsx`**

```tsx
"use client";

import { Badge, Table, Text } from "@mantine/core";
import type { Product } from "@/modules/products/types";
import { formatBRL } from "@/modules/products/utils/format-brl";

export interface ProductsTableProps {
  products: Product[];
  loading: boolean;
  error: string | null;
}

/** Presentational: the container fetches and passes everything down. */
export function ProductsTable({ products, loading, error }: ProductsTableProps) {
  if (loading) {
    return (
      <Text role="status" c="dimmed">
        Carregando…
      </Text>
    );
  }
  if (error) {
    return (
      <Text role="alert" c="red.8">
        {error}
      </Text>
    );
  }
  if (products.length === 0) {
    return <Text c="dimmed">Nenhum produto cadastrado.</Text>;
  }
  return (
    <Table aria-label="Produtos" striped highlightOnHover className="tabular-nums">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Loja</Table.Th>
          <Table.Th>Produto</Table.Th>
          <Table.Th>Preço</Table.Th>
          <Table.Th>Desconto</Table.Th>
          <Table.Th>Estoque</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {products.map((p) => {
          const discounted = p.discountPercentage > 0;
          return (
            <Table.Tr key={p.id}>
              <Table.Td>{p.shopName}</Table.Td>
              <Table.Td>{p.name}</Table.Td>
              <Table.Td>
                <span className="flex flex-col">
                  {discounted && (
                    <Text component="span" size="sm" c="dimmed" td="line-through">
                      {formatBRL(p.price)}
                    </Text>
                  )}
                  <Text component="span" fw={600}>
                    {formatBRL(p.finalPrice)}
                  </Text>
                </span>
              </Table.Td>
              <Table.Td>
                {discounted ? <Badge color="green">{p.discountPercentage}% off</Badge> : <Text c="dimmed">—</Text>}
              </Table.Td>
              <Table.Td>{p.quantity} un.</Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
```

- [ ] **Step 4: Run the stories to verify they pass**

```bash
cd apps/web && pnpm test:stories && pnpm typecheck && pnpm lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/modules/products/components
git commit -m "feat(web): ProductsTable with stories"
```

---

### Task 9: `ProductForm` drawer and stories

**Files:**
- Create: `apps/web/src/modules/products/components/ProductForm.tsx`, `apps/web/src/modules/products/components/ProductForm.stories.tsx`

**Interfaces:**
- Produces: `<ProductForm opened onClose onSubmit={(input: CreateProductInput) => Promise<void>} pending={boolean} error={string | null} />`. Slice 3 adds `initialValues` for edit mode.

- [ ] **Step 1: Write the failing stories**

`ProductForm.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, screen, userEvent, within } from "storybook/test";
import { ProductForm } from "@/modules/products/components/ProductForm";

const meta = {
  component: ProductForm,
  // A drawer portals a full-viewport overlay; inline docs would stack one per story.
  parameters: { docs: { story: { inline: false, iframeHeight: "640px" } } },
  tags: ["autodocs"],
  args: { opened: true, onClose: fn(), onSubmit: fn(async () => {}), pending: false, error: null },
} satisfies Meta<typeof ProductForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const drawer = async () => within(await screen.findByRole("dialog", { name: "Novo produto" }));

/** Filling every field and saving submits the API's integers, reais turned into cents. */
export const SubmitsCentsAndIntegers: Story = {
  play: async ({ args }) => {
    const d = await drawer();
    await userEvent.type(d.getByLabelText("Loja"), "VEC Hortifruti");
    await userEvent.type(d.getByLabelText("Nome do produto"), "Banana prata");
    await userEvent.type(d.getByLabelText("Preço (R$)"), "5,00");
    await userEvent.clear(d.getByLabelText("Quantidade em estoque"));
    await userEvent.type(d.getByLabelText("Quantidade em estoque"), "10");
    await userEvent.clear(d.getByLabelText("Desconto (%)"));
    await userEvent.type(d.getByLabelText("Desconto (%)"), "30");
    await userEvent.click(d.getByRole("button", { name: "Salvar" }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      shopName: "VEC Hortifruti", name: "Banana prata", price: 500, quantity: 10, discountPercentage: 30,
    });
  },
};

/** Saving with empty required fields shows a message per field and submits nothing. */
export const RejectsEmptyRequiredFields: Story = {
  play: async ({ args }) => {
    const d = await drawer();
    await userEvent.click(d.getByRole("button", { name: "Salvar" }));
    await expect(await d.findAllByText("Obrigatório")).toHaveLength(3);
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

/** While the request is in flight the save button is disabled. */
export const Pending: Story = {
  args: { pending: true },
  play: async () => {
    const d = await drawer();
    await expect(d.getByRole("button", { name: "Salvando…" })).toBeDisabled();
  },
};

/** A failed request is on the screen as text. */
export const Failed: Story = {
  args: { error: "Não foi possível salvar o produto." },
  play: async () => {
    const d = await drawer();
    await expect(d.getByRole("alert")).toHaveTextContent("Não foi possível salvar o produto.");
  },
};

/** Escape closes the drawer. */
export const EscapeCloses: Story = {
  play: async ({ args }) => {
    await drawer();
    await userEvent.keyboard("{Escape}");
    await expect(args.onClose).toHaveBeenCalled();
  },
};
```

- [ ] **Step 2: Run the stories to verify they fail**

```bash
cd apps/web && pnpm test:stories
```

Expected: FAIL, component not found.

- [ ] **Step 3: Write `ProductForm.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Drawer, Text, TextInput } from "@mantine/core";
import { productFormSchema, type ProductFormValues } from "@/modules/products/schema";
import type { CreateProductInput } from "@/modules/products/types";
import { toCreateProductInput } from "@/modules/products/utils/to-create-product-input";

export interface ProductFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (input: CreateProductInput) => Promise<void>;
  pending: boolean;
  error: string | null;
}

const EMPTY: ProductFormValues = { shopName: "", name: "", priceReais: "", quantity: "0", discountPercentage: "0" };

/** Presentational: validates the form and hands the API's integers to `onSubmit`. */
export function ProductForm({ opened, onClose, onSubmit, pending, error }: ProductFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({ resolver: zodResolver(productFormSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (opened) reset(EMPTY);
  }, [opened, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit(toCreateProductInput(values));
  });

  return (
    <Drawer opened={opened} onClose={onClose} title="Novo produto" position="right" size="md">
      <form onSubmit={submit} noValidate className="grid gap-4">
        <TextInput label="Loja" error={errors.shopName?.message} {...register("shopName")} />
        <TextInput label="Nome do produto" error={errors.name?.message} {...register("name")} />
        <TextInput label="Preço (R$)" inputMode="decimal" placeholder="4,99" error={errors.priceReais?.message} {...register("priceReais")} />
        <TextInput label="Quantidade em estoque" inputMode="numeric" error={errors.quantity?.message} {...register("quantity")} />
        <TextInput label="Desconto (%)" inputMode="numeric" error={errors.discountPercentage?.message} {...register("discountPercentage")} />
        {error && (
          <Text role="alert" c="red.8" size="sm">
            {error}
          </Text>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="default" size="md" h={44} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" size="md" h={44} disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
```

- [ ] **Step 4: Run the stories to verify they pass**

```bash
cd apps/web && pnpm test:stories && pnpm typecheck && pnpm lint
```

Expected: PASS. If Mantine's `Drawer` does not expose the title as the dialog's accessible name in this version, add `aria-labelledby` wiring per `node_modules/@mantine/core` docs; the story's `findByRole("dialog", { name: "Novo produto" })` is the contract.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/modules/products/components
git commit -m "feat(web): ProductForm drawer with stories"
```

---

### Task 10: Products page container, e2e harness and the first e2e test

**Files:**
- Create: `apps/web/src/modules/products/components/ProductsPageContainer.tsx`, `e2e/playwright.config.ts`, `e2e/global-setup.ts`, `e2e/fixtures/db.ts`, `e2e/fixtures/test.ts`, `e2e/fixtures/seed.ts`, `e2e/modules/products/register-product.test.ts`
- Modify: `apps/web/src/app/produtos/page.tsx`

**Interfaces:**
- Consumes: `useProducts`, `useCreateProduct`, `ProductsTable`, `ProductForm`, `notify`.
- Produces: `e2e` fixtures `test`, `expect`, `truncateAll()`, `seedProduct(request, input)`.

- [ ] **Step 1: Write the e2e harness**

`e2e/playwright.config.ts`: copy from treasury-2 and change nothing but the comment about dev ports (API 3333, web 3000 stay the same). Both `webServer` entries stay as they are.

`e2e/global-setup.ts`: copy verbatim.

`e2e/fixtures/db.ts`: copy from treasury-2 with these replacements: default URL `postgres://ecolheita:ecolheita@localhost:5432/ecolheita_e2e`; admin pathname `/ecolheita`; `truncateAll` runs `TRUNCATE TABLE products RESTART IDENTITY CASCADE`.

`e2e/fixtures/test.ts`: copy verbatim.

`e2e/fixtures/seed.ts`:

```ts
import type { APIRequestContext } from "@playwright/test";

const API = process.env.E2E_API_URL ?? "http://localhost:4333";

export interface SeedProductInput {
  shopName: string;
  name: string;
  price: number;
  quantity: number;
  discountPercentage: number;
}

export async function seedProduct(
  request: APIRequestContext,
  input: SeedProductInput,
): Promise<{ id: number }> {
  const res = await request.post(`${API}/products`, { data: input });
  if (!res.ok()) throw new Error(`seedProduct failed: ${res.status()}`);
  return res.json();
}
```

- [ ] **Step 2: Write the failing e2e test**

`e2e/modules/products/register-product.test.ts`:

```ts
import { test, expect } from "../../fixtures/test";

test("registering a product shows it in the table with its final price", async ({ page }) => {
  await page.goto("/produtos");
  await expect(page.getByRole("heading", { name: "Produtos" })).toBeVisible();
  await expect(page.getByText("Nenhum produto cadastrado.")).toBeVisible();

  await page.getByRole("button", { name: "Novo produto" }).click();
  const drawer = page.getByRole("dialog", { name: "Novo produto" });
  await drawer.getByLabel("Loja").fill("VEC Hortifruti");
  await drawer.getByLabel("Nome do produto").fill("Banana prata");
  await drawer.getByLabel("Preço (R$)").fill("5,00");
  await drawer.getByLabel("Quantidade em estoque").fill("10");
  await drawer.getByLabel("Desconto (%)").fill("30");
  await drawer.getByRole("button", { name: "Salvar" }).click();

  await expect(drawer).toBeHidden();
  const row = page.getByRole("row", { name: /Banana prata/ });
  await expect(row).toContainText("VEC Hortifruti");
  await expect(row).toContainText("R$ 3,50");
  await expect(row).toContainText("30% off");
  await expect(row).toContainText("10 un.");
});
```

- [ ] **Step 3: Run it to verify it fails**

```bash
pnpm e2e
```

Expected: FAIL at the "Novo produto" button (the placeholder page has no button).

- [ ] **Step 4: Write the container and wire the page**

`ProductsPageContainer.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@mantine/core";
import { notify } from "@/lib/notify";
import { ProductForm } from "@/modules/products/components/ProductForm";
import { ProductsTable } from "@/modules/products/components/ProductsTable";
import { useCreateProduct } from "@/modules/products/hooks/use-product-mutations";
import { useProducts } from "@/modules/products/hooks/use-products";
import type { CreateProductInput } from "@/modules/products/types";

/** Container: fetches and mutates; renders the presentational pieces. No story. */
export function ProductsPageContainer() {
  const { data, isLoading, error } = useProducts();
  const create = useCreateProduct();
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const open = () => {
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async (input: CreateProductInput) => {
    setFormError(null);
    try {
      await create.mutateAsync(input);
      notify.success("Produto cadastrado");
      setFormOpen(false);
    } catch {
      setFormError("Não foi possível salvar o produto.");
    }
  };

  return (
    <main className="container mx-auto max-w-4xl p-4 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <Button size="md" h={44} onClick={open}>
          Novo produto
        </Button>
      </div>
      <ProductsTable
        products={data ?? []}
        loading={isLoading}
        error={error ? "Não foi possível carregar os produtos." : null}
      />
      <ProductForm
        opened={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={submit}
        pending={create.isPending}
        error={formError}
      />
    </main>
  );
}
```

`src/app/produtos/page.tsx`:

```tsx
import { ProductsPageContainer } from "@/modules/products/components/ProductsPageContainer";

export default function ProdutosPage() {
  return <ProductsPageContainer />;
}
```

- [ ] **Step 5: Run the e2e test to verify it passes**

```bash
pnpm e2e
```

Expected: PASS. Then the full gates: `pnpm test && pnpm test:stories && pnpm e2e`, plus `pnpm typecheck && pnpm lint && pnpm prettier --check . && pnpm build`.

- [ ] **Step 6: Commit**

```bash
git add apps/web e2e
git commit -m "feat(web): products page registers and lists; e2e harness"
```

---

### Task 11: CI workflow, CI scripts, docs wipe workflow

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/wipe-superpowers-docs.yml`, `scripts/ci/static.sh`, `scripts/ci/api.sh`, `scripts/ci/web.sh`, `scripts/ci/stories.sh`, `scripts/ci/e2e.sh`

Configuration, validated by a human watching the first PR's run; no test.

- [ ] **Step 1: Write the CI scripts**

Copy the five scripts from `treasury-2/scripts/ci/` and edit: `api.sh` comment names `ecolheita` / `ecolheita_test`; `web.sh` runs only `pnpm --filter web test` (no calendar, no `test:scripts`); the others are verbatim. `chmod +x scripts/ci/*.sh`.

- [ ] **Step 2: Write `.github/workflows/ci.yml`**

Copy from treasury-2 and replace: every `image: postgres:16` with `image: pgvector/pgvector:pg16`; every `treasury` credential, database and URL with `ecolheita`; the "Create treasury_test" step becomes `psql postgres://ecolheita:ecolheita@localhost:5432/ecolheita -c 'CREATE DATABASE ecolheita_test'` named "Create ecolheita_test"; drop the design-spec comment line. Keep the five jobs and `gate` exactly.

- [ ] **Step 3: Write `.github/workflows/wipe-superpowers-docs.yml`**

Copy from treasury-2 and change the run line to `scripts/hitl/wipe-superpowers-docs.sh --push` (this repository's hitl install put the script there).

- [ ] **Step 4: Run every CI script locally, one at a time, and watch them pass**

```bash
scripts/ci/static.sh
scripts/ci/api.sh
scripts/ci/web.sh
scripts/ci/stories.sh
scripts/ci/e2e.sh
```

Expected: each exits 0.

- [ ] **Step 5: Commit and push**

```bash
git add .github scripts/ci
git commit -m "ci: five suite jobs and gate; docs wipe on main"
git push -u origin feat/product-vector-search-slice-1
```

The PR is opened by `/implement-stack` against `feat/product-vector-search` with `Plan: docs/superpowers/plans/2026-09-22-product-vector-search-slice-1-register-and-list.md` in its body.
