import type { AiLessonPlan } from "@/lib/ai/gemini/prompts/lessonPlan";

export const validAiLessonPlan: AiLessonPlan = {
  title: "Newton's First Law",
  subject: "physics",
  topic: "Classical mechanics",
  summary: "An object at rest stays at rest unless acted on by a net force.",
  prerequisites: [],
  learningObjectives: ["State Newton's first law in your own words"],
  sections: [
    {
      heading: "Inertia",
      sourceText: "An object in motion stays in motion unless a force acts on it.",
      simplifiedExplanation:
        "Objects resist changes to their motion — that resistance is inertia.",
      importantTerms: [
        { term: "Inertia", definition: "An object's resistance to a change in motion." },
      ],
      equations: [
        {
          latex: "F = ma",
          plainLanguageReading: "Force equals mass times acceleration.",
          symbols: [
            { symbol: "F", meaning: "net force" },
            { symbol: "m", meaning: "mass" },
            { symbol: "a", meaning: "acceleration" },
          ],
        },
      ],
      curiosityQuestions: [],
    },
  ],
};
