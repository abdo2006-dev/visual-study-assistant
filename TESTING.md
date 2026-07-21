# Testing

## Stack

- **Unit/component**: Vitest + `@testing-library/react`, jsdom environment
  (`vitest.config.ts`). `tests/unit/setup.ts` polyfills `window.matchMedia`
  (next-themes needs it), aliases `server-only` to a no-op (Node module
  resolution doesn't apply the `react-server` condition Next's bundler
  does), and registers `@testing-library/react`'s `cleanup()` in a global
  `afterEach` — this project doesn't set `test.globals: true`, so RTL's own
  auto-cleanup detection (which looks for a *global* `afterEach`) never
  fires without this; without it, `render()` calls silently accumulate
  across tests in the same file.
- **End-to-end**: Playwright (`playwright.config.ts`), against a real
  production build (`webServer` runs `next build && next start`).
- **Accessibility**: `@axe-core/playwright`, run as part of the e2e suite
  (`tests/e2e/accessibility.spec.ts`) against key pages and states.

## Running tests

```bash
npm run test        # unit tests, once
npm run test:watch  # unit tests, watch mode
npm run test:e2e    # Playwright — builds and starts the app first
```

## The no-real-API-calls rule

**No ordinary test calls Gemini.** Every test that exercises AI code mocks
`@google/genai` at the module level (`vi.mock("@google/genai", ...)`,
replacing `GoogleGenAI` with a fake whose `models.generateContent` is a
`vi.fn()`), or mocks `GeminiProvider` itself for route/service-level tests,
or intercepts the network call at the browser layer for e2e tests
(`page.route("**/api/lesson-plan", ...)` etc.). This is deliberate — the
whole point is a fast, free, deterministic suite.

One **optional** live smoke test exists, skipped unless explicitly enabled:

```bash
RUN_LIVE_GEMINI_TEST=1 npx vitest run tests/unit/gemini-live-smoke.test.ts
```

If you add a new AI operation, follow this pattern: mock the SDK for a
provider-level test, use a fake `LessonAIProvider` for a service-level
test, and mock the provider module for a route-level test. Never make a
new test's pass/fail depend on real network access.

## What's covered

- **Schema validation**: every Zod schema has at least a defaults test and
  a rejection test (`tests/unit/*-schema.test.ts`, `*-params.test.ts`).
- **Storage**: `fake-indexeddb` (imported in `tests/unit/setup.ts`) backs
  all IndexedDB-touching tests — `lessonRepository`, `revisionRepository`
  (including the "a new edit after undo discards the redo-able future"
  case), `conversationRepository`, export/import round-trips.
- **AI provider logic**: JSON-repair retry behavior, the `parametersJson`
  expansion (`toLessonPatch`, `toVisualBlockAssignment`), per-operation
  prompt construction — all with a mocked SDK.
- **Usage tracking**: `usageContext`'s per-request isolation (including
  two concurrent trackers staying separate), `generateWithRepair` recording
  real and repair-retry calls, `jsonWithUsage` attaching `apiUsage` to a
  response, and `apiUsageRepository`'s record/query/prune behavior against
  `fake-indexeddb`.
- **Route handlers**: called directly as functions (`POST(request)`), no
  real Next.js server needed — malformed JSON, missing fields, and every
  mapped error status (400/429/500/502/504) per route.
- **Patch application**: every `LessonPatch` op, plus the "references a
  nonexistent id" error case, plus applying several patches in sequence.
- **Visual templates**: pure logic modules (region detection, circuit math,
  wave sampling, BFS layout, etc.) tested independently of rendering;
  `VisualBlockRenderer` tested for the known/unknown-templateId and
  valid/invalid-parameters fallback behavior.
- **Accessibility**: automated axe scans of New Lesson, Library,
  Import/Export, Settings, a lesson workspace with the interactive sphere
  visual, and the mobile library drawer.
- **Responsive/visual**: e2e tests run at Playwright's default desktop
  viewport; the mobile drawer and a mobile-width axe scan cover the
  narrow-viewport layout. There's no automated visual-regression
  screenshot suite — mobile layout changes were checked manually
  in-browser during Milestone 8.
- **Missing environment variable**: `getGeminiApiKey()` throwing
  `MissingApiKeyError`, and each route mapping that to a 500.

## Adding a test for a new template

See VISUAL_TEMPLATE_GUIDE.md's testing section — schema test, pure-logic
test if applicable, and a `VisualBlockRenderer` render-smoke test.
