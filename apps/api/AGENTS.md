# Ecolheita API — architecture & conventions

Follow these patterns when adding or changing modules. They keep every domain
self-contained and consistent.

## Module layout

Each domain lives under `src/modules/<module>/` and owns everything it needs:

```
modules/<module>/
  resolvers/                   # one file per operation (HTTP handlers)
    <verb>-<noun>-resolver.ts
    index.ts                   # barrel re-exporting every resolver
  repository.ts                # all Drizzle queries for the module
  model.ts                     # Drizzle table/enum definitions
  schema.ts                    # Zod validation schemas + inferred input types
  types.ts                     # inferred row types (InferSelectModel, ...)
  routes.ts                    # express Router mapping paths -> resolvers
  __tests__/                   # module tests, run against the HTTP surface
    api.test.ts
```

Not every module needs every file. A trivial module (see `health/`) may only
have `resolvers/` and `routes.ts`.

## Resolver pattern (controller + service merged)

We deliberately do NOT use a controller -> service -> repository split. For a
CRUD API those layers are mostly pass-through, so we collapse them into a single
**resolver** layer that sits directly on top of the repository.

- A resolver **is** an Express handler: `(req, res, next) => Promise<void>`.
- One resolver per operation, one file per resolver.
- File name: `<verb>-<noun>-resolver.ts`; export `<verb><Noun>Resolver`.
  - Use the plural noun for collection ops (`list-products-resolver.ts` ->
    `listProductsResolver`) and the singular for item ops
    (`get-product-resolver.ts` -> `getProductResolver`).
- A resolver's job: read `req`, validate the body, call the repository, apply
  domain rules (e.g. throw `NotFoundError`), and write the response.
- Always wrap the body in `try/catch` and forward errors with `next(err)`.
  Never translate errors inline — the central error handler owns that.

```ts
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

## Data access

- All database access goes through `repository.ts` (Drizzle). Resolvers never
  import `db` or build queries directly — this keeps queries reusable and lets
  them grow into multi-step/transactional operations without bloating resolvers.
- **One exception, on purpose:** the products repository's `create` and `update` also
  normalise and embed the product name before writing (from slice 2 on). Every writer —
  resolvers, the seed script, tests — goes through them, so "a product without a vector
  never exists" has exactly one owner. Do not add a second write path.

## Validation & errors

- Validate request bodies inline as the first step of create/update resolvers:
  `const input = createProductSchema.parse(req.body)`.
- Throw domain errors from `@/db/data/errors` and let them bubble via
  `next(err)`.
- The central handler `server/middlewares/error-handler-middleware.ts` maps:
  `ZodError -> 400`, `NotFoundError -> 404`, anything else -> `500`.

## Routing

- Each module exports a `Router` from `routes.ts` (paths are relative to the
  module's mount point, e.g. `"/"` and `"/:id"`).
- Mount every module router in `src/server/routes/connect.ts` under its base
  path. That file is the single source of truth for what is mounted where.

## Testing

- **TDD is mandatory** for every behavior change (see root `AGENTS.md`).
  Write the failing test first, watch it fail, implement the minimum, watch it
  pass, then commit.
- Tests live in `modules/<module>/__tests__/` and exercise the module through
  **HTTP** (the real contract) rather than internal functions. There is no
  service-layer unit test — `api.test.ts` covers status codes and behavior.
- Repository- and schema-level tests are fine where they add value
  (`repository.test.ts`, `schema.test.ts`) and also live in `__tests__/`.
- Shared test infra (server bootstrap, DB reset/migrations) lives in `test/`
  and is imported via the `@test/*` alias, e.g. `@test/helpers`.
- Cross-cutting server code (e.g. `server/middlewares/`) is tested where it is
  owned, in its own `__tests__/`, not through an unrelated domain module. When a
  behavior needs a route to exercise it, add a **test-only** router inline in
  `server/routes/connect.ts`, mounted only when `NODE_ENV === "test"`.

## Adding a new module (checklist)

1. `model.ts`, `schema.ts`, `types.ts`
2. `repository.ts`
3. `resolvers/*` + `resolvers/index.ts`
4. `routes.ts`
5. Mount the router in `src/server/routes/connect.ts`
6. `__tests__/api.test.ts`
