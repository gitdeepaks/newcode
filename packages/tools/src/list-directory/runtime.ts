import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { resolveWithinWorkspace } from "../resolve-within-workspace";
import type { ListDirectoryInput, ListDirectoryOutput } from "./schema";

const MAX_ENTRIES = 1000;

type Entry = ListDirectoryOutput["entries"][number];

export async function listDirectory(
  workspaceRoot: string,
  input: ListDirectoryInput,
): Promise<ListDirectoryOutput> {
  const root = resolveWithinWorkspace(workspaceRoot, input.path);
  const entries: Entry[] = [];
  let truncated = false;

  if (input.recursive) {
    const queue: string[] = [root];
    while (queue.length > 0 && entries.length < MAX_ENTRIES) {
      const dir = queue.shift() as string;
      const dirents = await readdir(dir, { withFileTypes: true });
      for (const dirent of dirents) {
        if (entries.length >= MAX_ENTRIES) {
          truncated = true;
          break;
        }
        const full = path.join(dir, dirent.name);
        const entry = await toEntry(full, dirent.name, root);
        entries.push(entry);
        if (entry.type === "directory") {
          queue.push(full);
        }
      }
    }
    if (queue.length > 0) {
      truncated = true;
    }
  } else {
    const dirents = await readdir(root, { withFileTypes: true });
    for (const dirent of dirents) {
      if (entries.length >= MAX_ENTRIES) {
        truncated = true;
        break;
      }
      const full = path.join(root, dirent.name);
      entries.push(await toEntry(full, dirent.name, root));
    }
  }

  return { entries, truncated };
}

async function toEntry(
  full: string,
  name: string,
  root: string,
): Promise<Entry> {
  const display = path.relative(root, full) || name;
  try {
    const s = await stat(full);
    if (s.isDirectory()) return { name: display, type: "directory" };
    if (s.isFile()) return { name: display, type: "file", size: s.size };
    if (s.isSymbolicLink()) return { name: display, type: "symlink" };
    return { name: display, type: "other" };
  } catch {
    return { name: display, type: "other" };
  }
}
