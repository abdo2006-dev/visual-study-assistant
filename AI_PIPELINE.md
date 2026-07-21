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
}
```

`GeminiProvider` (`src/lib/ai/gemini/geminiProvider.ts`) is the only current
implementation. Swapping providers means writing one new class — no route,
service, or UI code depends on Gemini's response shapes.

## The four operations

| Operation | Route | Input | Output |
|---|---|---|---|
| Lesson planning | `/api/lesson-plan` | pasted text | a full `VisualLesson` |
| Source extraction | `/api/extract` | a compressed screenshot | reading-order markdown |
| Lesson modification | `/api/lesson-patch` | a chat message + condensed lesson | a reply + `LessonPatch[]` |
| Verification | `/api/verify-lesson` | a condensed lesson | an advisory `LessonVerification` |

Each has its own prompt module under `src/lib/ai/gemini/prompts/` and its
own Zod schema. **Visual planning is not yet a fifth operation** — see
"What's deliberately not automated" below.

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
of the seven templates got picked). The lesson-patch and add-visual paths
work around this by having Gemini return `parametersJson: string` — a
JSON-encoded string, a shape Gemini can always describe — which is then
`JSON.parse`d and validated against our real `LessonPatch` schema
(`toLessonPatch`, `src/lib/ai/gemini/toLessonPatch.ts`) before it touches
anything. A patch that fails this second validation is dropped, not
applied — one bad patch in a batch doesn't fail the whole chat turn.

## Keeping requests small

Full `VisualLesson` objects carry a lot the AI doesn't need for chat or
verification (annotations, factual-check placeholders, raw visual
parameters). `src/lib/lessonPatch/condenseLesson.ts` and
`condenseLessonForVerification.ts` produce trimmed views — ids, headings,
explanations, equations, and each visual's *descriptive* fields only — so
those two operations send less than the full document.

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

## What's deliberately not automated yet

The AI never *decides* to attach a visual template to a freshly-generated
lesson — `createLessonPlan` always returns empty `visuals: []` arrays.
Visuals only appear via the hand-written mock lesson or a chat-driven
`add-visual` patch. Automating "AI picks a template for this section" was
judged premature with only seven templates to choose from (see the Risks
section of IMPLEMENTATION_PLAN.md) — worth revisiting once the registry is
larger.
