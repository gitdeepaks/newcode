import { anthropic } from "@ai-sdk/anthropic";
import { tools } from "@newcode/tools";
import { InferAgentUIMessage, ToolLoopAgent, stepCountIs } from "ai";

// Single hardcoded model for now. When the app goes multi-model, this becomes
// per-request (request body or session config) and is what we persist on the
// assistant message row.
export const CODING_AGENT_MODEL_ID = "claude-sonnet-4-6";

// Single source of truth for everything about the coding agent: model,
// instructions, tools, loop budget, per-call rate-limit knobs, and provider
// options. The Hono route just feeds it `uiMessages` and streams the response.
export const codingAgent = new ToolLoopAgent({
  model: anthropic(CODING_AGENT_MODEL_ID),
  // Anthropic counts max_tokens as a reservation against the per-minute
  // input-token rate limit, so leaving it at the model default (128k)
  // guarantees a 429 on small accounts. 4096 keeps the per-step
  // reservation small enough that a multi-step tool loop fits inside a
  // 30k ITPM budget.
  maxOutputTokens: 4096,
  // 429s come back with retry-after headers around 100s. Default
  // maxRetries (2) blocks the request for 3+ minutes for an error the
  // user can fix in seconds — fail fast instead.
  maxRetries: 0,
  instructions: [
    "You are a coding agent running inside a terminal CLI on the user's machine.",
    "You can read, search, and modify files in the user's current working directory by calling tools.",
    "All file system tools execute on the CLI; you do not have direct file system access yourself.",
    "Tools available: read_file, write_file, edit_file, list_directory, grep, bash.",
    "Prefer edit_file (string replace) for small changes; use write_file for new files or full rewrites.",
    "Use grep and list_directory to explore before editing. Read a file before editing it so your oldString matches verbatim.",
    "Use bash for build, test, and shell tasks. Keep commands focused and short-lived.",
    "All paths must stay inside the user's workspace; absolute paths outside it will be rejected.",
    "Take a moment to reason briefly about what to do before acting.",
  ].join(" "),
  tools,
  stopWhen: stepCountIs(10),
  providerOptions: {
    anthropic: {
      thinking: { type: "enabled", budgetTokens: 1024 },
    },
  },
});

// Inferred from the agent definition above — single source of truth for the
// chat message shape that flows through Hono RPC to the CLI.
export type ChatUIMessage = InferAgentUIMessage<typeof codingAgent>;
