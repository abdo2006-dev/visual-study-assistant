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

## Known limitations / deliberately out of scope

- **Visual planning is best-effort, not guaranteed.** The AI is
  instructed to skip a section rather than force a template that doesn't
  genuinely fit — many sections (definitions, historical asides) are
  expected to get no visual. A planning failure (rate limit, timeout)
  degrades to the old behavior (no visuals) rather than failing lesson
  generation — see AI_PIPELINE.md.
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
- **Settings page is a stub.** No UI yet for economy mode, theme
  preferences beyond dark/light, or provider status.
- **Rate limiting is per-process**, not distributed — see the Vercel
  caveat in SECURITY.md.
- **The Cloudflare deployment option wasn't pursued.** The app is
  deployed on Vercel; the codebase avoids Vercel-only primitives so a
  future move via `@opennextjs/cloudflare` stays realistic, but this
  hasn't been attempted.

## Possible next steps

Roughly in order of likely value:

1. **Bulk/multi-document import** — paste or upload a large block of
   source material and have an AI pass propose a topic-based split into
   multiple lessons (or one, if the material is cohesive), reviewed and
   adjustable before each lesson generates independently through the
   normal pipeline (so per-lesson quality doesn't degrade with more
   material, unlike a single AI call trying to generate everything at
   once).
2. **More visual templates** — the ten cover electrostatics (point,
   spherical, cylindrical, and planar symmetry, plus dipoles) and six
   general-purpose diagrams; more subject-specific templates (e.g. a
   titration/pH curve for chemistry, an energy-level diagram, a
   free-body diagram) would broaden coverage further.
3. **Settings UI** for economy mode and provider status, per
   IMPLEMENTATION_PLAN.md section 18.
4. **Cloudflare deployment**, if Vercel's free tier ever becomes limiting.
