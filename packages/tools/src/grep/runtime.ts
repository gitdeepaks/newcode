import { resolveWithinWorkspace } from "../resolve-within-workspace";
import type { GrepInput, GrepOutput } from "./schema";

const MAX_MATCHES = 500;

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
    if (matches.length >= MAX_MATCHES) {
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
