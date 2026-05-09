import { tool } from "ai";
import { z } from "zod";

export const listDirectoryInput = z.object({
  path: z
    .string()
    .min(1)
    .describe(
      "Directory path, relative to the workspace root or absolute. Must resolve inside the workspace.",
    ),
  recursive: z
    .boolean()
    .optional()
    .describe(
      "If true, walk the directory tree. Capped at 1000 entries. Defaults to false.",
    ),
});

export const directoryEntry = z.object({
  name: z.string(),
  type: z.enum(["file", "directory", "symlink", "other"]),
  size: z.number().int().min(0).optional(),
});

export const listDirectoryOutput = z.object({
  entries: z.array(directoryEntry),
  truncated: z.boolean(),
});

export const listDirectory = tool({
  description:
    "List the contents of a directory inside the workspace. Use `recursive: true` for a tree walk (capped at 1000 entries).",
  inputSchema: listDirectoryInput,
  outputSchema: listDirectoryOutput,
});

export type ListDirectoryInput = z.infer<typeof listDirectoryInput>;
export type ListDirectoryOutput = z.infer<typeof listDirectoryOutput>;
