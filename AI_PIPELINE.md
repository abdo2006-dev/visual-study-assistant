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
}
```

`GeminiProvider` (`src/lib/ai/gemini/geminiProvider.ts`) is the only current
implementation. Swapping providers means writing one new class — no route,
service, or UI code depends on Gemini's response shapes.

## The five operations

| Operation | Route | Input | Output |
|---|---|---|---|
| Lesson planning | `/api/lesson-plan` | pasted text | a full `VisualLesson` (no visuals yet) |
| Visual planning | *(internal — see below)* | the just-planned lesson | per-section `VisualBlock` assignments |
| Source extraction | `/api/extract` | one or more compressed screenshots | reading-order markdown |
| Lesson modification | `/api/lesson-patch` | a chat message + condensed lesson | a reply + `LessonPatch[]` |
| Verification | `/api/verify-lesson` | a condensed lesson | an advisory `LessonVerification` |

Each has its own prompt module under `src/lib/ai/gemini/prompts/` and its
own Zod schema. Visual planning has no route of its own — `generateLessonPlan`
(`src/lib/ai/lessonPlanService.ts`) calls `provider.planVisuals` itself right
after `provider.createLessonPlan`, so a single `POST /api/lesson-plan` request
still returns a lesson with visuals already attached.

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
  shared across all four routes, in a single process-lifetime variable.
  This is not multi-tenant infrastructure — it exists to catch a runaway
  client loop, not to defend against abuse at scale (see the Vercel caveat
  in ROADMAP.md).
- `src/lib/cache/requestCache.ts`: a content-hash, in-memory,
  process-lifetime cache. Lesson planning, extraction, and verification
  all use it (repeating the same input skips the Gemini call). Chat
  (`lessonPatchService.ts`) deliberately does **not** cache — a cached
  patch could reference a section/visual id a later edit has already
  removed.

## Error handling

`mapAiErrorToResponse` (`src/lib/ai/routeErrorResponse.ts`) is the one
place that turns a thrown error into an HTTP response, for all four
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
parameter shape, and instructs it to skip a section rather than force a
template that doesn't genuinely fit — at most one visual per section, and
it's fine (expected, even) for many sections to get none.

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
- Each of the four routes wraps its work in `jsonWithUsage`
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
