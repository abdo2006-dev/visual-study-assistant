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

## Known limitations / deliberately out of scope

- **Visual planning is still best-effort, not guaranteed**, and a
  planning failure (rate limit, timeout) degrades to no visuals rather
  than failing lesson generation — see AI_PIPELINE.md. As of Milestone 13
  it's deliberately biased toward attaching a visual wherever a template
  plausibly fits, rather than staying conservative — a section still gets
  skipped only when no template's setup genuinely matches it.
- **Single AI provider.** `LessonAIProvider` is designed to be swappable,
  but `GeminiProvider` is the only implementation. No UI exists to switch
  models/providers or economy modes — every route defaults to
  `"economical"`.
- **No keyboard alternative for vector dragging.** The force-vector
  template's draggable tips are pointer-only; the rest of that template
  (and every other interactive control — sliders, buttons) is fully
  keyboard-accessible.
- **No automated visual-regression testing.** Mobile layout correctness
  was checked manually in-browser (Milestone 8), not via a screenshot-diff
  suite.
- **No UI yet for switching economy mode or provider status** on the
  Settings page (usage tracking is there now — see Milestone 11 — but
  every route still defaults to `"economical"` with no way to change it
  from the UI).
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
3. **Settings UI** for switching economy mode and provider status, per
   IMPLEMENTATION_PLAN.md section 18.
4. **Cloudflare deployment**, if Vercel's free tier ever becomes limiting.
