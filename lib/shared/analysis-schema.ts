import { z } from "zod";

export const analysisSchema = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  score: z.number().min(0).max(1).describe("置信度，0到1之间的正数"),
  reasoning: z.string().describe('详细的逻辑推理过程'),
  summary: z.string(),
});
