# Visual Template Guide

How the visual registry works, and how to add a new template. See
`IMPLEMENTATION_PLAN.md` sections 8–9 for the original design and the
planned template list.

## The core rule

A `VisualBlock` in a lesson (`src/lib/schema/visualBlocks.ts`) carries a
`templateId` and a `parameters` object — never code. The registry
(`src/components/visuals/registry.ts`) maps known `templateId`s to a
hand-written, trusted React component plus a Zod schema for that
component's parameters. `VisualBlockRenderer`
(`src/components/visuals/visual-block-renderer.tsx`) looks up the
`templateId`; if it's unknown, or the parameters fail validation, it
renders `UnsupportedVisual` instead — an AI response can never cause
arbitrary code to run.

## Adding a template

Using `radial-charged-sphere` as the worked example:

1. **Define the parameter schema.** A new file under
   `src/lib/schema/templates/`, e.g. `myTemplate.ts`:

   ```ts
   export const myTemplateParamsSchema = z.object({
     someEnum: z.enum(["a", "b"]).default("a"),
     someNumber: z.number().min(0).max(1).default(0.5),
   });
   export type MyTemplateParams = z.infer<typeof myTemplateParamsSchema>;
   ```

   Keep it a real, typed schema — not `z.record(z.string(), z.unknown())`.
   Give every field a `.default(...)` where sensible, so a partially
   AI-specified block still renders something reasonable.

2. **Separate pure logic from rendering**, if the template has any
   nontrivial math or geometry (region detection, physical formulas,
   deterministic layout). See
   `src/components/visuals/scientific-diagram/radial-charged-sphere-physics.ts`
   — plain functions, no React/DOM, so they're unit-testable without
   rendering anything. This is also where correctness lives: the whole
   point of the template system (see `IMPLEMENTATION_PLAN.md` section 3)
   is that this logic is hand-verified, not AI-generated at render time.

3. **Build the component**, under
   `src/components/visuals/<category>/myTemplate.tsx` (category matches a
   `VisualBlock.type`: `scientific-diagram`, `simulation`,
   `mathematical-plot`, etc.):

   ```tsx
   export function MyTemplate({ parameters }: { parameters: MyTemplateParams }) {
     // parameters is already validated — render directly.
   }
   ```

   Use SVG for diagrams (see the sphere template), Canvas for anything
   pixel-heavy. Render equations via `<Equation latex="..." />`
   (`src/components/equations/equation.tsx`), never raw `<code>`.

4. **Register it**, in `src/components/visuals/registry.ts`:

   ```ts
   import { MyTemplate } from "@/components/visuals/<category>/myTemplate";
   import { myTemplateParamsSchema } from "@/lib/schema/templates/myTemplate";
   // ...
   export const visualTemplateRegistry: Record<string, VisualTemplateDefinition<unknown>> = {
     "radial-charged-sphere": defineTemplate(radialChargedSphereParamsSchema, RadialChargedSphere),
     "my-template-id": defineTemplate(myTemplateParamsSchema, MyTemplate),
   };
   ```

   `defineTemplate` checks at this call site that the schema's inferred
   type matches the component's `parameters` prop — a mismatch is a
   compile error here, not a runtime surprise later.

5. **Test it**: a schema test (defaults, rejects invalid input), a pure-logic
   test if you extracted one, and a render test via `VisualBlockRenderer`
   (known templateId + valid params renders your component; invalid
   params falls back to `UnsupportedVisual`). See `tests/unit/radial-charged-sphere-*.test.ts`
   and `tests/unit/visual-block-renderer.test.tsx` for the pattern.

## What the AI does and doesn't control

The AI (once visual planning is wired up — see the Risks note in
`IMPLEMENTATION_PLAN.md`) supplies `templateId` and `parameters` only.
Anything that must be physically/mathematically correct — formulas, region
boundaries, geometry — belongs in your component or its logic module, not
in something the AI decides per-lesson. `parameters` should describe
*configuration* (which variant, what to show/hide, an initial value), not
facts that could be wrong.

## Accessibility

Every `VisualBlock` carries `accessibilityDescription`, rendered by
`VisualBlockRenderer` as a screen-reader-only `<figcaption>`. Interactive
controls (sliders, etc.) need their own labels — see the sphere template's
`<label htmlFor={sliderId}>` and `aria-valuetext` on its slider.
