# EduViz — Implementation Plan

## 0. Repository state

Empty repository, freshly initialized (`git init`) at
`~/Desktop/visual-study-assistant`. No code exists yet. This document is the
first artifact in the repo.

## 1. Product understanding

A private, single-user study tool that turns text explanations or
screenshots of educational material into **structured, interactive visual
lessons** — not prose, not AI-generated illustrations of uncertain accuracy.
The core bet: for STEM material, an interactive deterministic diagram
(sphere with a draggable observation point, field vectors that update live,
an equation panel that switches at the boundary) teaches better than another
paragraph or a static image. The AI's job is to *plan* what should be shown,
using a constrained schema and a registry of trusted, hand-built visual
components — never to emit arbitrary executable code or freeform raster
diagrams as the primary path.

Two ingestion paths (pasted text, screenshot) converge on the same
structured `VisualLesson` object, which is then editable via a scoped
chat/patch interface, persisted locally, and exportable.

## 2. Stack decision

**Chosen:** Next.js 15 (App Router) + TypeScript, deployed to **Vercel**
free tier, with the codebase kept Vercel-agnostic enough to move to
Cloudflare (via `@opennextjs/cloudflare`) later without a rewrite.

Reasoning, given "you decide, optimize for scalability beyond the listed
features":

- **Single codebase, two runtimes.** Next.js Route Handlers give us
  server-side API routes (required to keep `GEMINI_API_KEY` off the
  client) in the same project as the UI — no separate backend service to
  operate, deploy, or version alongside the frontend as the app grows.
- **Ecosystem maturity = scalability of *effort*, not just traffic.** This
  is a solo, non-technical-maintainer project. Next.js has the deepest
  supply of docs, examples, and tooling, which matters more here than raw
  throughput — the app will never have meaningful concurrent load as a
  personal tool, but it *will* keep growing in feature surface (more visual
  templates, eventually maybe accounts/cloud sync per the spec's storage
  design goal).
- **Handoff-friendly.** The spec explicitly wants the codebase easy for
  another coding agent to continue. Next.js App Router conventions are
  extremely well-represented in every model's training data, which
  minimizes the chance of a future agent (or you, later) getting stuck on
  framework idiosyncrasy.
