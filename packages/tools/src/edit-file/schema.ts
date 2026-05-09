import { tool } from "ai";
import { z } from "zod";

export const editFileInput = z.object({
  path: z
    .string()
    .min(1)
    .describe("Path to the file to edit. Must resolve inside the workspace."),
  oldString: z
    .string()
    .min(1)
    .describe(
      "Exact text to replace. Must match the file verbatim, including whitespace. Must be unique in the file unless `replaceAll` is true.",
    ),
  newString: z.string().describe("Text to replace `oldString` with."),
  replaceAll: z
    .boolean()
    .optional()
    .describe(
      "If true, replace every occurrence of `oldString`. Defaults to false.",
    ),
});

export const editFileOutput = z.object({
  replacements: z.number().int().min(0),
});

export const editFile = tool({
  description:
    "Replace an exact string in a file inside the workspace. Errors if `oldString` is not found, or if it appears more than once and `replaceAll` is false.",
  inputSchema: editFileInput,
  outputSchema: editFileOutput,
});

export type EditFileInput = z.infer<typeof editFileInput>;
export type EditFileOutput = z.infer<typeof editFileOutput>;
