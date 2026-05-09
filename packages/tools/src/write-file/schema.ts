import { tool } from "ai";
import { z } from "zod";

export const writeFileInput = z.object({
  path: z
    .string()
    .min(1)
    .describe(
      "Path to the file, relative to the workspace root or absolute. Must resolve inside the workspace. Parent directories are created automatically.",
    ),
  content: z
    .string()
    .describe("Full file contents to write. Overwrites any existing file."),
});

export const writeFileOutput = z.object({
  bytesWritten: z.number().int().min(0),
});

export const writeFile = tool({
  description:
    "Write a file inside the workspace, creating parent directories if needed. Overwrites existing files. Prefer `edit_file` for small changes to large files.",
  inputSchema: writeFileInput,
  outputSchema: writeFileOutput,
});

export type WriteFileInput = z.infer<typeof writeFileInput>;
export type WriteFileOutput = z.infer<typeof writeFileOutput>;
