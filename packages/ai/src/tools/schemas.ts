import { tool } from "ai";
import { z } from "zod";

// read_file ------------------------------------------------------------------

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

// write_file -----------------------------------------------------------------

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

// edit_file ------------------------------------------------------------------

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

// list_directory -------------------------------------------------------------

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

// grep -----------------------------------------------------------------------

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

// bash -----------------------------------------------------------------------

export const bashInput = z.object({
  command: z
    .string()
    .min(1)
    .describe(
      "Shell command to run via `bash -c`. Executed with the workspace as the working directory.",
    ),
  timeoutMs: z
    .number()
    .int()
    .min(1)
    .max(300_000)
    .optional()
    .describe(
      "Hard timeout in milliseconds. Defaults to 60000. Maximum 300000.",
    ),
});

export const bashOutput = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number().int(),
  truncated: z.boolean(),
  timedOut: z.boolean(),
});

export const bash = tool({
  description:
    "Run a shell command via `bash -c` from the workspace root. The working directory is locked, but the shell itself can still read or write absolute paths outside the workspace — use with care. Stdout and stderr are each capped at 64 KB.",
  inputSchema: bashInput,
  outputSchema: bashOutput,
  // Cache breakpoint placed on the last tool in the set — Anthropic caches
  // everything before the breakpoint, so this single annotation caches the
  // system prompt + all tool schemas. Cached reads count at ~10% of normal
  // input rate against ITPM, which is the single biggest lever for the
  // 30k/min budget once the agent starts looping.
  providerOptions: {
    anthropic: { cacheControl: { type: "ephemeral" } },
  },
});

export type BashInput = z.infer<typeof bashInput>;
export type BashOutput = z.infer<typeof bashOutput>;

// Registry -------------------------------------------------------------------

export const tools = {
  read_file: readFile,
  write_file: writeFile,
  edit_file: editFile,
  list_directory: listDirectory,
  grep,
  bash,
} as const;

export type ToolName = keyof typeof tools;

export const toolInputSchemas = {
  read_file: readFileInput,
  write_file: writeFileInput,
  edit_file: editFileInput,
  list_directory: listDirectoryInput,
  grep: grepInput,
  bash: bashInput,
} as const;

export const toolOutputSchemas = {
  read_file: readFileOutput,
  write_file: writeFileOutput,
  edit_file: editFileOutput,
  list_directory: listDirectoryOutput,
  grep: grepOutput,
  bash: bashOutput,
} as const;
