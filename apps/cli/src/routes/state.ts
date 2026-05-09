import { z } from "zod";

export const chatLocationStateSchema = z
  .object({
    prompt: z.string().default(""),
  })
  .catch({ prompt: "" });

export type ChatLocationState = z.infer<typeof chatLocationStateSchema>;
