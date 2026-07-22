# AI Pipeline

## Provider abstraction

Everything in the app depends on `LessonAIProvider`
(`src/lib/ai/provider.ts`), never on Gemini-specific types:

```ts
interface LessonAIProvider {
  createLessonPlan(input: CreateLessonPlanInput): Promise<VisualLesson>;
  extractSource(input: ExtractSourceInput): Promise<ExtractedSource>;
  modifyLesson(input: ModifyLessonInput): Promise<ModifyLessonResult>;
  verifyLesson(input: VerifyLessonInput): Promise<LessonVerification>;
  planVisuals(input: PlanVisualsInput): Promise<VisualPlan>;
  planBulkImport(input: PlanBulkImportInput): Promise<BulkImportPlan>;
}
```

`GeminiProvider` (`src/lib/ai/gemini/geminiProvider.ts`) is the only current
implementation. Swapping providers means writing one new class — no route,
service, or UI code depends on Gemini's response shapes.

## The six operations

| Operation | Route | Input | Output |
|---|---|---|---|
| Lesson planning | `/api/lesson-plan` | pasted text | a full `VisualLesson` (no visuals yet) |
| Visual planning | *(internal — see below)* | the just-planned lesson | per-section `VisualBlock` assignments |
| Source extraction | `/api/extract` | one or more compressed screenshots | reading-order markdown |
| Lesson modification | `/api/lesson-patch` | a chat message + condensed lesson | a reply + `LessonPatch[]` |
| Verification | `/api/verify-lesson` | a condensed lesson | an advisory `LessonVerification` |
| Bulk import outline | `/api/bulk-import-plan` | a large block of pasted text | one or more proposed lessons, each a verbatim excerpt |

Each has its own prompt module under `src/lib/ai/gemini/prompts/` and its
own Zod schema. Visual planning has no route of its own — `generateLessonPlan`
(`src/lib/ai/lessonPlanService.ts`) calls `provider.planVisuals` itself right
after `provider.createLessonPlan`, so a single `POST /api/lesson-plan` request
still returns a lesson with visuals already attached.

## Streaming progress instead of a silent wait

Lesson planning is the slowest operation (two Gemini calls back to back —
`createLessonPlan` then `planVisuals` — often 10-20s total) and the one
users most need live feedback on, so `/api/lesson-plan` streams instead
of returning one JSON blob:

- `generateLessonPlan` takes an optional `onProgress` callback
  (`GenerateLessonPlanOptions`), invoked at each phase boundary — never
  called on a cache hit, since that resolves near-instantly.
- The route wraps its work in `streamWithProgress`
  (`src/lib/ai/streamWithProgress.ts`), which turns those callbacks into
  a newline-delimited JSON response: any number of
  `{ type: "progress", message }` lines, then exactly one
  `{ type: "result", ...lesson, apiUsage }` or `{ type: "error", status, error }`
  line. The initial HTTP response is always `200` — status codes that
  used to live on the response itself (400/429/500/502/504) now travel
  inside that final `error` event, still produced by the same
  `mapAiErrorToResponse` every other route uses.
- The client reads it with `readProgressStream`
  (`src/lib/ai/readProgressStream.ts`), which also accepts a single flat
  JSON object with no `type` wrapper as the final result outright — the
  same degenerate case a `route.fulfill({ json: {...} })` test mock
  produces, so none of the existing mocked tests needed rewriting to
  NDJSON when this shipped.
- `NewLessonForm` and `BulkImportPanel` show the live message next to an
  elapsed-time counter (`useElapsedSeconds`) instead of a static
  "Generating..." spinner, so a slow call reads as *working*, not stuck.

Only `/api/lesson-plan` streams — extraction, chat, verification, and the
bulk-import outline pass are all fast enough (one Gemini call) that this
wasn't worth the added complexity there.

## Bulk import: outline-first, two-pass

`/bulk-import` splits a large paste into several lessons without
sacrificing per-lesson quality, by keeping the outline pass and the actual
lesson generation as two separate AI calls rather than one call trying to
do both:

1. **Outline pass** (`bulkImportPlanService.ts` → `planBulkImport`): reads
   the whole pasted text once and proposes a title + verbatim source
   excerpt per lesson. The prompt (`prompts/bulkImportPlan.ts`) explicitly
   forbids paraphrasing — each `sourceText` must be copied character for
   character from the original.
