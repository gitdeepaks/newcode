import { z } from "zod";

export const codingModelProviders = ["anthropic", "openai"] as const;

export const codingModelIds = ["claude-sonnet-4-6", "gpt-5.1"] as const;

export const codingModelProviderSchema = z.enum(codingModelProviders);
export const codingModelIdSchema = z.enum(codingModelIds);

export const codingModelSchema = z.object({
  id: codingModelIdSchema,
  provider: codingModelProviderSchema,
  label: z.string(),
  description: z.string(),
});

export type CodingModelProvider = z.infer<typeof codingModelProviderSchema>;
export type CodingModelId = z.infer<typeof codingModelIdSchema>;
export type CodingModelConfig = z.infer<typeof codingModelSchema>;

export const availableCodingModels = [
  {
    id: "claude-sonnet-4-6",
    provider: "anthropic",
    label: "Claude Sonnet 4.6",
    description: "Default coding model for agentic coding tasks.",
  },
  {
    id: "gpt-5.1",
    provider: "openai",
    label: "GPT-5.1",
    description: "OpenAI model option for future model selection.",
  },
] as const satisfies readonly CodingModelConfig[];

export const DEFAULT_CODING_MODEL_ID =
  "claude-sonnet-4-6" satisfies CodingModelId;

export function getCodingModel(modelId: CodingModelId): CodingModelConfig {
  const model = availableCodingModels.find(
    (candidate) => candidate.id === modelId,
  );
  if (!model) {
    throw new Error(`Unknown coding model: ${modelId}`);
  }

  return model;
}
