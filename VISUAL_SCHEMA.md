# Data Schemas

All schemas are Zod (`src/lib/schema/`), runtime-validated at every
boundary (AI response, IndexedDB read, import file) — nothing is trusted
just because TypeScript compiled.

## VisualLesson

`src/lib/schema/lesson.ts`. The top-level document stored in IndexedDB's
`lessons` store.

```ts
type VisualLesson = {
  schemaVersion: 1;
  id: string;
  title: string;
  subject: "physics" | "chemistry" | "biology" | "mathematics" | "engineering" | "other";
  topic?: string;
  source: LessonSource;
  summary: string;
  prerequisites: string[];
  learningObjectives: string[];
  sections: LessonSection[];
  createdAt: string;   // ISO datetime
  updatedAt: string;   // ISO datetime
};

type LessonSource = {
  kind: "pasted-text" | "screenshot" | "mock";
  originalText?: string;
  originalImages?: string[];  // data URLs, screenshot only, one per screenshot
};

type LessonSection = {
  id: string;
  heading?: string;
  sourceText: string;
  simplifiedExplanation: string;
  importantTerms: { term: string; definition: string }[];
  equations: EquationBlock[];
  visuals: VisualBlock[];
};
```

`schemaVersion` is a literal `1` today; a future breaking change to this
shape would bump it and add a migration step in `lessonRepository.ts`
(none exists yet — there's only ever been one version).

## EquationBlock

`src/lib/schema/equations.ts`.

```ts
type EquationBlock = {
  id: string;
  latex: string;
  plainLanguageReading?: string;
  symbols: { symbol: string; meaning: string; unit?: string }[];
  appliesWhen?: string;   // e.g. "r < R"
  sourceSectionId?: string;
};
```

Rendered via `<Equation latex={...} />` (KaTeX) — see SECURITY.md for why
that's safe with AI-supplied strings.

## VisualBlock

`src/lib/schema/visualBlocks.ts`. Deliberately loose at this layer —
`templateId` and `parameters` aren't typed here on purpose:

```ts
type VisualBlock = {
  id: string;
  type: "scientific-diagram" | "simulation" | "mathematical-plot" | "comparison"
      | "process-flow" | "timeline" | "scale-comparison" | "generated-illustration"
      | "annotated-source-image";
  templateId: string;
  title: string;
  educationalPurpose: string;
  accessibilityDescription: string;
  parameters: Record<string, unknown>;
  controls: string[];
  annotations: string[];
  sourceSectionId?: string;
  factualChecks: string[];
  generationStatus: "pending" | "ready" | "unsupported" | "error";
  error?: string;
};
```

The *strict* typing lives one layer down, per template, in
`src/lib/schema/templates/*.ts` — see VISUAL_TEMPLATE_GUIDE.md for the
full list and how to add one. `VisualBlockRenderer` is what actually
enforces this: it looks up `templateId` in the registry and re-validates
`parameters` against that template's own schema before rendering anything.

## LessonPatch

`src/lib/schema/patch.ts`. A discriminated union on `op`, applied by the
pure function `applyLessonPatch` (`src/lib/lessonPatch/applyLessonPatch.ts`).

```ts
type LessonPatch =
  | { op: "replace-explanation"; sectionId: string; simplifiedExplanation: string }
  | { op: "remove-visual"; sectionId: string; visualId: string }
  | { op: "update-visual-parameters"; sectionId: string; visualId: string; parameters: Record<string, unknown> }
  | { op: "add-visual"; sectionId: string; type: VisualBlockType; templateId: string;
      title: string; educationalPurpose: string; accessibilityDescription: string;
      parameters: Record<string, unknown> }
  | { op: "remove-section"; sectionId: string }
  | { op: "add-prerequisite"; prerequisite: string };
```

Every patch that targets a section or visual does so by id;
`applyLessonPatch` throws `PatchApplicationError` if that id doesn't exist,
rather than silently no-oping or guessing. "Highlight concept" from the
original design notes isn't a patch — it's UI-only attention, not a
content change. "Add comparison" and "simplify section" are expressed via
`add-visual` and `replace-explanation` rather than getting their own op.

## LessonVerification

`src/lib/schema/verification.ts`. The advisory result from
`/api/verify-lesson` — never persisted, shown once per check in
`LessonVerificationPanel`.

```ts
type LessonVerification = {
  checkedAt: string;
  summary: string;
  issues: {
    category: "unsupported-label" | "conflicting-direction" | "incorrect-sign"
            | "missing-boundary" | "inconsistent-variable" | "other";
    description: string;
    sectionId?: string;
    equationId?: string;
    visualId?: string;
  }[];
};
```

## Import/export package format

`src/lib/storage/exportImport.ts`. Two wrapper shapes, both re-validated
against `visualLessonSchema` on import (a corrupted or hand-edited file is
rejected with `ImportValidationError`, not silently accepted):

```ts
{ packageType: "lesson"; schemaVersion: 1; exportedAt: string; lesson: VisualLesson }
{ packageType: "library"; schemaVersion: 1; exportedAt: string; lessons: VisualLesson[] }
```
