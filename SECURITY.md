# Security

## API key handling

- `GEMINI_API_KEY` is read exactly once, at request time, in
  `getGeminiApiKey()` (`src/lib/ai/config.ts`) — never at module load or
  build time, so a missing key fails one request with a clear message
  instead of breaking the whole app.
- Every module that touches it (`src/lib/ai/**`, `src/lib/cache/**`)
  imports `"server-only"`, a build-time guard against accidentally
  importing server code into a client bundle.
- The key is never logged. Error responses return a fixed message
  (`MissingApiKeyError`'s own text) — never the underlying error object,
  which could otherwise leak into a stack trace.
- `.env.local` is gitignored (`.env*` with a `!.env.example` exception);
  `.env.example` ships with an empty `GEMINI_API_KEY=`.
- When deploying (Vercel), the key is set as a project environment
  variable, never committed.

## No arbitrary code execution

This is the core design constraint of the whole visual system (see
IMPLEMENTATION_PLAN.md section 3): the AI can never cause code to run.

- **Visual templates**: a lesson stores only a `templateId` string and a
  `parameters` object. `VisualBlockRenderer` looks up `templateId` in a
  fixed, hand-written registry (`src/components/visuals/registry.ts`); an
  unrecognized id, or `parameters` that fail that template's own Zod
  schema, renders `UnsupportedVisual` — there is no path from AI output to
  `eval`, `new Function`, or dynamic imports.
- **Equations**: rendered via KaTeX (`src/components/equations/equation.tsx`)
  with `trust: false` (KaTeX's default) — this disables LaTeX commands
  that could embed arbitrary HTML or URLs. A parse failure (malformed
  LaTeX) falls back to displaying the raw source as text instead of
  throwing or rendering nothing.
- **Chat patches**: Gemini never returns code — only a fixed set of typed
  operations (`LessonPatch`), each re-validated against our own Zod schema
  (`toLessonPatch`) before being applied by a pure function
  (`applyLessonPatch`) that only ever mutates known, typed fields.
- No `dangerouslySetInnerHTML` is used anywhere except the KaTeX output
  above, which is the standard, documented way to render KaTeX in React and
  is safe specifically because of `trust: false`.

## Upload validation

`src/lib/upload/imageValidation.ts`: MIME type allowlist (PNG/JPEG/WebP
only) and a size cap, checked before any processing. Images are
recompressed client-side via Canvas (`compressImage.ts`) before upload —
this also means the server never receives or stores an arbitrarily large
file. `/api/extract`'s service layer (`extractionService.ts`) re-checks
both the MIME type and an approximate decoded size server-side too, since
client-side checks are advisory, not a security boundary on their own.

## Rate limiting and timeouts

- `src/lib/ai/rateLimit.ts`: a shared, process-lifetime fixed-window
  limiter (10 requests/minute) across all four AI routes, meant to catch a
  runaway client (e.g. a buggy retry loop), not to defend against
  distributed abuse — see the Vercel deployment caveat below.
- Every AI route wires a timeout `AbortSignal`
  (`AbortSignal.any([request.signal, timeoutController.signal])`),
  combined with the incoming request's own signal — so a client
  disconnecting cancels the in-flight Gemini call, and a slow Gemini
  response times out with a 504 rather than hanging.

## Error responses

`mapAiErrorToResponse` (`src/lib/ai/routeErrorResponse.ts`) is the single
place that turns a caught error into an HTTP response for all four AI
routes. Unrecognized errors return a fixed generic message
("Something went wrong. Please try again.") with a 500 — the actual error
is only ever `console.error`'d server-side (name/message, not full
payloads), never sent to the client. No route ever returns a raw stack
trace.

## Import validation

Importing a lesson or library file (`src/lib/storage/exportImport.ts`)
re-validates the entire contents against `visualLessonSchema` — a
hand-edited or corrupted export is rejected with `ImportValidationError`,
not partially trusted.

## Known gap: rate limiting on Vercel

The in-memory rate limiter is per-process. On Vercel's serverless
runtime, each cold start gets a fresh instance — the limiter doesn't
reliably persist across invocations the way it does in a single local
`next dev`/`next start` process. Combined with the deployed URL being
publicly reachable (no auth — this is a personal-use app, see
IMPLEMENTATION_PLAN.md section 1), anyone who finds the URL could make
Gemini calls against your key with only weak rate-limiting protection.
Acceptable for personal testing; worth revisiting (e.g. Vercel KV or
Upstash-backed limiting) before sharing the URL widely.

## Out of scope by design

No authentication, no multi-user support, no server-side persistence of
lesson content — this is intentionally a private, single-user, local-first
tool (IMPLEMENTATION_PLAN.md section 1). Adding accounts or a shared
backend would be a significant architecture change, not a security patch.
