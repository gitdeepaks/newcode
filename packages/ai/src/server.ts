import { anthropic } from "@ai-sdk/anthropic";
import { ToolLoopAgent, stepCountIs, type InferUITools, type UIMessage } from "ai";
import { getSystemInstructions } from "./instructions";
import { DEFAULT_MODE, type Mode } from "./modes";
import { allCodingTools, getCodingToolsForMode } from "./tools/registry";

// Single hardcoded model for now. When the app goes multi-model, this becomes
// per-request (request body or session config) and is what we persist on the
// assistant message row.
export const CODING_AGENT_MODEL_ID = "claude-sonnet-4-6";

export function createCodingAgent(mode: Mode = DEFAULT_MODE) {
  return new ToolLoopAgent({
    model: anthropic(CODING_AGENT_MODEL_ID),
    // Anthropic counts max_tokens as a reservation against the per-minute
    // input-token rate limit, so leaving it at the model default (128k)
    // guarantees a 429 on small accounts. Keep this low so multi-step tool
    // loops still fit inside a 30k ITPM budget on small Anthropic accounts.
    maxOutputTokens: 1024,
    // 429s come back with retry-after headers around 100s. Default
    // maxRetries (2) blocks the request for 3+ minutes for an error the
    // user can fix in seconds — fail fast instead.
    maxRetries: 0,
    instructions: getSystemInstructions(mode),
    tools: getCodingToolsForMode(mode),
    stopWhen: stepCountIs(10),
    providerOptions: {
      anthropic: {
        thinking: { type: "disabled" },
      },
    },
  });
}

// Message history spans modes, so the UI message type needs the full coding
// tool universe rather than a per-mode subset.
export type CodingAgentUIMessage = UIMessage<
  unknown,
  never,
  InferUITools<typeof allCodingTools>
>;
