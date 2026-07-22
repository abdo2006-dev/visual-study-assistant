import { LESSON_SCHEMA_VERSION, type VisualLesson } from "@/lib/schema/lesson";

/**
 * A hand-written stand-in for what the AI lesson-planning pipeline
 * produces. Used to exercise the local library (storage, library list,
 * workspace view, export/import) without spending Gemini quota, and to
 * demonstrate the radial-charged-sphere visual template with a fixed,
 * hand-picked visual rather than one chosen by the visual-planning AI pass
 * (see lessonPlanService.ts).
 */
export function createChargedSphereMockLesson(): VisualLesson {
  const now = new Date().toISOString();

  return {
    schemaVersion: LESSON_SCHEMA_VERSION,
    id: crypto.randomUUID(),
    title: "Potential of a Uniformly Charged Solid Sphere",
    subject: "physics",
    topic: "Electrostatics",
    source: { kind: "mock" },
    summary:
      "A solid insulating sphere carries charge spread uniformly through its volume. The electric field and potential behave differently inside and outside the sphere, and both are continuous at the surface.",
    prerequisites: ["Gauss's law", "Electric field of a point charge"],
    learningObjectives: [
      "State how the field magnitude depends on radius inside and outside the sphere",
      "Explain why the potential is continuous at the surface",
      "Set up the potential integral as a two-region path",
    ],
    sections: [
      {
        id: "region-inside",
        heading: "Inside the sphere (r < R)",
        sourceText:
          "Because the charge is distributed uniformly throughout the volume, only the charge enclosed within radius r contributes to the field at r, per Gauss's law.",
        simplifiedExplanation:
          "Picture the sphere as packed with many small charges. At a point inside, only the charge closer to the center than your point matters — the field grows as you move outward, reaching its largest value right at the surface.",
        importantTerms: [
          {
            term: "Gaussian surface",
            definition:
              "An imaginary sphere of radius r used to apply Gauss's law at the observation point.",
          },
        ],
        equations: [
          {
            id: "field-inside",
            latex: "E(r) = \\dfrac{kQr}{R^3}",
            plainLanguageReading:
              "The field inside grows in direct proportion to the distance from the center.",
            symbols: [
              { symbol: "Q", meaning: "total charge on the sphere" },
              { symbol: "R", meaning: "sphere radius" },
              { symbol: "r", meaning: "distance from center to observation point" },
            ],
            appliesWhen: "r < R",
          },
        ],
        visuals: [],
        curiosityQuestions: [],
      },
      {
        id: "region-outside",
        heading: "Outside the sphere (r > R)",
        sourceText:
          "Outside the sphere, all of the charge is enclosed by the Gaussian surface, so the sphere behaves exactly like a point charge Q located at the center.",
        simplifiedExplanation:
          "Once you're outside, it no longer matters that the charge is spread through a volume — from out here, it looks just like a single point of charge at the center.",
        importantTerms: [],
        equations: [
          {
            id: "field-outside",
            latex: "E(r) = \\dfrac{kQ}{r^2}",
            plainLanguageReading:
              "The field outside falls off with the square of the distance, same as a point charge.",
            symbols: [
              { symbol: "Q", meaning: "total charge on the sphere" },
              { symbol: "r", meaning: "distance from center to observation point" },
            ],
            appliesWhen: "r > R",
          },
        ],
        visuals: [],
        curiosityQuestions: [
          {
            id: "why-outside-looks-like-point-charge",
            type: "why",
            question:
              "Why does the sphere behave exactly like a point charge from outside, even though the charge is spread through a volume?",
            answer:
              "Gauss's law only depends on how much charge is enclosed by the Gaussian surface at radius r, not on how that charge is arranged inside it. For any r > R, the entire charge Q is enclosed, so the enclosed charge is identical to the case where all of Q sits at a single point at the center — Gauss's law then gives the exact same field either way.",
          },
        ],
      },
      {
        id: "continuity-at-surface",
        heading: "Continuity at the boundary",
        sourceText:
          "The potential must be continuous at r = R, so the potential integral is split into two regions: from infinity to R using the outside field, then from R to r using the inside field.",
        simplifiedExplanation:
          "The two formulas have to agree exactly at the surface, or the potential would jump discontinuously — which can't happen physically. That's why computing the potential inside means integrating in from infinity to the surface first, then continuing inward.",
        importantTerms: [],
        equations: [
          {
            id: "potential-continuity",
            latex: "V(R^-) = V(R^+)",
            plainLanguageReading:
              "The potential just inside the surface equals the potential just outside it.",
            symbols: [],
            appliesWhen: "r = R",
          },
        ],
        visuals: [],
        curiosityQuestions: [
          {
            id: "why-potential-must-be-continuous",
            type: "why",
            question: "Why must the potential be continuous at r = R instead of possibly jumping?",
            answer:
              "The electric field is the rate of change of the potential, so a jump in potential right at r = R would mean an infinite field at that single radius. An infinite field there would require an infinite surface charge concentrated exactly at r = R, which isn't present in this uniformly charged sphere — so the potential can't actually jump.",
          },
        ],
      },
      {
        id: "interactive-exploration",
        heading: "Explore it yourself",
        sourceText: "",
        simplifiedExplanation:
          "Drag the slider to move the observation point from the center out past the sphere, and watch the field arrows, Gaussian surface, and equations update to match.",
        importantTerms: [],
        equations: [],
        visuals: [
          {
            id: "sphere-visual",
            type: "scientific-diagram",
            templateId: "radial-charged-sphere",
            title: "Field and potential of a uniformly charged solid sphere",
            educationalPurpose:
              "Lets a student see how the field and potential formulas change as the observation point crosses the sphere's surface.",
            accessibilityDescription:
              "An interactive diagram of a charged sphere with a slider that moves an observation point from the center outward, updating field arrows, a Gaussian surface, and the field and potential equations to match the current region.",
            parameters: {
              sphereType: "solid-insulator",
              chargeSign: "positive",
              showGaussianSurface: true,
              showFieldVectors: true,
              showIntegralPath: true,
              showPotentialPlot: true,
              initialObservationRadiusRatio: 0.6,
            },
            controls: ["radius-slider"],
            annotations: [],
            sourceSectionId: "interactive-exploration",
            factualChecks: [],
            generationStatus: "ready",
          },
        ],
        curiosityQuestions: [],
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}
