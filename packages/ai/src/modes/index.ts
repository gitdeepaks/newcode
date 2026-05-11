import { z } from "zod";
import type { ToolName } from "../tools/specs";

type ModeDefinition<TName extends string = string> = {
  name: TName;
  label: string;
  instructions: {
    purpose: string;
    constraints: readonly string[];
  };
  allowedTools: readonly ToolName[];
};

function defineModeRegistry<
  const TModes extends readonly [ModeDefinition, ...ModeDefinition[]],
>(modes: TModes) {
  return modes;
}

export const modeRegistry = defineModeRegistry([
  {
    name: "build",
    label: "Build",
    instructions: {
      purpose:
        "Implement, modify, and verify code changes directly in the workspace.",
      constraints: [
        "Use the available tools to inspect, create, edit, delete, and verify project files as needed.",
        "Prefer the smallest correct change and verify the touched surface before finishing.",
      ],
    },
    allowedTools: [
      "read_file",
      "write_file",
      "delete_file",
      "edit_file",
      "list_directory",
      "grep",
      "bash",
    ] satisfies readonly ToolName[],
  },
  {
    name: "plan",
    label: "Plan",
    instructions: {
      purpose:
        "Investigate the codebase, reason about changes, and produce a safe implementation plan without modifying the workspace.",
      constraints: [
        "Read-only mode: do not write files, edit files, or run shell commands.",
        "Limit yourself to inspection, analysis, and concrete next-step recommendations.",
      ],
    },
    allowedTools: [
      "read_file",
      "list_directory",
      "grep",
    ] satisfies readonly ToolName[],
  },
] as const);

export type Mode = (typeof modeRegistry)[number]["name"];

const [defaultMode, ...otherModes] = modeRegistry;

export const DEFAULT_MODE = defaultMode.name;

export const modeSchema = z.enum([
  defaultMode.name,
  ...otherModes.map((mode) => mode.name),
] as [Mode, ...Mode[]]);

export function isMode(value: string): value is Mode {
  return modeRegistry.some((mode) => mode.name === value);
}

export function getModeConfig(mode: Mode) {
  const config = modeRegistry.find((entry) => entry.name === mode);
  if (!config) {
    throw new Error(`Unknown mode: ${mode}`);
  }
  return config;
}

export function getNextMode(mode: Mode): Mode {
  const currentIndex = modeRegistry.findIndex((entry) => entry.name === mode);
  if (currentIndex === -1) {
    return DEFAULT_MODE;
  }
  return modeRegistry[(currentIndex + 1) % modeRegistry.length].name;
}
