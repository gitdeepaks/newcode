# Model Registry Plan

## Goal

Introduce a simple flat model registry inside `packages/ai` so the coding agent TUI can later render available model choices without duplicating provider/model metadata.

The initial implementation should keep runtime behavior unchanged: the coding agent still uses the current Anthropic model by default, and model selection is not wired through the CLI, server API, database, or chat request flow yet.

## Constraints

- Only modify files inside `packages/ai` for the implementation.
- Keep the plan document at the repository root.
- Do not wire model selection yet.
- Do not change `apps/server` or `apps/cli` in this phase.
- Preserve end-to-end type safety for future wiring.
- Keep the registry flat and easy to render in the TUI.
- Keep shared registry metadata safe to import from both client and server code.
- Add the OpenAI AI SDK provider package now so the registry can include an OpenAI example model and server-only provider mapping can be exhaustive from the start.
- Derive the language model factory and provider options from the model id's provider immediately, even though the only selected model today is the default.

## Files To Change

### `packages/ai/package.json`

Add the OpenAI provider package:

```json
"@ai-sdk/openai": "^..."
```

Use Bun to add it so `bun.lock` is updated consistently:

```sh
bun add @ai-sdk/openai --cwd packages/ai
```

The package is added now to account for multiple providers early. The server should include a provider-aware factory mapping immediately, but it will still only use the default model id until model selection is implemented.

### `packages/ai/src/models.ts`

Create a new shared registry module.

This file should contain only serializable metadata, Zod schemas, and TypeScript types. It should not import `@ai-sdk/anthropic`, `@ai-sdk/openai`, `ai`, Node APIs, or Bun APIs.

Planned exports:

```ts
import { z } from "zod";

export const codingModelProviders = ["anthropic", "openai"] as const;

export const codingModelIds = ["claude-sonnet-4-6", "gpt-5.5"] as const;

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
    id: "gpt-5.5",
    provider: "openai",
    label: "GPT-5.5",
    description: "OpenAI model option for future model selection.",
  },
] as const satisfies readonly CodingModelConfig[];

export const DEFAULT_CODING_MODEL_ID = "claude-sonnet-4-6" satisfies CodingModelId;

export function getCodingModel(modelId: CodingModelId): CodingModelConfig {
  const model = availableCodingModels.find((candidate) => candidate.id === modelId);
  if (!model) {
    throw new Error(`Unknown coding model: ${modelId}`);
  }

  return model;
}
```

Notes:

- `CodingModelId` must remain a literal union, not a plain `string`.
- `CodingModelProvider` must remain a literal union, not a plain `string`.
- The flat `availableCodingModels` array is the source the TUI should eventually render.
- The Zod schemas are the source future request validation should use.
- `getCodingModel` should accept only `CodingModelId`, so callers must validate external input before lookup.
- Avoid `any`, `as unknown as`, and broad type assertions.

### `packages/ai/src/server.ts`

Replace the hardcoded local model id with the registry default, then derive runtime model creation and provider options from the selected model config.

Current shape:

```ts
export const CODING_AGENT_MODEL_ID = "claude-sonnet-4-6";
```

Planned shape:

```ts
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import {
  DEFAULT_CODING_MODEL_ID,
  getCodingModel,
  type CodingModelConfig,
  type CodingModelId,
} from "./models";

export const CODING_AGENT_MODEL_ID = DEFAULT_CODING_MODEL_ID;
```

Add server-only helpers that derive behavior from the model provider:

```ts
function createCodingLanguageModel(modelId: CodingModelId): LanguageModel {
  const model = getCodingModel(modelId);

  switch (model.provider) {
    case "anthropic":
      return anthropic(model.id);
    case "openai":
      return openai(model.id);
  }
}

function getCodingProviderOptions(model: CodingModelConfig) {
  switch (model.provider) {
    case "anthropic":
      return {
        anthropic: {
          thinking: { type: "disabled" },
        },
      };
    case "openai":
      return undefined;
  }
}
```

Use those helpers inside `createCodingAgent`, even while passing only the default model id:

```ts
export function createCodingAgent(mode: Mode = DEFAULT_MODE) {
  const modelConfig = getCodingModel(CODING_AGENT_MODEL_ID);

  return new ToolLoopAgent({
    model: createCodingLanguageModel(modelConfig.id),
    providerOptions: getCodingProviderOptions(modelConfig),
  });
}
```

