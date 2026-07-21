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

## Known limitations / deliberately out of scope

- **AI-driven visual planning doesn't exist yet.** `createLessonPlan`
  always returns `visuals: []`; a generated lesson has no visuals unless
  you add one via chat. This was deferred until the registry had enough
  templates to choose from — see AI_PIPELINE.md.
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
- **Milestone 9 (optional Cloudflare deployment) wasn't pursued.** The app
  is deployed on Vercel; the codebase avoids Vercel-only primitives so a
  future move via `@opennextjs/cloudflare` stays realistic, but this
  hasn't been attempted.

## Possible next steps

Roughly in order of likely value:

1. **AI-driven visual planning** — have lesson generation (or a follow-up
   pass) decide which of the seven templates fits each section and supply
   parameters for it, instead of requiring a chat request per visual.
2. **More visual templates** — the seven cover the flagship electrostatics
   example plus six general-purpose diagrams; more subject-specific
   templates (e.g. a titration/pH curve for chemistry, an energy-level
   diagram, a free-body diagram) would broaden coverage.
3. **Multiple screenshots per lesson** — currently one image in, one
   extraction out.
4. **Bulk/multi-document import** — paste or upload a large block of
   source material and have it split into multiple lessons (or grouped
   into one), rather than one paste → one lesson.
5. **Settings UI** for economy mode and provider status, per
   IMPLEMENTATION_PLAN.md section 18.
6. **Cloudflare deployment**, if Vercel's free tier ever becomes limiting.