2. **Verification, not trust**: nothing stops a model from paraphrasing
   anyway, so the service checks each proposed excerpt is actually a
   (whitespace-normalized) substring of the original text before it ever
   reaches the UI — any that isn't gets dropped, same "never trust AI
   output as-is" principle as `toLessonPatch`/`toVisualBlockAssignment`.
3. **Review**: the user can rename or exclude any proposed lesson in the
   UI before generating.
4. **Per-lesson generation**: each included excerpt is fed to the
   existing `POST /api/lesson-plan` unchanged — the exact same
   single-lesson pipeline (including visual planning), one full-quality
   call per lesson, generated sequentially with a progress indicator
   rather than in parallel (gentler on the shared rate limiter, and
   naturally caps concurrent Gemini calls). A failure on one lesson
   doesn't stop the rest of the batch.

Each batch's progress (per-lesson title/status/lessonId/error) is
write-through persisted to IndexedDB via `bulkImportBatchRepository.ts` as
it happens, not just held in React state — a refresh mid-batch loses the
in-flight requests (there's no server-side job queue to resume from), but
not visibility into what already finished. On mount, `BulkImportPanel`
calls `markStaleBatchesInterrupted()`, which relabels any lesson still
`"pending"`/`"generating"` from a previous session as `"interrupted"`
(the tab closed before it got an answer either way) before showing a
"Recent imports" list of past batches.

## Central model configuration

`src/lib/ai/config.ts` maps three `EconomyMode`s (`economical` /
`balanced` / `highest-quality`) to Google's rolling `-latest` model aliases
(`gemini-flash-lite-latest`, etc.) rather than a dated model name — this is
the one place to change if Google retires an alias. Every route defaults to
`economical` unless the caller specifies otherwise (no UI for changing this
yet — see ROADMAP.md).

## Structured output, JSON repair, and the parametersJson trick

Every Gemini call sets `responseMimeType: "application/json"` plus a
`responseSchema` (Google's typed JSON-schema subset). The shared helper
`generateWithRepair` (`src/lib/ai/gemini/generateWithRepair.ts`):

1. Sends the prompt, parses the response, validates it against our Zod
   schema.
2. On failure, sends **one** follow-up turn containing the validation
   error and asks for corrected JSON.
3. On a second failure, throws `AiGenerationError` (never a raw parse
   error) with the user's original input still intact on the client.

Gemini's `responseSchema` needs every field's shape known in advance,
which a visual template's `parameters` object isn't (it depends on which
of the ten templates got picked). The lesson-patch and visual-planning
paths both work around this by having Gemini return `parametersJson:
string` — a JSON-encoded string, a shape Gemini can always describe —
which is then `JSON.parse`d and validated against that specific
template's own Zod schema (`toLessonPatch.ts` for chat patches,
`toVisualBlockAssignment.ts` for planning) before it touches anything. A
patch or assignment that fails this second validation is dropped, not
applied — one bad item in a batch doesn't fail the whole operation.

Both prompts describe every template's matching physical/mathematical
setup and exact parameter shape from one shared constant,
`TEMPLATE_DESCRIPTIONS` (`src/lib/ai/gemini/prompts/templateDescriptions.ts`)
— originally only the visual-planning prompt had this level of detail,
which meant a chat-requested `add-visual` was guessing at parameter
shapes blind. Adding a template means updating this one file, not two.

## Chat replies aren't proof the patches applied

`modifyLesson`'s `reply` text is written by the model in the same turn as
its `patches` array, before anything is validated or applied — so a reply
can describe a change that never actually lands (wrong section id,
invalid parameters). Two things keep this honest:

- The prompt itself is told never to describe a change that isn't backed
  by an actual patch in the same response.
- More importantly, `applyLessonPatches`
  (`src/lib/lessonPatch/applyLessonPatch.ts`) applies each patch
  independently rather than all-or-nothing — a `reduce` that threw on the
  first failure used to discard every other patch in the batch too, so
  one stale section id could silently zero out an entire response's worth
  of changes while the reply still claimed success. Now whatever succeeds
  is saved, and `LessonChatPanel` surfaces exactly which patches failed
  and why, rather than trusting the model's narration.

## Keeping requests small

Full `VisualLesson` objects carry a lot the AI doesn't need for chat,
verification, or visual planning (annotations, factual-check placeholders,
raw visual parameters). `src/lib/lessonPatch/condenseLesson.ts`,
`condenseLessonForVerification.ts`, and `condenseLessonForVisualPlanning.ts`
produce trimmed views — ids, headings, explanations, and equations, plus
each existing visual's *descriptive* fields for the chat/verification
cases — so those operations send less than the full document.

## Rate limiting and caching

- `src/lib/ai/rateLimit.ts`: a fixed-window limiter (10 requests/minute),
  shared across all five routes, in a single process-lifetime variable.
  This is not multi-tenant infrastructure — it exists to catch a runaway
  client loop, not to defend against abuse at scale (see the Vercel caveat
  in ROADMAP.md). Bulk import's per-lesson generation calls go through
  this same limiter one at a time (see above), so a large batch is
  naturally paced rather than bursting past it.
- `src/lib/cache/requestCache.ts`: a content-hash, in-memory,
  process-lifetime cache. Lesson planning, extraction, verification, and
  the bulk-import outline pass all use it (repeating the same input skips
  the Gemini call). Chat (`lessonPatchService.ts`) deliberately does
  **not** cache — a cached patch could reference a section/visual id a
  later edit has already removed.

## Error handling

`mapAiErrorToResponse` (`src/lib/ai/routeErrorResponse.ts`) is the one
place that turns a thrown error into an HTTP response, for all five
routes:

| Error | Status |
|---|---|
| `InvalidAiRequestError` (and subclasses, one per service) | 400 |
| `RateLimitError` | 429 |
| `MissingApiKeyError` | 500 (message only — never the key) |
| timeout (combined `AbortSignal` fired) | 504 |
| `AiGenerationError` | 502 |
| client disconnect (`AbortError`) | 499 |
| anything else | 500, generic message, no stack trace to the client |

## Visual planning is best-effort, never blocking

`attachPlannedVisuals` in `lessonPlanService.ts` wraps the `planVisuals`
call in a try/catch: a rate limit, timeout, or malformed-JSON failure there
is logged server-side and swallowed, and the lesson is returned exactly as
`createLessonPlan` produced it — with no visuals, which is a fully usable
lesson (the same state every lesson was in before this existed). A lesson
generation request should never fail *because* visual planning failed.

The prompt (`src/lib/ai/gemini/prompts/visualPlanning.ts`) tells the model,
per template, what physical/mathematical setup it matches and its
parameter shape, and instructs it to skip a section only when nothing
listed genuinely fits — at most one visual per section, but the model is
told to lean toward attaching one wherever a template's setup matches
(cost isn't a concern here; a flash-lite call per lesson is cheap). The
one hard line stays: never attach a template whose physical/mathematical
setup doesn't actually match the section, since a wrong-but-present
visual is worse than none.

## Usage tracking

This app has no server-side database (see SECURITY.md), so real per-call
token/request counts have to travel from the server (where Gemini calls
happen) to the browser (where they're logged) on the same response that
already carries the actual result — there's no separate telemetry channel.

- `generateWithRepair` records each real Gemini response's
  `usageMetadata` (prompt/candidates/thoughts/total token counts) via
  `recordGeminiUsage` (`src/lib/ai/usageContext.ts`), an
  `AsyncLocalStorage`-backed collector scoped to one request — chosen so
  usage capture didn't require threading a new return value through every
  provider method, service function, and route (5 operations deep in
  places).
- Each of the five routes wraps its work in `jsonWithUsage`
  (`src/lib/ai/jsonWithUsage.ts`), which runs it inside
  `withUsageTracking` and spreads the collected calls onto the JSON
  response as `apiUsage: GeminiCallUsage[]`.
- The client pulls `body.apiUsage` out of the response **before** running
  it through the route's own Zod schema (which would otherwise silently
  strip the unknown field) and hands it to `recordApiUsageFromResponseBody`
  (`src/lib/storage/apiUsageRepository.ts`), which writes it to the
  `apiUsage` IndexedDB store. Storage failure is caught and logged, never
  thrown — this is a monitoring feature, not something that should ever
  block lesson generation.
- The Settings page (`ApiUsageDashboard`) reads that store and shows
  real request/token counts per model over a rolling 24h window, next to
  a clearly-caveated reference table of publicly reported free-tier
  limits — see that component for why the reference numbers are presented
  as approximate rather than an authoritative "remaining quota" figure
  (Google doesn't expose one via API).
