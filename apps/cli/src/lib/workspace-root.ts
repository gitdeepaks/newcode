import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

// Root scripts run the TUI with cwd=apps/cli for OpenTUI runtime resolution,
// but file tools should operate on the user's project root.
export const workspaceRoot = findWorkspaceRoot(process.cwd());

function findWorkspaceRoot(start: string): string {
  let current = start;
  while (true) {
    if (existsSync(join(current, ".git"))) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      return start;
    }
    current = parent;
  }
}
