import { z } from "zod";

export const generatedIllustrationParamsSchema = z.object({
  imagePrompt: z.string().min(20),
  caption: z.string().min(1).optional(),
  imageDataUrl: z
    .string()
    .regex(/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/)
    .optional(),
  mimeType: z.string().regex(/^image\/(png|jpeg|jpg|webp)$/).optional(),
});

export type GeneratedIllustrationParams = z.infer<
  typeof generatedIllustrationParamsSchema
>;
