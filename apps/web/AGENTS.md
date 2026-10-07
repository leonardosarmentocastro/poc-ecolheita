<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Ecolheita Web — conventions

Follow root `AGENTS.md` (feature branches + TDD) for all work in this app.

## Layout

```
src/
  app/                 # Next.js App Router pages
  modules/<feature>/   # DDD feature module (snake_case folder)
    api.ts              # domain HTTP client (e.g. productsAPI)
    components/         # PascalCase.tsx + PascalCase.stories.tsx, one component per file
    dom/                # kebab-case.ts, the element ids and data attributes the markup needs
    hooks/              # kebab-case.ts, one primary export per file
    utils/              # kebab-case.ts, one primary export per file
    schema.ts           # Zod form schema
    types.ts            # web types (multiple related types allowed here)
  shared/api/           # cross-cutting HTTP helper (request)
  lib/                  # cn() and other small shared utils
```

## Testing

Three tiers, in order of preference: **unit > story + `play()` > e2e**. See root
`AGENTS.md` → "Test tiers" for the binding rules.

- **Unit** — pure logic (`utils/`, `schema.ts`, `api.ts`, `hooks/`), no
  `render()`. Vitest, jsdom/node. `pnpm test`.
- **Story** — component rendering and interaction, in real Chromium.
  Co-located `Component.stories.tsx`. `pnpm test:stories`.
- **E2E** — user-visible bug regressions (reproduces-then-proves-fixed), critical
  happy paths of new features, multi-page navigation and application-integration
  flows. `pnpm e2e`. What a story already proves about a component in isolation
  does not earn a second e2e; nothing above is waived.
- **TDD is mandatory** for behavior changes. For a component, the failing test is
  a story `play()`; for pure logic it is a Vitest test. Red → green → refactor.
- **Story convention:** CSF 3 with `satisfies Meta<typeof Component>` and
  `tags: ["autodocs"]`; state expressed through `args`, never forked JSX; stories
  named for the business state, not the prop value; a story carrying an
  acceptance criterion proves it in `play()`, a purely visual variant asserts
  nothing; every story must mount clean in Chromium.
- **Never fetch application data in a story.** Split the fetching container from
  the presentational component instead.
- Run Storybook with `pnpm storybook` (port 6006).

## UI library

New components use Mantine. Notifications go through `src/lib/notify.tsx`.

### Styling rule

1. **Mantine owns behaviour and its own API** — `Drawer`, `SegmentedControl`, `Switch`,
   `Alert`, `Button`, `VisuallyHidden`, `Text`/`Title` — and their props for what they
   define (`size`, `variant`, `color`, `c`, `fw`, `radius`). Never re-implement a Mantine
   component with divs.
2. **Tailwind owns layout and spacing** through `className`: grid, flex, gap, padding,
   `tabular-nums`, responsive prefixes — on Mantine components and plain elements alike.
   `Stack`/`Group` are not used for layout in new code.
3. **Colours come from Mantine's palette only:** Mantine props on Mantine components,
   `var(--mantine-color-*)` inside Tailwind arbitrary values elsewhere. No shadcn tokens
   (`text-muted-foreground`, `bg-card`, …) in new code.
4. **No `style={{}}` / `styles={{}}` objects.** One exception: a Mantine slot with no
   `classNames` key, with a one-line comment naming the slot (`WizardShell`'s modal
   `inner` is the precedent).
5. **An unlayered Mantine reset outranks a Tailwind utility.** Mantine ships its component
   CSS unlayered; Tailwind v4 emits utilities inside `@layer utilities`, and an unlayered
   rule wins whatever the specificity. `UnstyledButton` resets `border`, `padding` and
   `background-color`, and `Button` sets its own padding — so a border, padding or
   background put on a reset component is declared where it wins the cascade (Tailwind's
   `!` prefix), never merely written as a class. `border: 0` resets the style as well as
   the width, so `!border` needs `!border-solid` beside it.
6. **A story proving a rendered style asserts the computed value**, never the class list:
   `getComputedStyle`, `getBoundingClientRect`, `scrollWidth`/`clientWidth`. The class is
   there in the broken render too, so `toHaveClass` proves nothing about what anyone sees.

### Sharing behaviour: compose by default

When two screens need the same behaviour, split it into pieces that each own one concern,
and let each screen compose the pieces it uses. Shared pieces are the ones that know nothing
about either screen — history mechanics, a parameter with a vocabulary, a breakdown tree — and
each is proven by its own tests. A screen's own hook or component is thin and has no branch
that is not that screen's. A flag that selects which screen's logic runs is the exception, not
the default: it needs a sentence in the plan saying why the split would be worse here. The
precedent is the folha and book URL hooks (`useFolhaUrlState`, `useBookUrlState`) over one
history primitive (`modules/expenses/hooks/use-overlay-history.ts`).

### Naming what only the browser needs: `dom/`

An element id used as a focus or ARIA target, and a data attribute one component sets for
another to query, are strings that exist only because a browser is rendering the page. Each is
published by one file under `modules/<feature>/dom/` and imported everywhere it is read — never
retyped. The file is `kebab-case.ts` named after the constant it exports
(`dom/expense-book-title-dom-id.ts` exports `EXPENSE_BOOK_TITLE_DOM_ID`), one primary export per
file as everywhere else, so an import line says what it gives you before you open it.

The folder names a layer — what only the DOM needs — not a shape, which is what makes it
decidable: an element id, an attribute name, a selector built from one. Application vocabulary
does not move there because it happens to be a string.

A module owns the strings for the markup it renders, and a file that queries another module's
markup imports that module's constant rather than retyping the attribute
(`app/expense_books/[id]/page.tsx` queries both lists' rows this way). The rule exists because
these strings couple files invisibly: four files agreed on `data-folha-row` and `data-book-row`
with nothing naming either, so renaming an attribute in a row component would have broken focus
return in three other files with no type error and no failing test.

## Data & forms

- Money display uses `modules/products/utils/format-brl.ts`; API amounts are **cents**; the form parses reais typed by a person into cents in `modules/products/utils/parse-reais-to-cents.ts`.
- Forms use `react-hook-form` + Zod (`modules/products/schema.ts`). Keep web
  types in `modules/products/types.ts` aligned with the API contract (no shared
  package yet).
