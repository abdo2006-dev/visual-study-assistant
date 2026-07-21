# Visual Study Assistant

A private, local-first study tool that turns pasted text explanations or
screenshots of educational material into structured, interactive visual
lessons — deterministic SVG/Canvas diagrams driven by an AI-generated lesson
plan, not freeform AI-generated images.

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the full
architecture, schema design, and milestone plan. This README covers running
what currently exists (Milestone 1: app shell, theming, tooling).

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
never bundled into client code. It is not required until AI features land
in Milestone 3 — the app runs fully without it today.

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

No test depends on a real Gemini API call — the mocked-AI-response approach
described in `IMPLEMENTATION_PLAN.md` / `TESTING.md` (added in a later
milestone) keeps the suite free to run.

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
  `GEMINI_API_KEY` in `.env.local` — only AI-backed routes (Milestone 3+)
  need it.

## Deployment

Target: Vercel (free tier), with the codebase kept portable enough to move
to Cloudflare Pages/Workers via `@opennextjs/cloudflare` later if needed —
see the Stack section of `IMPLEMENTATION_PLAN.md` for the reasoning.
