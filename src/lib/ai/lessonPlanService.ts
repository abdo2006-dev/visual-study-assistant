import "server-only";

import type { EconomyMode } from "@/lib/ai/config";
import { InvalidAiRequestError } from "@/lib/ai/errors";
import type { CreateLessonPlanInput, LessonAIProvider } from "@/lib/ai/provider";
import { checkRateLimit } from "@/lib/ai/rateLimit";
import { hashContent, withCache } from "@/lib/cache/requestCache";
import { condenseLessonForVisualPlanning } from "@/lib/lessonPatch/condenseLessonForVisualPlanning";
import type { VisualLesson } from "@/lib/schema/lesson";
import type { VisualBlock } from "@/lib/schema/visualBlocks";

export class InvalidLessonPlanRequestError extends InvalidAiRequestError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidLessonPlanRequestError";
  }
}

const MAX_SOURCE_TEXT_LENGTH = 20_000;
const MAX_INSTRUCTIONS_LENGTH = 500;
const CACHE_TTL_MS = 10 * 60_000;

// Vercel's Hobby plan caps a serverless function's total run time at 60s
// (see route.ts's `maxDuration`), and lesson planning is two sequential
// Gemini calls (createLessonPlan, then planVisuals) inside that one
// request. REQUEST_BUDGET_MS leaves a safety margin under that hard
// ceiling for the response to actually get serialized and sent; if
// planning the lesson's text already ate most of that budget, visual
// planning gets whatever's left rather than a fixed share, and is skipped
// outright below MIN_VISUAL_PLANNING_BUDGET_MS — a lesson with no visual
// beats the whole request timing out with nothing at all.
const REQUEST_BUDGET_MS = 55_000;
const MIN_VISUAL_PLANNING_BUDGET_MS = 5_000;

export interface GenerateLessonPlanOptions {
  /**
   * Called synchronously at each phase boundary so the route can stream a
   * live status to the client instead of leaving it staring at a spinner
   * for the whole (often 10-20s) round trip. Never called for a cache hit,
   * since that resolves near-instantly and has nothing to narrate.
   */
  onProgress?: (message: string) => void;
}

/**
 * Provider-agnostic orchestration: validates the request, applies rate
 * limiting and content-hash caching, then delegates to whichever
 * LessonAIProvider is passed in. The route wires up the real GeminiProvider;
 * tests pass a fake one.
 */
export async function generateLessonPlan(
  provider: LessonAIProvider,
  input: CreateLessonPlanInput,
  { onProgress }: GenerateLessonPlanOptions = {}
): Promise<VisualLesson> {
  const sourceText = input.sourceText.trim();

  if (!sourceText) {
    throw new InvalidLessonPlanRequestError(
      "Paste some text before generating a lesson."
    );
  }
  if (sourceText.length > MAX_SOURCE_TEXT_LENGTH) {
    throw new InvalidLessonPlanRequestError(
      `That text is too long (max ${MAX_SOURCE_TEXT_LENGTH.toLocaleString()} characters).`
    );
  }
  const instructions = input.instructions?.trim() || undefined;
  if (instructions && instructions.length > MAX_INSTRUCTIONS_LENGTH) {
    throw new InvalidLessonPlanRequestError(
      `Instructions are too long (max ${MAX_INSTRUCTIONS_LENGTH.toLocaleString()} characters).`
    );
  }

  checkRateLimit();

  const cacheKey = await hashContent(
    `${input.mode ?? "balanced"}::${instructions ?? ""}::${sourceText}`
  );
  return withCache(cacheKey, CACHE_TTL_MS, async () => {
    const startedAt = Date.now();
    onProgress?.("Reading your text and drafting sections...");
    const lesson = await provider.createLessonPlan({ ...input, sourceText, instructions });
    onProgress?.("Choosing visuals for each section...");
    const remainingBudgetMs = REQUEST_BUDGET_MS - (Date.now() - startedAt);
    return attachPlannedVisuals(provider, lesson, input.mode, input.signal, remainingBudgetMs);
  });
}

/**
 * Best-effort: visual-planning failures — rate limits, timeouts, malformed
 * AI output that survives generateWithRepair's one retry, or simply running
 * out of the route's remaining time budget — must never fail lesson
 * generation itself. When the AI planner cannot provide visuals, known
 * lesson patterns get deterministic fallback visuals so the user does not
 * end up with an empty, text-only lesson.
 */
export async function attachPlannedVisuals(
  provider: LessonAIProvider,
  lesson: VisualLesson,
  mode: EconomyMode | undefined,
  signal: AbortSignal | undefined,
  budgetMs: number
): Promise<VisualLesson> {
  if (budgetMs < MIN_VISUAL_PLANNING_BUDGET_MS) {
    console.error(
      `[visual-planning] skipped — only ${budgetMs}ms left in the request budget, using fallback visuals`
    );
    return attachFallbackVisuals(lesson);
  }

  try {
    const visualPlanningSignal = AbortSignal.timeout(budgetMs);
    const combinedSignal = signal
      ? AbortSignal.any([signal, visualPlanningSignal])
      : visualPlanningSignal;

    const { assignments } = await provider.planVisuals({
      lesson: condenseLessonForVisualPlanning(lesson),
      mode,
      signal: combinedSignal,
    });

    if (assignments.length === 0) return attachFallbackVisuals(lesson);

    const visualBySectionId = new Map<string, VisualBlock>();
    const seenVisualFingerprints = new Set<string>();
    for (const assignment of assignments) {
      if (visualBySectionId.has(assignment.sectionId)) continue;

      const fingerprint = visualFingerprint(assignment.visual);
      if (seenVisualFingerprints.has(fingerprint)) continue;

      seenVisualFingerprints.add(fingerprint);
      visualBySectionId.set(assignment.sectionId, assignment.visual);
    }

    return attachFallbackVisuals({
      ...lesson,
      sections: lesson.sections.map((section) => {
        const visual = visualBySectionId.get(section.id);
        if (!visual) return section;
        return {
          ...section,
          visuals: [{ ...visual, sourceSectionId: section.id }],
        };
      }),
    });
  } catch (err) {
    console.error("[visual-planning] failed, using fallback visuals", err);
    return attachFallbackVisuals(lesson);
  }
}

