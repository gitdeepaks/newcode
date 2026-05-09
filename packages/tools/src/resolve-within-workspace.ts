import path from "node:path";

// Single-purpose guardrail. Every FS tool calls this first; no exceptions.
//
// `workspaceRoot` is expected to already be realpath'd by the caller (the
// factory does this once at CLI startup), so a simple prefix check is enough
// to stop "../../etc/passwd"-style escapes. We do not try to defeat symlinks
// inside the workspace — a coding agent with `bash` can read anywhere
// anyway, so pretending otherwise would be theatre.
export function resolveWithinWorkspace(
  workspaceRoot: string,
  input: string,
): string {
  const resolved = path.resolve(workspaceRoot, input);
  if (
    resolved !== workspaceRoot &&
    !resolved.startsWith(workspaceRoot + path.sep)
  ) {
    throw new Error(`Path escapes workspace: ${input}`);
  }
  return resolved;
}
