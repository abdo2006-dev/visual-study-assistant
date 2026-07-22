# Roadmap

## Done

- **Milestone 1** — project foundation, themed app shell, Zod, env-var
  handling, test framework.
- **Milestone 2** — local lesson library (IndexedDB CRUD, export/import).
- **Milestone 3** — text → lesson generation via Gemini.
- **Milestone 4** — screenshot upload → extraction → lesson generation.
- **Milestone 5** — visual template registry, KaTeX equations, the
  charged-sphere flagship template.
- **Milestone 6** — six more templates: force vectors, particle diffusion,
  process flow, coordinate geometry, waves, a simple circuit.
- **Milestone 7** — chat-based lesson editing (`LessonPatch`), undo/redo.
- **Milestone 8** — advisory verification pass, accessibility audit
  (automated axe scans + fixes), responsive-layout check and fixes,
  this documentation set.
- **Milestone 9** — AI-driven visual planning (lesson generation now
  attaches visuals itself, best-effort — see AI_PIPELINE.md), plus three
  more templates for electromagnetics content the registry didn't cover
  yet: `long-charged-wire` (cylindrical symmetry), `infinite-plane`
  (planar symmetry / parallel plates), and `electric-dipole`.
- **Milestone 10** — multiple screenshots per lesson: `ScreenshotUploader`
  and `/api/extract` now take an array of images (up to 6) and combine
  them into one extraction in the given order.
- **Milestone 11** — local API usage tracking: every real Gemini call's
  token/request counts are logged to IndexedDB and shown on the Settings
  page, next to a clearly-caveated free-tier reference table (see
  AI_PIPELINE.md's "Usage tracking" section for how the numbers get from
  server to client with no server-side database involved).
