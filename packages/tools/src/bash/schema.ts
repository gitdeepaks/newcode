import { tool } from "ai";
import { z } from "zod";

export const bashInput = z.object({
  command: z
    .string()
    .min(1)
    .describe(
      "Shell command to run via `bash -c`. Executed with the workspace as the working directory.",
    ),
  timeoutMs: z
    .number()
    .int()
    .min(1)
    .max(300_000)
    .optional()
    .describe(
      "Hard timeout in milliseconds. Defaults to 60000. Maximum 300000.",
    ),
});

export const bashOutput = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number().int(),
  truncated: z.boolean(),
  timedOut: z.boolean(),
});

export const bash = tool({
  description:
    "Run a shell command via `bash -c` from the workspace root. The working directory is locked, but the shell itself can still read or write absolute paths outside the workspace — use with care. Stdout and stderr are each capped at 64 KB.",
  inputSchema: bashInput,
  outputSchema: bashOutput,
  // Cache breakpoint placed on the last tool in the set — Anthropic caches
  // everything before the breakpoint, so this single annotation caches the
  // system prompt + all tool schemas. Cached reads count at ~10% of normal
  // input rate against ITPM, which is the single biggest lever for the
  // 30k/min budget once the agent starts looping.
  providerOptions: {
    anthropic: { cacheControl: { type: "ephemeral" } },
  },
});

export type BashInput = z.infer<typeof bashInput>;
export type BashOutput = z.infer<typeof bashOutput>;