- **Vercel now, Cloudflare later, deliberately kept open.** Vercel's free
  tier removes deployment friction today ("prioritize correct local
  development first," per the spec). We avoid Vercel-only primitives
  (no Vercel KV/Blob/Edge Config lock-in) so a later move to Cloudflare
  Pages/Workers via OpenNext — the spec's stated potential target — stays
  realistic rather than theoretical.
- **Rejected alternative:** Vite + React + a separate Cloudflare Worker
  (Hono) backend. More "correct" for a Cloudflare-first deployment, but it
  means two build pipelines and two local dev servers for a single
  maintainer to run forever, for a benefit (Workers-native edge runtime)
  this app doesn't need at personal-use scale. Not worth the standing
  complexity tax.

**Supporting choices:**

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript, strict mode | required by spec |
| Styling | Tailwind CSS + shadcn/ui (Radix primitives) | accessible-by-default headless components, no heavy design system to fight, easy dark/light theming via CSS variables |
| Schema validation | Zod | spec-named, first-class TypeScript inference, good error messages for AI-output repair |
| Local storage | IndexedDB via the `idb` package, behind a repository interface | spec requirement; `idb` is a thin, well-maintained Promise wrapper, not a heavy ORM |
| Math rendering | KaTeX (`katex` + `react-katex` or a small custom wrapper) | spec-named, fast, no MathJax runtime cost |
| AI SDK | `@google/genai` (current official Gemini JS/TS SDK) | official, actively maintained |
| Unit tests | Vitest + React Testing Library | fast, native ESM/TS, integrates cleanly with Next.js |
| E2E tests | Playwright | spec-named category, first-class multi-browser + accessibility tooling |
| Package manager | pnpm | fast, disk-efficient; swappable to npm trivially if preferred |
| Image compression (client-side) | `browser-image-compression` | small, no server round-trip needed before upload |

## 3. Directory structure

```
visual-study-assistant/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── README.md
├── ARCHITECTURE.md
├── AI_PIPELINE.md
├── VISUAL_SCHEMA.md
├── VISUAL_TEMPLATE_GUIDE.md
├── TESTING.md
├── SECURITY.md
├── ROADMAP.md
├── IMPLEMENTATION_PLAN.md
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # New lesson entry
│   │   ├── lessons/[id]/page.tsx       # Lesson workspace
│   │   ├── library/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── import-export/page.tsx
│   │   └── api/
│   │       ├── extract/route.ts        # screenshot -> ExtractedSource
│   │       ├── lesson-plan/route.ts    # text/extraction -> VisualLesson
│   │       ├── lesson-patch/route.ts   # chat message -> LessonPatch
│   │       └── verify/route.ts         # lesson -> LessonVerification
│   ├── components/
│   │   ├── layout/                     # Sidebar, ChatDrawer, TopBar
│   │   ├── lesson/                     # LessonWorkspace, SectionView, ChatPanel
│   │   ├── visuals/
│   │   │   ├── registry.ts             # templateId -> component map
│   │   │   ├── UnsupportedVisual.tsx   # safe fallback for unknown templateId
│   │   │   ├── scientific-diagram/     # RadialChargedSphere, ForceVectorDiagram, SimpleCircuitDiagram
│   │   │   ├── simulation/             # ParticleContainer
│   │   │   ├── process-flow/           # ProcessFlowDiagram
│   │   │   └── mathematical-plot/      # CoordinateGeometryDiagram, WaveDiagram
│   │   └── ui/                         # shadcn/ui primitives
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── provider.ts             # LessonAIProvider, ImageProvider interfaces
│   │   │   ├── config.ts               # central model-name/config module
│   │   │   ├── gemini/
│   │   │   │   ├── client.ts
│   │   │   │   ├── geminiProvider.ts
│   │   │   │   ├── prompts/            # extraction.ts, lessonPlan.ts, patch.ts, verify.ts
│   │   │   │   └── jsonRepair.ts
│   │   │   └── imageProvider.ts        # disabled/no-op implementation behind a flag
│   │   ├── schema/
│   │   │   ├── lesson.ts               # VisualLesson zod schema
│   │   │   ├── visualBlocks.ts         # discriminated union, per-template param schemas
│   │   │   ├── equations.ts
│   │   │   ├── patch.ts
│   │   │   └── extraction.ts
│   │   ├── storage/
│   │   │   ├── db.ts                   # IndexedDB schema + versioned migrations
│   │   │   ├── lessonRepository.ts
│   │   │   ├── revisionRepository.ts
│   │   │   ├── preferencesRepository.ts
│   │   │   └── exportImport.ts
│   │   ├── cache/requestCache.ts       # content-hash dedupe of AI calls
│   │   └── utils/
│   ├── hooks/                          # useLesson, useChat, useLessonLibrary, useTheme
│   └── styles/globals.css
├── tests/
│   ├── unit/
│   ├── e2e/
│   └── mocks/                          # canned Gemini responses
└── public/
```

## 4. Architecture

- **Client** renders the lesson workspace, library, chat, and visuals.
  Visuals are React components resolved from `visuals/registry.ts` by
  `templateId`. No AI output is ever rendered as HTML/JS — only as
  structured props consumed by pre-written components.
- **Server** (Next.js Route Handlers) owns all Gemini calls. `GEMINI_API_KEY`
  is read via `process.env` server-side only, never bundled client-side, no
  `NEXT_PUBLIC_` prefix.
- **`LessonAIProvider`** is the only interface the app depends on for
  AI operations (`extractSource`, `createLessonPlan`, `modifyLesson`,
  `verifyLesson`). `GeminiProvider` is the sole implementation initially.
  Swapping providers later means writing one new class, not touching UI or
  route code.
- **Storage** is entirely client-side (IndexedDB), behind repository
  interfaces (`LessonRepository`, `RevisionRepository`,
  `PreferencesRepository`) so a future cloud-sync backend can implement the
  same interface without UI changes.
- **Validation boundary**: every AI response is parsed through Zod before
  it touches app state. Invalid JSON triggers a bounded repair/retry
  sequence (see AI_PIPELINE.md); the user's original input is never lost on
  failure.

## 5. Lesson schema (summary — full detail in VISUAL_SCHEMA.md)

`VisualLesson` (versioned, Zod-validated): `schemaVersion`, `id`, `title`,
`subject`, `topic?`, `source`, `summary`, `prerequisites[]`,
`learningObjectives[]`, `sections: LessonSection[]`, `createdAt`,
`updatedAt`.

`LessonSection`: `id`, `heading?`, `sourceText`, `simplifiedExplanation`,
`importantTerms[]`, `equations: EquationBlock[]`, `visuals: VisualBlock[]`.

`VisualBlock` is a Zod discriminated union on `type`:
`scientific-diagram | simulation | mathematical-plot | comparison |
process-flow | timeline | scale-comparison | generated-illustration |
annotated-source-image`. Each variant carries a **typed** `parameters`
schema per supported `templateId` (no `Record<string, any>` in the
permanent model) plus shared fields: `id`, `title`, `educationalPurpose`,
`accessibilityDescription`, `controls[]`, `annotations[]`,
`sourceSectionId`, `factualChecks[]`, `generationStatus`, `error?`.

## 6. Visual template registry

AI returns `{ type, templateId, parameters }`. The frontend looks up
`templateId` in a static registry map; unknown IDs render
`UnsupportedVisual` (never arbitrary code execution). Seven initial
templates per spec section 9, built as hand-written, tested React + SVG/
Canvas components with typed parameter schemas:

1. Radial charged sphere (the flagship template — inside/surface/outside
   states, draggable observation point, Gaussian surface, field vectors,
   integral path, equation panel)
2. Force-vector diagram
3. Particle container (diffusion)
4. Process-flow diagram
5. Coordinate geometry diagram
6. Wave diagram
7. Simple circuit diagram

## 7. AI pipeline

Five separated operations, each its own prompt module and Zod output
schema: source extraction, lesson planning, visual planning (folded into
lesson planning output, validated per-block against the template registry),
follow-up modification (returns a `LessonPatch`, not a full lesson), and
optional verification. Central `lib/ai/config.ts` holds the model name so
it's changed in one place, not scattered across prompt files. Malformed
JSON triggers one repair attempt (re-prompt with the parse error) before
surfacing a recoverable error to the UI with the user's input intact.

## 8. Storage approach

IndexedDB via `idb`, one database with versioned object stores for lessons,
revisions, screenshots (as Blobs), conversation history, and preferences.
Export/import serializes a lesson (or the whole library) to a portable JSON
package (screenshots base64-inlined or referenced, TBD in Milestone 2).
Repository interfaces are storage-engine-agnostic so a future sync backend
is an additive implementation, not a rewrite.

## 9. Security & cost control

- `GEMINI_API_KEY` server-only, `.env.local` gitignored, `.env.example`
  committed empty.
- No `eval`, no `dangerouslySetInnerHTML` on AI/user content, sanitize
  anything rendered as HTML.
- Upload type/size validation, client-side compression before send.
- Per-session in-memory rate limiting on API routes (no backend DB needed
  for a single-user app) + request timeouts + abortable requests.
- Content-hash cache to dedupe identical AI requests; economical/balanced/
  high-quality mode setting controls model choice and retry aggressiveness.
- Image generation provider stays unimplemented/disabled behind a flag —
  not part of MVP.

## 10. Milestones (acceptance criteria)

1. **Foundation** — Next.js + TS + Tailwind + shadcn/ui scaffold, app shell
   layout (sidebar/workspace/chat panel), dark/light theme, Zod wired,
   env-var handling with a clear error if `GEMINI_API_KEY` is missing at
   request time (not at build time), Vitest + Playwright configured with a
   passing smoke test each. *Done when:* `pnpm dev` runs, `pnpm test`
   and `pnpm test:e2e` pass, `pnpm build` succeeds.
2. **Local library** — IndexedDB repositories, lesson CRUD against mock
   data, export/import round-trip. *Done when:* a lesson survives a full
   page refresh and an export→import cycle reproduces it byte-for-byte
   (schema-relevant fields).
3. **Text → lesson** — `/api/lesson-plan` route, `GeminiProvider`
   implementation, structured lesson generation from pasted text, error
   states for request failure/timeout/invalid JSON. *Done when:* pasting a
   sample explanation produces a saved, schema-valid lesson using a mocked
   AI response in tests, and a real Gemini call in manual dev testing.
4. **Screenshot → lesson** — uploader (drag/drop/paste/preview/validate),
   `/api/extract`, editable extraction preview. *Done when:* an uploaded
   screenshot produces an editable extraction that flows into Milestone 3's
   lesson generation.
5. **Charged-sphere visual + equations** — registry + first template +
   KaTeX rendering. *Done when:* the sphere template renders with a working
   radius slider that updates region, field arrows, equation, and
   highlighted explanation text in sync.
6. **Remaining templates** — the other six visual components.
7. **Chat & patches** — scoped chat, `LessonPatch` schema + validated
   application, undo/redo via revision history.
8. **Verification, accessibility, responsiveness, docs** — verification
   pass, a11y audit, mobile layout, full documentation set, full test
   suite green.
9. **Optional Cloudflare deployment** — evaluate OpenNext adapter; only
   pursued if Vercel proves insufficient.

## 11. Risks / open decisions

- **Exact Gemini model name** (e.g. a `flash` vs `pro` tier) — deferred to
  Milestone 3, isolated in `lib/ai/config.ts` so it's a one-line change.
- **Export package format for screenshots** — inline base64 vs. separate
  files in a zip. Leaning inline-base64-in-JSON for simplicity at MVP scale;
  revisit if exports get large.
- **shadcn/ui vs. a lighter hand-rolled component set** — shadcn/ui chosen
  for accessibility defaults; low switching cost if it feels heavy.
- **Rate limiting persistence** — in-memory per server instance is fine for
  a single local user; would need a real store if ever multi-instance.
- **Three.js/WebGL scenes** — spec lists as lowest-priority visual method;
  not scheduled until a concrete template needs 3D (none of the seven
  initial templates do).
