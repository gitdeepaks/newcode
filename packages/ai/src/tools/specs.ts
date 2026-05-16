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
      "Maximum number of lines to read from `offset`. Defaults to 120. Output is also capped at 6 KB; pass a larger `limit` together with `offset` if you need more.",
    ),
});

export const readFileOutput = z.object({
  content: z.string(),
  totalLines: z.number().int().min(0),
  truncated: z.boolean(),
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

export type WriteFileInput = z.infer<typeof writeFileInput>;
export type WriteFileOutput = z.infer<typeof writeFileOutput>;

// delete_file ----------------------------------------------------------------

export const deleteFileInput = z.object({
  path: z
    .string()
    .min(1)
    .describe(
      "Path to the file to delete, relative to the workspace root or absolute. Must resolve inside the workspace.",
    ),
});

export const deleteFileOutput = z.object({
  deleted: z.literal(true),
});

export type DeleteFileInput = z.infer<typeof deleteFileInput>;
export type DeleteFileOutput = z.infer<typeof deleteFileOutput>;

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

export type ListDirectoryInput = z.infer<typeof listDirectoryInput>;
export type ListDirectoryOutput = z.infer<typeof listDirectoryOutput>;

// glob -----------------------------------------------------------------------

export const globInput = z.object({
  pattern: z
    .string()
    .min(1)
    .describe('Glob pattern to match file paths, e.g. "**/*.tsx", "apps/server/**/*.ts", or "package.json".'),
  path: z
    .string()
    .optional()
    .describe(
      "Directory to search in. Relative to workspace root or absolute. Defaults to the workspace root.",
    ),
});

export const globOutput = z.object({
  paths: z.array(z.string()),
  truncated: z.boolean(),
});

export type GlobInput = z.infer<typeof globInput>;
export type GlobOutput = z.infer<typeof globOutput>;

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

export type GrepInput = z.infer<typeof grepInput>;
export type GrepOutput = z.infer<typeof grepOutput>;

// git_status -----------------------------------------------------------------

export const gitStatusInput = z.object({}).default({});

export const gitStatusOutput = z.object({
  branch: z.string(),
  clean: z.boolean(),
  changed: z.array(z.string()),
  staged: z.array(z.string()),
  unstaged: z.array(z.string()),
  untracked: z.array(z.string()),
});

export type GitStatusInput = z.infer<typeof gitStatusInput>;
export type GitStatusOutput = z.infer<typeof gitStatusOutput>;

// git_diff -------------------------------------------------------------------

export const gitDiffInput = z.object({
  path: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Optional file or directory path to scope the diff. Relative to workspace root or absolute. Must resolve inside the workspace.",
    ),
  staged: z
    .boolean()
    .optional()
    .describe(
      "If true, inspect staged changes. Defaults to false for unstaged/working tree changes.",
    ),
}).default({});

export const gitDiffOutput = z.object({
  diff: z.string(),
  truncated: z.boolean(),
});

export type GitDiffInput = z.infer<typeof gitDiffInput>;
export type GitDiffOutput = z.infer<typeof gitDiffOutput>;

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

export type BashInput = z.infer<typeof bashInput>;
export type BashOutput = z.infer<typeof bashOutput>;

export const toolSpecs = {
  read_file: {
    description:
      "Read a text file inside the workspace. Defaults are intentionally small for token safety; use `offset` and `limit` to page through larger files.",
    inputSchema: readFileInput,
    outputSchema: readFileOutput,
  },
  write_file: {
    description:
      "Write a file inside the workspace, creating parent directories if needed. Overwrites existing files. Prefer `edit_file` for small changes to large files.",
    inputSchema: writeFileInput,
    outputSchema: writeFileOutput,
  },
  delete_file: {
    description:
      "Delete a file inside the workspace. This only removes files or symlinks; it does not remove directories.",
    inputSchema: deleteFileInput,
    outputSchema: deleteFileOutput,
  },
  edit_file: {
    description:
      "Replace an exact string in a file inside the workspace. Errors if `oldString` is not found, or if it appears more than once and `replaceAll` is false.",
    inputSchema: editFileInput,
    outputSchema: editFileOutput,
  },
  list_directory: {
    description:
      "List the contents of a directory inside the workspace. Use `recursive: true` for a tree walk (capped at 1000 entries).",
    inputSchema: listDirectoryInput,
    outputSchema: listDirectoryOutput,
  },
  glob: {
    description:
      'Find files inside the workspace by glob pattern using ripgrep file discovery when available, with a Bun glob fallback. Prefer this for file discovery over repeated list_directory calls. Returns workspace-relative paths when possible (capped). Examples: "**/*.tsx", "apps/server/**/*.ts", "package.json".',
    inputSchema: globInput,
    outputSchema: globOutput,
  },
  grep: {
    description:
      "Search for a regex pattern across files inside the workspace. Returns matching file paths, line numbers, and matched lines (capped).",
    inputSchema: grepInput,
    outputSchema: grepOutput,
  },
  git_status: {
    description:
      "Inspect the git worktree status from the workspace root. Read-only. Returns branch, clean/dirty state, and changed/staged/unstaged/untracked workspace-relative paths.",
    inputSchema: gitStatusInput,
    outputSchema: gitStatusOutput,
  },
  git_diff: {
    description:
      "Inspect git diff text from the workspace root. Read-only. Defaults to unstaged working tree changes; pass staged: true for staged changes. Output is capped for token safety.",
    inputSchema: gitDiffInput,
    outputSchema: gitDiffOutput,
  },
  bash: {
    description:
      "Run a shell command via `bash -c` from the workspace root. The working directory is locked, but the shell itself can still read or write absolute paths outside the workspace - use with care. Stdout and stderr are each capped at 64 KB.",
    inputSchema: bashInput,
    outputSchema: bashOutput,
    // Cache breakpoint placed on the last tool in the set. Anthropic caches
    // the system prompt + all tool schemas before this annotation.
    providerOptions: {
      anthropic: { cacheControl: { type: "ephemeral" } },
    },
  },
} as const;

export type ToolName = keyof typeof toolSpecs;

export function isToolName(name: string): name is ToolName {
  return name in toolSpecs;
}
