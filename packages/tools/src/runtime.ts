// Runtime barrel. CLI-only: pulls in node:fs, node:path, Bun.spawn. The
// server must NOT import from here — its bundle would gain Node-FS
// dependencies it never executes (no `execute` runs server-side).

import { realpathSync } from "node:fs";
import type { z } from "zod";
import { toolInputSchemas, toolOutputSchemas, type ToolName } from "./index";
import { bash } from "./bash/runtime";
import { editFile } from "./edit-file/runtime";
import { grep } from "./grep/runtime";
import { listDirectory } from "./list-directory/runtime";
import { readFile } from "./read-file/runtime";
import { writeFile } from "./write-file/runtime";

export { bash } from "./bash/runtime";
export { editFile } from "./edit-file/runtime";
export { grep } from "./grep/runtime";
export { listDirectory } from "./list-directory/runtime";
export { readFile } from "./read-file/runtime";
export { writeFile } from "./write-file/runtime";
export { resolveWithinWorkspace } from "./resolve-within-workspace";

type ToolInput<T extends ToolName> = z.infer<(typeof toolInputSchemas)[T]>;
type ToolOutput<T extends ToolName> = z.infer<(typeof toolOutputSchemas)[T]>;

type Executors = {
  [K in ToolName]: (
    workspaceRoot: string,
    input: ToolInput<K>,
  ) => Promise<ToolOutput<K>>;
};

const executors: Executors = {
  read_file: readFile,
  write_file: writeFile,
  edit_file: editFile,
  list_directory: listDirectory,
  grep,
  bash,
};

function isToolName(name: string): name is ToolName {
  return name in executors;
}

export type RunTool = {
  <T extends ToolName>(name: T, input: unknown): Promise<ToolOutput<T>>;
  (name: string, input: unknown): Promise<unknown>;
};

// Capture the canonical (realpath'd) workspace root once at CLI startup.
// Runtimes get a `runTool(name, input)` closure with that root baked in;
// the resolver only needs to do a prefix check from here on.
export function createRunTool({
  workspaceRoot,
}: {
  workspaceRoot: string;
}): RunTool {
  const root = realpathSync(workspaceRoot);

  async function runTool(name: string, input: unknown): Promise<unknown> {
    if (!isToolName(name)) {
      throw new Error(`Unknown tool: ${name}`);
    }
    const parsedInput = toolInputSchemas[name].parse(input);
    const executor = executors[name] as (
      r: string,
      i: unknown,
    ) => Promise<unknown>;
    const output = await executor(root, parsedInput);
    return toolOutputSchemas[name].parse(output);
  }

  return runTool as RunTool;
}
