import type { AiToolMap, ToolHandlerMap } from "./definition";
import { getModeConfig, type Mode } from "../modes";
import { defineAiTool, defineToolHandler } from "./definition";
import { bash, deleteFile, editFile, gitDiff, gitStatus, glob, grep, listDirectory, readFile, writeFile } from "./runners";
import { toolSpecs } from "./specs";

export const allCodingTools = {
  read_file: defineAiTool(toolSpecs.read_file),
  write_file: defineAiTool(toolSpecs.write_file),
  delete_file: defineAiTool(toolSpecs.delete_file),
  edit_file: defineAiTool(toolSpecs.edit_file),
  list_directory: defineAiTool(toolSpecs.list_directory),
  glob: defineAiTool(toolSpecs.glob),
  grep: defineAiTool(toolSpecs.grep),
  git_status: defineAiTool(toolSpecs.git_status),
  git_diff: defineAiTool(toolSpecs.git_diff),
  bash: defineAiTool(toolSpecs.bash),
} satisfies AiToolMap<typeof toolSpecs>;

export const allCodingToolHandlers = {
  read_file: defineToolHandler(toolSpecs.read_file, readFile),
  write_file: defineToolHandler(toolSpecs.write_file, writeFile),
  delete_file: defineToolHandler(toolSpecs.delete_file, deleteFile),
  edit_file: defineToolHandler(toolSpecs.edit_file, editFile),
  list_directory: defineToolHandler(toolSpecs.list_directory, listDirectory),
  glob: defineToolHandler(toolSpecs.glob, glob),
  grep: defineToolHandler(toolSpecs.grep, grep),
  git_status: defineToolHandler(toolSpecs.git_status, gitStatus),
  git_diff: defineToolHandler(toolSpecs.git_diff, gitDiff),
  bash: defineToolHandler(toolSpecs.bash, bash),
} satisfies ToolHandlerMap<typeof toolSpecs>;

function pickToolEntries<TMap extends Record<string, unknown>>(
  source: TMap,
  allowedTools: readonly (keyof TMap & string)[],
) {
  const picked: Partial<TMap> = {};

  for (const toolName of allowedTools) {
    picked[toolName] = source[toolName];
  }

  return picked;
}

export function getCodingToolsForMode(mode: Mode) {
  return pickToolEntries(allCodingTools, getModeConfig(mode).allowedTools);
}

export function getCodingToolHandlersForMode(mode: Mode) {
  return pickToolEntries(allCodingToolHandlers, getModeConfig(mode).allowedTools);
}