- **Milestone 12** — bulk text import (`/bulk-import`): paste or upload a
  large block of study material, an outline pass proposes a verbatim
  split into several lessons (or one, if it's cohesive), reviewed and
  adjustable before each generates independently through the normal
  pipeline — see AI_PIPELINE.md's "Bulk import" section.
- **Milestone 13** — fixed a real bug: chat-requested visuals could
  silently fail to appear while the AI's reply claimed success, because
  `applyLessonPatches` discarded an entire batch if any one patch failed
  (e.g. a stale section id). Patches now apply independently and failures
  are surfaced to the user — see AI_PIPELINE.md's "Chat replies aren't
  proof the patches applied". Also: the chat's `add-visual` prompt now
  gets the same per-template parameter guidance as automatic visual
  planning (previously it only had bare template names); visual planning
  itself is now noticeably more willing to attach a visual per section,
  since cost isn't a real constraint on the free tier; and
  `electric-dipole` gained a second mode, `far-field-comparison`, for
  axial-vs-equatorial field content the original torque-only template
  didn't cover.
- **Milestone 14** — lesson generation streams live progress instead of
  sitting silently: `/api/lesson-plan` now sends staged status messages
  ("Reading your text...", "Choosing visuals...") over a newline-delimited
  JSON response, shown next to an elapsed-time counter on both the New
  Lesson page and Bulk Import — see AI_PIPELINE.md's "Streaming progress"
  section. Bulk-import batches are also now persisted to IndexedDB as
  they run, with a "Recent imports" history shown on the page, so a
  refresh no longer erases visibility into what already generated.
- **Milestone 15** — rebranded to **EduViz**: an indigo/violet-on-warm-
  off-white palette (both themes, contrast-checked via the accessibility
  suite), a hand-built SVG logo (`src/app/icon.svg`, also used as the
  sidebar wordmark) rather than an AI-generated image — Gemini's image
  models exist but returned quota-exceeded on this project's free tier,
  and a deterministic hand-drawn mark fits this app's own "no AI-
  generated images" design principle better anyway. The underlying repo
  name, Vercel project, and deployed domain (`visual-study-assistant.vercel.app`)
  were left unchanged — renaming those is a separate, riskier decision
  than the in-app branding.
- **Milestone 16** — reliability and model-quality pass:
  - Bulk-import lessons could hit Vercel's 60s Hobby-plan function-duration
    ceiling on unusually dense excerpts (two sequential Gemini calls —
    lesson text, then visual planning — inside one request). Fixed with a
    request-budget split in `lessonPlanService.ts`: visual planning gets
    whatever time is left after the lesson text finishes, and is skipped
    outright (lesson still returns, just without a visual) if too little
    remains — see AI_PIPELINE.md.
  - `createLessonPlan`, `planVisuals`, and `modifyLesson` (chat) now
    default to `"balanced"` (`gemini-flash-latest`) instead of
    `"economical"` (`gemini-flash-lite-latest`) — the operations that most
    affect what the user actually sees. Extraction, verification, and the
    bulk-import outline pass stay on `"economical"`, where cheaper output
    is already good enough.
  - A failed lesson in a Bulk Import batch now has its own **Retry**
    button instead of requiring the whole batch to be redone.
  - The Settings page gained an **AI quality mode** selector
    (Automatic/Economical/Balanced/Highest quality), persisted in
    `localStorage` and sent as an override on every AI route call —
    "Automatic" leaves the new per-operation defaults above in place.
- **Milestone 17** — curiosity questions: each section can now carry a
  short list of proactive why/how/what follow-ups (mostly "why"), shown
  as collapsed-by-default boxes so a section that doesn't need one stays
  uncluttered. Lesson generation adds them where a claim would genuinely
  leave a sharp student unsatisfied (e.g. "the potential is zero, but why
  isn't the field also zero?"); asking a why/how/what question in chat
  about existing content now also persists the answer as one of these
  boxes via a new `add-curiosity-question` patch, instead of only living
  in the chat transcript — see AI_PIPELINE.md's "Curiosity questions"
  section.

## Known limitations / deliberately out of scope

- **Visual planning is still best-effort, not guaranteed**, and a
  planning failure (rate limit, timeout) degrades to no visuals rather
  than failing lesson generation — see AI_PIPELINE.md. As of Milestone 13
  it's deliberately biased toward attaching a visual wherever a template
  plausibly fits, rather than staying conservative — a section still gets
  skipped only when no template's setup genuinely matches it.
- **Single AI provider.** `LessonAIProvider` is designed to be swappable,
  but `GeminiProvider` is the only implementation — the Settings mode
  selector (Milestone 16) switches economy mode, not provider.
- **No keyboard alternative for vector dragging.** The force-vector
  template's draggable tips are pointer-only; the rest of that template
  (and every other interactive control — sliders, buttons) is fully
  keyboard-accessible.
- **No automated visual-regression testing.** Mobile layout correctness
  was checked manually in-browser (Milestone 8), not via a screenshot-diff
  suite.
- **The free-tier reference numbers on the usage dashboard are
  approximate, not authoritative.** Google doesn't publish exact
  free-tier limits on its own rate-limits page or expose a "remaining
  quota" API — see `ApiUsageDashboard`'s own caveats and the link to
  Google AI Studio's live dashboard for the real numbers.
- **Bulk import generates lessons sequentially, one at a time**, not in
  parallel — deliberate, to stay gentle on the shared rate limiter, but
  it means a batch of many lessons takes a while and can't be sped up
  from the UI. Capped at 60,000 characters of input and 20 proposed
  lessons per batch.
- **A bulk-import batch can't be resumed after a page reload** — the
  in-flight requests get cancelled by the navigation, and there's no
  server-side job queue to pick back up from. The batch's history
  persists (see Milestone 14), so nothing already generated is lost, but
  any lesson still pending/generating when the tab closed has to be
  re-run from scratch. The per-lesson Retry button (Milestone 16) only
  covers failures within the same page session — it relies on the
  original excerpt still being in memory, which a reload clears.
- **Rate limiting is per-process**, not distributed — see the Vercel
  caveat in SECURITY.md.
- **The Cloudflare deployment option wasn't pursued.** The app is
  deployed on Vercel; the codebase avoids Vercel-only primitives so a
  future move via `@opennextjs/cloudflare` stays realistic, but this
  hasn't been attempted.

## Possible next steps

Roughly in order of likely value:

1. **More visual templates** — the ten cover electrostatics (point,
   spherical, cylindrical, and planar symmetry, plus dipoles) and six
   general-purpose diagrams; more subject-specific templates (e.g. a
   titration/pH curve for chemistry, an energy-level diagram, a
   free-body diagram) would broaden coverage further.
2. **Parallelizing bulk-import generation** (with a concurrency cap that
   respects the shared rate limiter), if sequential generation proves too
   slow for larger batches in practice.
3. **Cloudflare deployment**, if Vercel's free tier ever becomes limiting.
