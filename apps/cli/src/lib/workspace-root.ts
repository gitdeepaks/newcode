// Captured once at process start so every tool executor sees the same root,
// even if some library mutates `process.cwd()` later.
export const workspaceRoot = process.cwd();
