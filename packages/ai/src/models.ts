import { z } from "zod";

export const codingModelProviders = ["anthropic", "openai"] as const;

export const codingModelIds = [
  "gpt-5.5",
  "gpt-5.5-pro",
  "gpt-5.4",
  "gpt-5.4-pro",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
  "gpt-5.1",
  "gpt-5-nano",
] as const;

export const codingModelProviderSchema = z.enum(codingModelProviders);
export const codingModelIdSchema = z.enum(codingModelIds);

export const codingModelSchema = z.object({
  id: codingModelIdSchema,
  provider: codingModelProviderSchema,
  label: z.string(),
  description: z.string(),
  pricing: z.object({
    inputUsdPerMillionTokens: z.number().positive(),
    cachedInputUsdPerMillionTokens: z.number().positive().optional(),
    outputUsdPerMillionTokens: z.number().positive(),
  }),
  creditCost: z.object({
    minimumCredits: z.number().int().positive(),
    usdPerCredit: z.number().positive(),
    targetGrossMargin: z.number().min(0).max(1),
  }),
});

export type CodingModelProvider = z.infer<typeof codingModelProviderSchema>;
export type CodingModelId = z.infer<typeof codingModelIdSchema>;
export type CodingModelConfig = z.infer<typeof codingModelSchema>;

export const availableCodingModels = [
  {
    id: "gpt-5.5",
    provider: "openai",
    label: "GPT-5.5",
    description: "Default OpenAI coding model for agentic coding tasks.",
    pricing: {
      inputUsdPerMillionTokens: 0.625,
      cachedInputUsdPerMillionTokens: 0.125,
      outputUsdPerMillionTokens: 5,
    },
    creditCost: {
      minimumCredits: 8,
      usdPerCredit: 0.02,
      targetGrossMargin: 0.7,
    },
  },
  {
    id: "gpt-5.5-pro",
    provider: "openai",
    label: "GPT-5.5 Pro",
    description: "Higher-capability OpenAI coding model for complex tasks.",
    pricing: {
      inputUsdPerMillionTokens: 15,
      cachedInputUsdPerMillionTokens: 1.5,
      outputUsdPerMillionTokens: 120,
    },
    creditCost: {
      minimumCredits: 180,
      usdPerCredit: 0.02,
      targetGrossMargin: 0.7,
    },
  },
  {
    id: "gpt-5.4",
    provider: "openai",
    label: "GPT-5.4",
    description: "OpenAI coding model fallback when newer models are limited.",
    pricing: {
      inputUsdPerMillionTokens: 0.625,
      cachedInputUsdPerMillionTokens: 0.125,
      outputUsdPerMillionTokens: 5,
    },
    creditCost: {
      minimumCredits: 8,
      usdPerCredit: 0.02,
      targetGrossMargin: 0.7,
    },
  },
  {
    id: "gpt-5.4-pro",
    provider: "openai",
    label: "GPT-5.4 Pro",
    description: "Higher-capability OpenAI fallback for complex tasks.",
    pricing: {
      inputUsdPerMillionTokens: 15,
      cachedInputUsdPerMillionTokens: 1.5,
      outputUsdPerMillionTokens: 120,
    },
    creditCost: {
      minimumCredits: 180,
      usdPerCredit: 0.02,
      targetGrossMargin: 0.7,
    },
  },
  {
    id: "claude-sonnet-4-6",
    provider: "anthropic",
    label: "Claude Sonnet 4.6",
    description: "Default coding model for agentic coding tasks.",
    pricing: {
      inputUsdPerMillionTokens: 3,
      outputUsdPerMillionTokens: 15,
    },
    creditCost: {
      minimumCredits: 25,
      usdPerCredit: 0.02,
      targetGrossMargin: 0.7,
    },
  },
  {
    id: "gpt-5.1",
    provider: "openai",
    label: "GPT-5.1",
    description: "OpenAI model option for future model selection.",
    pricing: {
      inputUsdPerMillionTokens: 0.625,
      cachedInputUsdPerMillionTokens: 0.125,
      outputUsdPerMillionTokens: 5,
    },
    creditCost: {
      minimumCredits: 8,
      usdPerCredit: 0.02,
      targetGrossMargin: 0.7,
    },
  },
  {
    id: "claude-haiku-4-5",
    provider: "anthropic",
    label: "Claude Haiku 4.5",
    description: "Fast Anthropic model for lighter coding tasks.",
    pricing: {
      inputUsdPerMillionTokens: 1,
      outputUsdPerMillionTokens: 5,
    },
    creditCost: {
      minimumCredits: 8,
      usdPerCredit: 0.02,
      targetGrossMargin: 0.7,
    },
  },
  {
    id: "gpt-5-nano",
    provider: "openai",
    label: "GPT-5 Nano",
    description: "Lowest-cost OpenAI model for quick lightweight turns.",
    pricing: {
      inputUsdPerMillionTokens: 0.05,
      cachedInputUsdPerMillionTokens: 0.005,
      outputUsdPerMillionTokens: 0.4,
    },
    creditCost: {
      minimumCredits: 1,
      usdPerCredit: 0.02,
      targetGrossMargin: 0.7,
    },
  },
] as const satisfies readonly CodingModelConfig[];

export const DEFAULT_CODING_MODEL_ID =
  "gpt-5.5" satisfies CodingModelId;

export function getCodingModel(modelId: CodingModelId): CodingModelConfig {
  const model = availableCodingModels.find(
    (candidate) => candidate.id === modelId,
  );
  if (!model) {
    throw new Error(`Unknown coding model: ${modelId}`);
  }

  return model;
}
