import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import {
  ToolLoopAgent,
  stepCountIs,
  type InferUITools,
  type LanguageModel,
  type UIMessage,
} from "ai";
import { getSystemInstructions } from "./instructions";
import {
  DEFAULT_CODING_MODEL_ID,
  getCodingModel,
  type CodingModelConfig,
  type CodingModelId,
} from "./models";
import { DEFAULT_MODE, type Mode } from "./modes";
import { allCodingTools, getCodingToolsForMode } from "./tools/registry";

function createCodingLanguageModel(modelId: CodingModelId): LanguageModel {
  const model = getCodingModel(modelId);

  switch (model.provider) {
    case "anthropic":
      return anthropic(model.id);
    case "openai":
      return openai(model.id);
  }
}

type CodingProviderOptions = Record<
  string,
  Record<string, boolean | string | Record<string, string>>
>;

function getCodingProviderOptions(
  model: CodingModelConfig,
): CodingProviderOptions | undefined {
  switch (model.id) {
    case "claude-sonnet-4-6":
      return {
        anthropic: {
          thinking: { type: "disabled" },
        },
      };
    case "gpt-5.1":
      return undefined;
  }
}

export function createCodingAgent(
  mode: Mode = DEFAULT_MODE,
  modelId: CodingModelId = DEFAULT_CODING_MODEL_ID,
) {
  const modelConfig = getCodingModel(modelId);

  return new ToolLoopAgent({
    model: createCodingLanguageModel(modelConfig.id),
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
    providerOptions: getCodingProviderOptions(modelConfig),
  });
}

// Message history spans modes, so the UI message type needs the full coding
// tool universe rather than a per-mode subset.
export type CodingAgentUIMessage = UIMessage<
  unknown,
  never,
  InferUITools<typeof allCodingTools>
>;
