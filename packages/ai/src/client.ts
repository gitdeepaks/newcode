import { realpathSync } from "node:fs";
import type {
  ChatAddToolOutputFunction,
  ChatOnToolCallCallback,
  UIMessage,
} from "ai";
import { validateUIMessages } from "ai";
import type { Mode } from "./modes";
import type { ToolOutput } from "./tools/definition";
import { allCodingTools, getCodingToolHandlersForMode } from "./tools/registry";
import { isToolName, toolSpecs, type ToolName } from "./tools/specs";

export { resolveWithinWorkspace } from "./workspace";
export { bash, deleteFile, editFile, gitDiff, gitStatus, glob, grep, listDirectory, readFile, writeFile } from "./tools/runners";

export type RunTool = {
  <T extends ToolName>(
    name: T,
    input: unknown,
  ): Promise<ToolOutput<(typeof toolSpecs)[T]>>;
  (name: string, input: unknown): Promise<unknown>;
};

// Capture the canonical (realpath'd) workspace root once at CLI startup.
// Runtimes get a `runTool(name, input)` closure with that root baked in;
// the resolver only needs to do a prefix check from here on.
export function createRunTool({
  workspaceRoot,
  mode,
}: {
  workspaceRoot: string;
  mode: Mode;
}): RunTool {
  const root = realpathSync(workspaceRoot);
  const toolHandlers = getCodingToolHandlersForMode(mode);

  function runTool<T extends ToolName>(
    name: T,
    input: unknown,
  ): Promise<ToolOutput<(typeof toolSpecs)[T]>>;
  function runTool(name: string, input: unknown): Promise<unknown>;
  async function runTool(name: string, input: unknown): Promise<unknown> {
    if (!isToolName(name)) {
      throw new Error(`Unknown tool: ${name}`);
    }

    if (!(name in toolHandlers)) {
      throw new Error(`Tool ${name} is not available in ${mode} mode`);
    }

    const toolHandler = toolHandlers[name];
    if (!toolHandler) {
      throw new Error(`Tool ${name} is not available in ${mode} mode`);
    }

    return toolHandler(root, input);
  }

  return runTool;
}

export async function validateCodingAgentMessages<UI_MESSAGE extends UIMessage>(
  messages: unknown[],
): Promise<UI_MESSAGE[]> {
  if (messages.length === 0) {
    return [];
  }

  return validateUIMessages<UI_MESSAGE>({ messages, tools: allCodingTools });
}

// Factory for `useChat`'s `onToolCall`. `addToolOutput` only exists *after*
// `useChat` returns, but we need `onToolCall` *before* it's called — so we
// take a getter the caller wires to a ref. Standard React pattern.
export function createOnToolCall<UI_MESSAGE extends UIMessage>({
  workspaceRoot,
  mode,
  getAddToolOutput,
}: {
  workspaceRoot: string;
  mode: Mode;
  getAddToolOutput: () => ChatAddToolOutputFunction<UI_MESSAGE>;
}): ChatOnToolCallCallback<UI_MESSAGE> {
  const runTool = createRunTool({ workspaceRoot, mode });

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
