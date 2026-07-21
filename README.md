# Visual Study Assistant

A private, local-first study tool that turns pasted text explanations or
screenshots of educational material into structured, interactive visual
lessons — deterministic SVG/Canvas diagrams driven by an AI-generated lesson
plan, not freeform AI-generated images.

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the full
architecture, schema design, and milestone plan, and
[VISUAL_TEMPLATE_GUIDE.md](./VISUAL_TEMPLATE_GUIDE.md) for how the visual
registry works and how to add a new template. This README covers running
what currently exists (through Milestone 6: app shell, local library,
text-to-lesson generation, screenshot upload/extraction, KaTeX equations,
and all seven initial visual templates — charged sphere, force vectors,
particle diffusion, process flow, coordinate geometry, waves, and a simple
circuit).

## Prerequisites

- **Node.js 22+** (a `.nvmrc` is provided — run `nvm use` if you use nvm).
  Node 20.10 will fail: several build/test dependencies require newer
  `node:util` APIs and native bindings built against 20.18+.
- npm (ships with Node)

## Setup

```bash
npm install
cp .env.example .env.local
# then edit .env.local and set GEMINI_API_KEY
```

`GEMINI_API_KEY` is only read server-side (see `src/lib/ai/config.ts`) and is
never bundled into client code. Everything except "Generate lesson" and
"Extract text" (screenshot upload) on the New Lesson page works without it.

## Development

```bash
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

## Testing

```bash
npm run test        # unit tests (Vitest + Testing Library)
npm run test:watch  # unit tests, watch mode
npm run test:e2e    # end-to-end tests (Playwright; builds + starts the app first)
```

No ordinary test depends on a real Gemini API call — the Gemini SDK and
`fetch` calls are mocked throughout. There's one optional live smoke test,
skipped unless you opt in:

```bash
RUN_LIVE_GEMINI_TEST=1 npx vitest run tests/unit/gemini-live-smoke.test.ts
```

If Playwright reports a missing browser binary, run:

```bash
npx playwright install chromium
```

## Production build

```bash
npm run build
npm run start
```

## Linting

```bash
npm run lint
```

## Troubleshooting

- **`Cannot find module '@rolldown/binding-darwin-...'` or `styleText` not
  exported from `node:util`**: you're on Node < 22. Switch with
  `nvm use` (after `nvm install 22` if needed) and reinstall:
  `rm -rf node_modules package-lock.json && npm install`.
- **Playwright can't find a browser**: run
  `npx playwright install chromium`.
- **A route errors with a missing-API-key message**: expected until you set
  `GEMINI_API_KEY` in `.env.local` — only `/api/lesson-plan` needs it.
- **Gemini errors with "model ... is no longer available to new users"**:
  Google occasionally sunsets specific dated model names. `src/lib/ai/config.ts`
  uses the rolling `-latest` aliases (`gemini-flash-latest`, etc.) specifically
  to avoid this, but if Google retires an alias too, update the three model
  names there — nowhere else in the codebase references a model name.

## Deployment

Target: Vercel (free tier), with the codebase kept portable enough to move
to Cloudflare Pages/Workers via `@opennextjs/cloudflare` later if needed —
see the Stack section of `IMPLEMENTATION_PLAN.md` for the reasoning.