function attachFallbackVisuals(lesson: VisualLesson): VisualLesson {
  return {
    ...lesson,
    sections: lesson.sections.map((section) => {
      if (section.visuals.length > 0) return section;

      const visual = buildFallbackVisual(lesson.title, section);
      if (!visual) return section;

      return {
        ...section,
        visuals: [visual],
      };
    }),
  };
}

function buildFallbackVisual(
  lessonTitle: string,
  section: VisualLesson["sections"][number]
): VisualBlock | null {
  const heading = section.heading?.trim() || "this section";
  const sectionText = `${heading}\n${section.sourceText}\n${section.simplifiedExplanation}`;
  const normalized = sectionText.toLowerCase();

  if (mentionsCapacitorState(normalized) || mentionsCapacitorNetwork(normalized)) {
    return buildGeneratedFallbackVisual({
      lessonTitle,
      sectionId: section.id,
      heading,
      sectionText,
      caption: `Generated illustration for ${heading}.`,
    });
  }

  if (mentionsDielectricPolarization(normalized)) {
    return {
      id: crypto.randomUUID(),
      type: "scientific-diagram",
      templateId: "dielectric-polarization",
      title: "Dielectric Polarization and Opposing Field",
      educationalPurpose:
        "Shows how molecules polarize and create an opposing internal field in a dielectric.",
      accessibilityDescription:
        "A dielectric slab with aligned molecular dipoles, bound surface charge, an external field arrow, and a smaller opposing internal field arrow.",
      parameters: {
        materialKind: normalized.includes("permanent") ? "permanent" : "mixed",
        showExternalField: true,
        showOpposingField: true,
        showBoundSurfaceCharge: true,
        initialAlignment: 0.75,
      },
      controls: [],
      annotations: [],
      sourceSectionId: section.id,
      factualChecks: [],
      generationStatus: "ready",
    };
  }

  if (mentionsParallelPlateField(normalized)) {
    return {
      id: crypto.randomUUID(),
      type: "scientific-diagram",
      templateId: "infinite-plane",
      title: "Parallel-Plate Capacitor Field",
      educationalPurpose:
        "Shows the nearly uniform electric field confined between two capacitor plates.",
      accessibilityDescription:
        "Two oppositely charged parallel plates with field arrows between them and a potential plot.",
      parameters: {
        configuration: "parallel-plates",
        chargeSign: "positive",
        showFieldVectors: true,
        showPotentialPlot: true,
        initialObservationPositionRatio: 0,
      },
      controls: [],
      annotations: [],
      sourceSectionId: section.id,
      factualChecks: [],
      generationStatus: "ready",
    };
  }

  return null;
}

function buildGeneratedFallbackVisual({
  lessonTitle,
  sectionId,
  heading,
  sectionText,
  caption,
}: {
  lessonTitle: string;
  sectionId: string;
  heading: string;
  sectionText: string;
  caption: string;
}): VisualBlock {
  return {
    id: crypto.randomUUID(),
    type: "generated-illustration",
    templateId: "generated-illustration",
    title: `${heading} illustration`,
    educationalPurpose:
      "Provides a section-specific instructional image where no coded visual template is specific enough.",
    accessibilityDescription: `A generated instructional illustration explaining ${heading}.`,
    parameters: {
      imagePrompt: [
        `Create one clear textbook-style science illustration for the lesson "${lessonTitle}", section "${heading}".`,
        `It must explain this exact content: ${sectionText.slice(0, 900)}`,
        "Do not draw an interactive slider or reuse a generic capacitor field simulation.",
        "Use short labels, arrows, before/after panels, and callouts only where they directly clarify the concept.",
      ].join(" "),
      caption,
    },
    controls: [],
    annotations: [],
    sourceSectionId: sectionId,
    factualChecks: [],
    generationStatus: "pending",
  };
}

function mentionsDielectricPolarization(text: string): boolean {
  return (
    text.includes("dielectric") &&
    /\b(polariz|dipole|bound charge|internal field|opposing field|permittivity|dielectric constant)\b/.test(
      text
    )
  );
}

function mentionsCapacitorState(text: string): boolean {
  return (
    (text.includes("capacitor") || text.includes("dielectric")) &&
    /\b(battery|disconnect|connected|constant charge|constant voltage|charge stays|voltage stays|energy decreases|energy increases)\b/.test(
      text
    )
  );
}

function mentionsCapacitorNetwork(text: string): boolean {
  return (
    /\bcapacitors?\b/.test(text) &&
    /\b(series|parallel|equivalent capacitance|reciprocal|network)\b/.test(text)
  );
}

function mentionsParallelPlateField(text: string): boolean {
  return (
    /\b(capacitor|parallel plates?|plates)\b/.test(text) &&
    /\b(electric field|voltage|potential|charge)\b/.test(text)
  );
}

function visualFingerprint(visual: VisualBlock): string {
  return `${visual.templateId}:${stableStringify(fingerprintableParameters(visual.parameters))}`;
}

function fingerprintableParameters(parameters: Record<string, unknown>): Record<string, unknown> {
  const rest = { ...parameters };
  delete rest.imageDataUrl;
  delete rest.mimeType;
  return rest;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
