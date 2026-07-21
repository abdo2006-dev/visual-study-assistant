import { LESSON_SCHEMA_VERSION, type VisualLesson } from "@/lib/schema/lesson";

/**
 * A hand-written stand-in for what Milestone 3's AI lesson-planning pipeline
 * will produce. Used to exercise the local library (storage, library list,
 * workspace view, export/import) before real AI generation exists. Visuals
 * are intentionally empty — the visual template registry lands in
 * Milestone 5.
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
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}
