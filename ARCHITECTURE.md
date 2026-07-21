# Architecture

## Overview

Visual Study Assistant is a local-first Next.js (App Router) app. All
lesson data lives in the browser's IndexedDB — there is no application
database. The only server-side responsibility is proxying AI calls to
Gemini, so the API key never reaches the client.

```
Browser                                  Server (Next.js Route Handlers)
┌─────────────────────────────┐          ┌───────────────────────────────┐
│ React UI                     │  fetch   │ /api/lesson-plan               │
│  - New Lesson / Library /    │ ───────▶ │ /api/extract                   │
│    Lesson workspace / Chat   │          │ /api/lesson-patch              │
│                               │ ◀─────── │ /api/verify-lesson             │
│ IndexedDB (idb)               │  JSON    │   ↓                            │
│  - lessons                    │          │ *Service (validate, rate-limit,│
│  - revisions (undo/redo)      │          │  cache) → GeminiProvider       │
│  - conversations              │          │   ↓                            │
└─────────────────────────────┘          │ @google/genai → Gemini API      │
                                          └───────────────────────────────┘
```

Nothing above the "Service" layer knows Gemini exists — see AI_PIPELINE.md.

## Directory structure

```
src/
├── app/
│   ├── page.tsx                    New lesson (paste text / upload screenshot)
│   ├── library/page.tsx            Saved lessons list
│   ├── settings/page.tsx           Stub (placeholder)
│   ├── import-export/page.tsx      Library-wide export/import
│   ├── lessons/[id]/page.tsx       Server wrapper → LessonPageClient
│   └── api/
│       ├── lesson-plan/route.ts    Text → VisualLesson
│       ├── extract/route.ts        Screenshot → markdown
│       ├── lesson-patch/route.ts   Chat message → patches + reply
│       └── verify-lesson/route.ts  Advisory consistency check
├── components/
│   ├── layout/                     AppShell, Sidebar, TopBar, ThemeToggle
│   ├── lesson/                     NewLessonForm, LessonWorkspace, LessonChatPanel,
│   │                               LessonVerificationPanel, ScreenshotUploader,
│   │                               LessonPageClient (ties lesson state to both
│   │                               the workspace and the chat panel)
│   ├── equations/equation.tsx      KaTeX wrapper
│   ├── visuals/                    registry.ts, VisualBlockRenderer, UnsupportedVisual,
│   │                               and one subfolder per template category
│   │                               (scientific-diagram/, simulation/, process-flow/,
│   │                               mathematical-plot/) — see VISUAL_TEMPLATE_GUIDE.md
│   └── ui/                         shadcn/ui primitives
├── hooks/                          useLesson (with refresh), useLessonLibrary
├── lib/
│   ├── ai/                         provider.ts (interface), config.ts (model names),
│   │                               rateLimit.ts, errors.ts, routeErrorResponse.ts,
│   │                               *Service.ts (one per AI operation),
│   │                               gemini/ (the one current provider implementation)
│   ├── lessonPatch/                applyLessonPatch.ts (pure), condenseLesson*.ts
│   │                               (trimmed lesson views sent to the AI)
│   ├── cache/requestCache.ts       content-hash cache for lesson-plan/extract/verify
│   ├── schema/                     Zod schemas — see VISUAL_SCHEMA.md
│   ├── storage/                    IndexedDB (db.ts) + one repository per concern
│   │                               (lessons, revisions, conversations) + exportImport.ts
│   ├── upload/                     client-side image validation + canvas compression
│   └── mock/                       hand-written example lesson (no AI call)
└── styles/globals.css
```

## Client/server boundary

Every module that must never reach the client imports `"server-only"`
(`src/lib/ai/**`, `src/lib/cache/**`) — a build-time guard, not just a
convention. `GEMINI_API_KEY` is read once, at request time, in
`src/lib/ai/config.ts::getGeminiApiKey()`; nothing else touches
`process.env` directly.

Route handlers are thin: parse + Zod-validate the body, wire a timeout
`AbortSignal` (combined with the incoming request's own signal so a client
disconnect cancels the Gemini call), delegate to a `*Service` function, and
map errors through the shared `mapAiErrorToResponse` (`src/lib/ai/routeErrorResponse.ts`)
so all four routes fail the same way (400/429/500/502/504) instead of each
route reinventing it.

## State ownership in the lesson workspace

`LessonPageClient` (`src/components/lesson/lesson-page-client.tsx`) is the
single owner of the currently-open lesson (`useLesson(id)`), passed down to
both `LessonWorkspace` and `LessonChatPanel`. This exists specifically so a
chat-driven edit or an undo/redo immediately shows up in the workspace
without each component fetching independently and drifting out of sync.

## Storage

Three IndexedDB object stores (`src/lib/storage/db.ts`), each with its own
thin repository module:

- **lessons** (keyPath `id`) — the actual `VisualLesson` documents.
- **revisions** (keyPath `lessonId`) — `{ history: VisualLesson[], pointer }`
  per lesson, capped at 20 entries, powering undo/redo
  (`revisionRepository.ts`).
- **conversations** (keyPath `lessonId`) — chat message history per lesson
  (`conversationRepository.ts`).

Screenshots are stored inline as base64 data URLs on
`lesson.source.originalImages` (one per screenshot, in upload order)
rather than in a separate store — see the Risks section of
IMPLEMENTATION_PLAN.md for why.

## Visual rendering

A lesson never contains executable code — only a `templateId` and a
`parameters` object. `VisualBlockRenderer` looks up `templateId` in the
registry; an unknown id or parameters that fail that template's own Zod
schema render `UnsupportedVisual` instead. See VISUAL_TEMPLATE_GUIDE.md.
