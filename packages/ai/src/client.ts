import { realpathSync } from "node:fs";
import type {
  ChatAddToolOutputFunction,
  ChatOnToolCallCallback,
  UIMessage,
} from "ai";
import type { z } from "zod";
import {
  toolInputSchemas,
  toolOutputSchemas,
  type ToolName,
} from "./tools/schemas";
import {
  bash,
  editFile,
  grep,
  listDirectory,
  readFile,
  writeFile,
} from "./tools/runners";

export { resolveWithinWorkspace } from "./workspace";
export { bash, editFile, grep, listDirectory, readFile, writeFile } from "./tools/runners";

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

// Factory for `useChat`'s `onToolCall`. `addToolOutput` only exists *after*
// `useChat` returns, but we need `onToolCall` *before* it's called — so we
// take a getter the caller wires to a ref. Standard React pattern.
export function createOnToolCall<UI_MESSAGE extends UIMessage>({
  workspaceRoot,
  getAddToolOutput,
}: {
  workspaceRoot: string;
  getAddToolOutput: () => ChatAddToolOutputFunction<UI_MESSAGE>;
}): ChatOnToolCallCallback<UI_MESSAGE> {
  const runTool = createRunTool({ workspaceRoot });

  return async function onToolCall({ toolCall }) {
    // Required for type narrowing per AI SDK docs — without this,
    // toolCall.toolName widens to string and addToolOutput rejects it.
    if (toolCall.dynamic) return;

    const addToolOutput = getAddToolOutput();
    try {
      const output = await runTool(toolCall.toolName, toolCall.input);
      // No await — avoids potential deadlocks per AI SDK guidance.
      addToolOutput({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output,
      });
    } catch (err) {
      addToolOutput({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        state: "output-error",
        errorText: err instanceof Error ? err.message : String(err),
      });
    }
  };
}
