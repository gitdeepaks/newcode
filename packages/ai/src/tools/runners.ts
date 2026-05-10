import {
  mkdir,
  readFile as fsReadFile,
  readdir,
  stat,
  writeFile as fsWriteFile,
} from "node:fs/promises";
import path from "node:path";
import { resolveWithinWorkspace } from "../workspace";
import type {
  BashInput,
  BashOutput,
  EditFileInput,
  EditFileOutput,
  GrepInput,
  GrepOutput,
  ListDirectoryInput,
  ListDirectoryOutput,
  ReadFileInput,
  ReadFileOutput,
  WriteFileInput,
  WriteFileOutput,
} from "./specs";

// read_file ------------------------------------------------------------------

// Tight defaults to keep multi-step loops inside the 30k ITPM budget. Model
// can request more via offset/limit when it actually needs the rest.
const READ_DEFAULT_LIMIT = 120;
const READ_MAX_BYTES = 6 * 1024;

export async function readFile(
  workspaceRoot: string,
  input: ReadFileInput,
): Promise<ReadFileOutput> {
  const abs = resolveWithinWorkspace(workspaceRoot, input.path);
  const raw = await fsReadFile(abs, "utf8");

  const lines = raw.split("\n");
  const totalLines = lines.length;
  const offset = input.offset ?? 0;
  const limit = input.limit ?? READ_DEFAULT_LIMIT;

  const slice = lines.slice(offset, offset + limit);
  let truncated = offset + limit < totalLines || offset > 0;
  let content = slice.join("\n");

  if (content.length > READ_MAX_BYTES) {
    content = content.slice(0, READ_MAX_BYTES);
    truncated = true;
  }

  return { content, totalLines, truncated };
}

// write_file -----------------------------------------------------------------

export async function writeFile(
  workspaceRoot: string,
  input: WriteFileInput,
): Promise<WriteFileOutput> {
  const abs = resolveWithinWorkspace(workspaceRoot, input.path);
  await mkdir(path.dirname(abs), { recursive: true });
  await fsWriteFile(abs, input.content, "utf8");
  return { bytesWritten: Buffer.byteLength(input.content, "utf8") };
}

// edit_file ------------------------------------------------------------------

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

// list_directory -------------------------------------------------------------

const LIST_MAX_ENTRIES = 1000;

type ListEntry = ListDirectoryOutput["entries"][number];

export async function listDirectory(
  workspaceRoot: string,
  input: ListDirectoryInput,
): Promise<ListDirectoryOutput> {
  const root = resolveWithinWorkspace(workspaceRoot, input.path);
  const entries: ListEntry[] = [];
  let truncated = false;

  if (input.recursive) {
    const queue: string[] = [root];
    while (queue.length > 0 && entries.length < LIST_MAX_ENTRIES) {
      const dir = queue.shift();
      if (dir === undefined) {
        break;
      }
      const dirents = await readdir(dir, { withFileTypes: true });
      for (const dirent of dirents) {
        if (entries.length >= LIST_MAX_ENTRIES) {
          truncated = true;
          break;
        }
        const full = path.join(dir, dirent.name);
        const entry = await toListEntry(full, dirent.name, root);
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
      if (entries.length >= LIST_MAX_ENTRIES) {
        truncated = true;
        break;
      }
      const full = path.join(root, dirent.name);
      entries.push(await toListEntry(full, dirent.name, root));
    }
  }

  return { entries, truncated };
}

async function toListEntry(
  full: string,
  name: string,
  root: string,
): Promise<ListEntry> {
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

// grep -----------------------------------------------------------------------

const GREP_MAX_MATCHES = 500;

export async function grep(
  workspaceRoot: string,
  input: GrepInput,
): Promise<GrepOutput> {
  const target = input.path
    ? resolveWithinWorkspace(workspaceRoot, input.path)
    : workspaceRoot;

  const args = [
    "--line-number",
    "--no-heading",
    "--color=never",
    "--max-count=50",
  ];
  if (input.caseInsensitive) args.push("--ignore-case");
  if (input.glob) args.push("--glob", input.glob);
  args.push("--", input.pattern, target);

  const proc = Bun.spawn(["rg", ...args], {
    cwd: workspaceRoot,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  // ripgrep exits 1 when there are no matches — that's not an error.
  if (exitCode !== 0 && exitCode !== 1) {
    throw new Error(stderr.trim() || `ripgrep exited with code ${exitCode}`);
  }

  const matches: GrepOutput["matches"] = [];
  let truncated = false;
  for (const raw of stdout.split("\n")) {
    if (!raw) continue;
    if (matches.length >= GREP_MAX_MATCHES) {
      truncated = true;
      break;
    }
    const parsed = parseRgLine(raw);
    if (parsed) matches.push(parsed);
  }

  return { matches, truncated };
}

function parseRgLine(line: string): GrepOutput["matches"][number] | null {
  // Format: "path:line:text"
  const firstColon = line.indexOf(":");
  if (firstColon === -1) return null;
  const secondColon = line.indexOf(":", firstColon + 1);
  if (secondColon === -1) return null;
  const path = line.slice(0, firstColon);
  const lineNumber = Number(line.slice(firstColon + 1, secondColon));
  if (!Number.isInteger(lineNumber) || lineNumber < 1) return null;
  const text = line.slice(secondColon + 1);
  return { path, line: lineNumber, text };
}

// bash -----------------------------------------------------------------------

const BASH_DEFAULT_TIMEOUT_MS = 60_000;
const BASH_MAX_BYTES = 64 * 1024;

export async function bash(
  workspaceRoot: string,
  input: BashInput,
): Promise<BashOutput> {
  const timeoutMs = input.timeoutMs ?? BASH_DEFAULT_TIMEOUT_MS;

  const proc = Bun.spawn(["bash", "-c", input.command], {
    cwd: workspaceRoot,
    stdout: "pipe",
    stderr: "pipe",
  });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill("SIGKILL");
  }, timeoutMs);

  try {
    const [stdoutRaw, stderrRaw, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    const stdout = capBashBytes(stdoutRaw);
    const stderr = capBashBytes(stderrRaw);
    const truncated = stdout.truncated || stderr.truncated;

    return {
      stdout: stdout.text,
      stderr: stderr.text,
      exitCode,
      truncated,
      timedOut,
    };
  } finally {
    clearTimeout(timer);
  }
}

function capBashBytes(text: string): { text: string; truncated: boolean } {
  if (Buffer.byteLength(text, "utf8") <= BASH_MAX_BYTES) {
    return { text, truncated: false };
  }
  const buf = Buffer.from(text, "utf8").subarray(0, BASH_MAX_BYTES);
  return { text: buf.toString("utf8"), truncated: true };
}
