import { readFile as fsReadFile } from "node:fs/promises";
import { resolveWithinWorkspace } from "../resolve-within-workspace";
import type { ReadFileInput, ReadFileOutput } from "./schema";

// Tight defaults to keep multi-step loops inside the 30k ITPM budget. Model
// can request more via offset/limit when it actually needs the rest.
const DEFAULT_LIMIT = 200;
const MAX_BYTES = 16 * 1024;

export async function readFile(
  workspaceRoot: string,
  input: ReadFileInput,
): Promise<ReadFileOutput> {
  const abs = resolveWithinWorkspace(workspaceRoot, input.path);
  const raw = await fsReadFile(abs, "utf8");

  const lines = raw.split("\n");
  const totalLines = lines.length;
  const offset = input.offset ?? 0;
  const limit = input.limit ?? DEFAULT_LIMIT;

  const slice = lines.slice(offset, offset + limit);
  let truncated = offset + limit < totalLines || offset > 0;
  let content = slice.join("\n");

  if (content.length > MAX_BYTES) {
    content = content.slice(0, MAX_BYTES);
    truncated = true;
  }

  return { content, totalLines, truncated };
}