The exact object passed to `ToolLoopAgent` should preserve the current fields such as `maxOutputTokens`, `maxRetries`, `instructions`, `tools`, and `stopWhen`.

The important requirement is that `providerOptions` is not hardcoded merely because the default model is known to be Anthropic. It must be derived from the provider attached to the model id being used.

The OpenAI branch can return `undefined` until there are known OpenAI-specific provider options. Do not invent provider options.

### `packages/ai/src/index.ts`

Export the model registry from the shared AI package root so future CLI code can consume it without importing `newcode-ai/server`.

Planned export:

```ts
export {
  availableCodingModels,
  codingModelIdSchema,
  codingModelIds,
  codingModelProviderSchema,
  codingModelProviders,
  codingModelSchema,
  DEFAULT_CODING_MODEL_ID,
  type CodingModelConfig,
  type CodingModelId,
  type CodingModelProvider,
} from "./models";
```

### `bun.lock`

Expected to change when `@ai-sdk/openai` is added with Bun.

## End-To-End Type Safety Design

The future model-selection flow should use one shared type chain:

1. `packages/ai/src/models.ts` defines `codingModelIdSchema` and `CodingModelId`.
2. The server request schema validates incoming `modelId` with `codingModelIdSchema`.
3. The Hono route exports the typed `AppType` from the chained route value.
4. The CLI uses the typed Hono RPC client and receives the inferred accepted request shape.
5. The TUI renders choices from `availableCodingModels` and submits a `CodingModelId`.
6. Persistence stores the selected `CodingModelId`, not an arbitrary string.

This keeps the path type-safe from registry metadata to UI rendering, API validation, server execution, and persistence.

## Future Server Mapping

Provider factory mapping should be added in the first implementation inside `packages/ai` server-only code, not in the shared registry file.

Expected shape:

```ts
function createLanguageModel(modelId: CodingModelId) {
  const model = getCodingModel(modelId);

  switch (model.provider) {
    case "anthropic":
      return anthropic(model.id);
    case "openai":
      return openai(model.id);
  }
}
```

Provider options should also be mapped by provider immediately:

```ts
function getProviderOptions(model: CodingModelConfig) {
  switch (model.provider) {
    case "anthropic":
      return {
        anthropic: {
          thinking: { type: "disabled" },
        },
      };
    case "openai":
      return undefined;
  }
}
```

Both mappings should be exhaustive. If a new provider is added to `CodingModelProvider`, TypeScript should force the server mapping and provider-options mapping to handle it.

## Future API Wiring

When model selection is added, update the chat route request body schema to include an optional or required `modelId` field:

```ts
modelId: codingModelIdSchema.default(DEFAULT_CODING_MODEL_ID)
```

If defaults are used, keep them explicit and schema-backed. Do not use string fallbacks like `modelId ?? ""` or `modelId ?? "claude-sonnet-4-6"` outside the registry.

## Future TUI Wiring

When the TUI supports model selection:

- Import `availableCodingModels` from `newcode-ai`.
- Render model labels and descriptions from the registry.
- Store selected model state as `CodingModelId`.
- Submit the selected id through the typed Hono RPC client.
- Do not duplicate model labels, ids, or providers in CLI-local constants.

## Validation Rules

- `availableCodingModels` must only contain ids listed in `codingModelIds`.
- `availableCodingModels` must only contain providers listed in `codingModelProviders`.
- The default model id must satisfy `CodingModelId`.
- Shared registry code must not import provider runtime packages.
- Server-only model execution code may import provider runtime packages.
- Server-only model execution code must derive the provider factory from the model config's provider.
- Server-only model execution code must derive provider options from the model config's provider.

## Verification

After implementation, run:

```sh
bunx tsc -p packages/ai/tsconfig.json --noEmit
bun run check:server
bun run check:cli
```

The package-level check verifies the new registry. The server and CLI checks verify existing consumers still typecheck against the exported AI package surface.

## Non-Goals For This Phase

- No TUI model picker.
- No chat request `modelId` field.
- No database schema changes.
- No assistant message persistence changes.
- No user-selectable OpenAI runtime execution.
- No provider auto-detection.
- No dynamic registry loading.
- No remote model catalog fetching at runtime.
