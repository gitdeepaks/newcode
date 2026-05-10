import type { AiToolMap, ToolHandlerMap } from "./definition";
import { defineAiTool, defineToolHandler } from "./definition";
import { bash, editFile, grep, listDirectory, readFile, writeFile } from "./runners";
import { toolSpecs } from "./specs";

export const tools = {
  read_file: defineAiTool(toolSpecs.read_file),
  write_file: defineAiTool(toolSpecs.write_file),
  edit_file: defineAiTool(toolSpecs.edit_file),
  list_directory: defineAiTool(toolSpecs.list_directory),
  grep: defineAiTool(toolSpecs.grep),
  bash: defineAiTool(toolSpecs.bash),
} satisfies AiToolMap<typeof toolSpecs>;

export const toolHandlers = {
  read_file: defineToolHandler(toolSpecs.read_file, readFile),
  write_file: defineToolHandler(toolSpecs.write_file, writeFile),
  edit_file: defineToolHandler(toolSpecs.edit_file, editFile),
  list_directory: defineToolHandler(toolSpecs.list_directory, listDirectory),
  grep: defineToolHandler(toolSpecs.grep, grep),
  bash: defineToolHandler(toolSpecs.bash, bash),
} satisfies ToolHandlerMap<typeof toolSpecs>;
