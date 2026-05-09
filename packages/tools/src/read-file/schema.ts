import { tool } from "ai";
import { z } from "zod";

export const readFileInput = z.object({
  path: z
    .string()
    .min(1)
    .describe(
      "Path to the file, relative to the workspace root or absolute. Must resolve inside the workspace.",
    ),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Zero-based line number to start reading from."),
  limit: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      "Maximum number of lines to read from `offset`. Defaults to 200. Output is also capped at 16 KB; pass a larger `limit` together with `offset` if you need more.",
    ),
});

export const readFileOutput = z.object({
  content: z.string(),
  totalLines: z.number().int().min(0),
  truncated: z.boolean(),
});

export const readFile = tool({
  description:
    "Read the contents of a text file inside the workspace. Returns the file content along with whether the result was truncated.",
  inputSchema: readFileInput,
  outputSchema: readFileOutput,
});

export type ReadFileInput = z.infer<typeof readFileInput>;
export type ReadFileOutput = z.infer<typeof readFileOutput>;
