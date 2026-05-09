import { tool } from "ai";
import { z } from "zod";

export const grepInput = z.object({
  pattern: z
    .string()
    .min(1)
    .describe("Regular expression to search for. Uses ripgrep regex syntax."),
  path: z
    .string()
    .optional()
    .describe(
      "File or directory to search in. Relative to workspace root or absolute. Defaults to the workspace root.",
    ),
  glob: z
    .string()
    .optional()
    .describe('Glob filter applied to file paths, e.g. "*.ts" or "**/*.tsx".'),
  caseInsensitive: z
    .boolean()
    .optional()
    .describe("Case-insensitive search. Defaults to false."),
});

export const grepMatch = z.object({
  path: z.string(),
  line: z.number().int().min(1),
  text: z.string(),
});

export const grepOutput = z.object({
  matches: z.array(grepMatch),
  truncated: z.boolean(),
});

export const grep = tool({
  description:
    "Search for a regex pattern across files inside the workspace. Returns matching file paths, line numbers, and matched lines (capped).",
  inputSchema: grepInput,
  outputSchema: grepOutput,
});

export type GrepInput = z.infer<typeof grepInput>;
export type GrepOutput = z.infer<typeof grepOutput>;
