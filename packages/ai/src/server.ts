import { anthropic } from "@ai-sdk/anthropic";
import { InferAgentUIMessage, ToolLoopAgent, stepCountIs } from "ai";
import { instructions } from "./instructions";
import { tools } from "./tools/schemas";

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
  instructions,
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
export type CodingAgentUIMessage = InferAgentUIMessage<typeof codingAgent>;
