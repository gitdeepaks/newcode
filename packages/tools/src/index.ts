// Schema-only barrel. Server-safe: no node:fs, no Bun.spawn, no Node-specific
// runtime. Importing this from the CLI is fine too — but FS execution lives
// in `@newcode/tools/runtime`.

import { bash, bashInput, bashOutput } from "./bash/schema";
import { editFile, editFileInput, editFileOutput } from "./edit-file/schema";
import { grep, grepInput, grepOutput } from "./grep/schema";
import {
  listDirectory,
  listDirectoryInput,
  listDirectoryOutput,
} from "./list-directory/schema";
import { readFile, readFileInput, readFileOutput } from "./read-file/schema";
import { writeFile, writeFileInput, writeFileOutput } from "./write-file/schema";

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

export * from "./bash/schema";
export * from "./edit-file/schema";
export * from "./grep/schema";
export * from "./list-directory/schema";
export * from "./read-file/schema";
export * from "./write-file/schema";
