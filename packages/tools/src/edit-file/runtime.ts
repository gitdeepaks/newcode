import {
  readFile as fsReadFile,
  writeFile as fsWriteFile,
} from "node:fs/promises";
import { resolveWithinWorkspace } from "../resolve-within-workspace";
import type { EditFileInput, EditFileOutput } from "./schema";

export async function editFile(
  workspaceRoot: string,
  input: EditFileInput,
): Promise<EditFileOutput> {
  const abs = resolveWithinWorkspace(workspaceRoot, input.path);
  const original = await fsReadFile(abs, "utf8");

  const occurrences = countOccurrences(original, input.oldString);
  if (occurrences === 0) {
    throw new Error(`oldString not found in ${input.path}`);
  }
  if (occurrences > 1 && !input.replaceAll) {
    throw new Error(
      `oldString matches ${occurrences} locations in ${input.path}; pass replaceAll: true or supply a unique oldString`,
    );
  }

  const updated = input.replaceAll
    ? original.split(input.oldString).join(input.newString)
    : original.replace(input.oldString, input.newString);

  await fsWriteFile(abs, updated, "utf8");
  return { replacements: input.replaceAll ? occurrences : 1 };
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let from = 0;
  while (true) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) return count;
    count++;
    from = idx + needle.length;
  }
}
