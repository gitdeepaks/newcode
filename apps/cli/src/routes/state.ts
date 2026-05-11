import { DEFAULT_MODE, modeSchema } from "newcode-ai";
import { z } from "zod";

export const chatLocationStateSchema = z
  .object({
    prompt: z.string().default(""),
    mode: modeSchema.default(DEFAULT_MODE),
  })
  .catch({ prompt: "", mode: DEFAULT_MODE });

export type ChatLocationState = z.infer<typeof chatLocationStateSchema>;
