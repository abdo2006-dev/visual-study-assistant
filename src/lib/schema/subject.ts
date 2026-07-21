import { z } from "zod";

export const subjectSchema = z.enum([
  "physics",
  "chemistry",
  "biology",
  "mathematics",
  "engineering",
  "other",
]);

export type Subject = z.infer<typeof subjectSchema>;
