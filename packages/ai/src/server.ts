import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import {
  ToolLoopAgent,
  generateText,
  stepCountIs,
  type InferUITools,
  type LanguageModel,
  type ModelMessage,
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

const RECOMMENDED_NEXT_PROMPT_SYSTEM =
  "Given this coding conversation, suggest exactly one useful next user prompt. Return only the prompt text. Keep it under 160 characters.";
const RECOMMENDED_NEXT_PROMPT_MODEL_ID = "gpt-5-nano" satisfies CodingModelId;

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
    case "claude-haiku-4-5":
    case "gpt-5.1":
    case "gpt-5.4":
    case "gpt-5.4-pro":
    case "gpt-5.5":
    case "gpt-5.5-pro":
    case "gpt-5-nano":
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

export async function generateRecommendedNextPrompt({
  messages,
  abortSignal,
}: {
  messages: ModelMessage[];
  abortSignal?: AbortSignal;
}) {
  const modelConfig = getCodingModel(RECOMMENDED_NEXT_PROMPT_MODEL_ID);
  const result = await generateText({
    model: createCodingLanguageModel(modelConfig.id),
    system: RECOMMENDED_NEXT_PROMPT_SYSTEM,
    messages,
    // GPT-5 Nano can spend a small hidden reasoning budget before emitting text.
    maxOutputTokens: 600,
    maxRetries: 0,
    abortSignal,
    providerOptions: getCodingProviderOptions(modelConfig),
  });

  return result.text.trim();
}

// Message history spans modes, so the UI message type needs the full coding
// tool universe rather than a per-mode subset.
export type CodingAgentUIMessage = UIMessage<
  unknown,
  never,
  InferUITools<typeof allCodingTools>
>;
