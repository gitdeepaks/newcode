# Server Model ID Plan

## Goal

Wire model selection through the server chat path without wiring the CLI/TUI yet.

The server should accept an optional `modelId` in chat requests, validate it with the shared coding model schema, pass it into agent creation, and persist the actual model used. Because the TUI is not being updated in this plan, missing `modelId` must continue to fall back to the default coding model id.

## Scope

Included:

1. Update `packages/ai/src/server.ts` so `createCodingAgent` accepts `modelId` as an argument instead of using the module-level default internally.
2. Keep a default fallback inside `createCodingAgent` for callers that do not pass `modelId`.
3. Update `apps/server/src/routes/chat.ts` so `chatRequestSchema` parses optional `modelId` from the request body.
4. Pass the parsed `modelId` into `createCodingAgent`.
5. Persist the resolved model id on assistant messages instead of the old hardcoded `CODING_AGENT_MODEL_ID` value.

Not included:

1. No CLI/TUI changes in `apps/cli`.
2. No model picker UI.
3. No client-side request changes to send `modelId`.
4. No database schema changes unless a current column type prevents storing the existing model ids.

## Current State

`packages/ai/src/server.ts` currently exports `CODING_AGENT_MODEL_ID = DEFAULT_CODING_MODEL_ID` and `createCodingAgent(mode)` always resolves the model from that constant.

`apps/server/src/routes/chat.ts` currently validates only:

```ts
const chatRequestSchema = z.object({
  messages: z.array(z.unknown()).min(1),
  mode: modeSchema,
});
```

The route calls:

```ts
const agent = createCodingAgent(mode);
```

Assistant messages are persisted with the hardcoded `CODING_AGENT_MODEL_ID`.

## Target Shape

### AI Package

Change `createCodingAgent` to accept a model id parameter with a default fallback:

```ts
export function createCodingAgent(
  mode: Mode = DEFAULT_MODE,
  modelId: CodingModelId = DEFAULT_CODING_MODEL_ID,
) {
  const modelConfig = getCodingModel(modelId);

  return new ToolLoopAgent({
    model: createCodingLanguageModel(modelConfig.id),
    providerOptions: getCodingProviderOptions(modelConfig),
    // existing options unchanged
  });
}
```

This keeps existing callers safe while removing the hard dependency on the module-level `CODING_AGENT_MODEL_ID` constant.

Prefer removing `CODING_AGENT_MODEL_ID` if no longer needed. If a temporary export is needed, it should not be used by `createCodingAgent` or `apps/server/src/routes/chat.ts`.

### Server Chat Route

Import `codingModelIdSchema` and `DEFAULT_CODING_MODEL_ID` from `newcode-ai`.

Extend request validation:

```ts
const chatRequestSchema = z.object({
  messages: z.array(z.unknown()).min(1),
  mode: modeSchema,
  modelId: codingModelIdSchema.optional(),
});
```

Read and resolve the model id in the route:

```ts
const { messages, mode, modelId } = c.req.valid("json");
const resolvedModelId = modelId ?? DEFAULT_CODING_MODEL_ID;
const agent = createCodingAgent(mode, resolvedModelId);
```

Persist `resolvedModelId` on assistant messages:

```ts
model: resolvedModelId,
```

Use the same `resolvedModelId` in both `create` and `update` branches of the assistant message upsert.

## Fallback Behavior

Because `apps/cli` is not being wired up in this plan, existing chat requests will not include `modelId`.

Required fallback chain:

1. If request body contains a valid `modelId`, use it.
2. If request body omits `modelId`, use `DEFAULT_CODING_MODEL_ID`.
3. If request body contains an invalid `modelId`, reject the request through `zValidator` with a validation error.

This preserves current CLI behavior while making the server ready for future model selection.

## Implementation Steps

1. Update imports in `apps/server/src/routes/chat.ts`:
   - Add `codingModelIdSchema` and `DEFAULT_CODING_MODEL_ID` from `newcode-ai`.
   - Stop importing `CODING_AGENT_MODEL_ID` from `newcode-ai/server`.
2. Extend `chatRequestSchema` with optional `modelId`.
3. Resolve `modelId` after request validation using `modelId ?? DEFAULT_CODING_MODEL_ID`.
4. Pass `resolvedModelId` into `createCodingAgent(mode, resolvedModelId)`.
5. Persist `resolvedModelId` in the assistant message upsert.
6. Update `packages/ai/src/server.ts` so `createCodingAgent` accepts `modelId` with a default of `DEFAULT_CODING_MODEL_ID`.
7. Remove or stop using `CODING_AGENT_MODEL_ID` if it becomes dead code.
8. Run server verification from the repo root:

```sh
bun run check:server
bun run build:server
```

## Acceptance Criteria

1. `apps/server/src/routes/chat.ts` validates optional `modelId` via `codingModelIdSchema`.
2. `createCodingAgent` receives `modelId` as an argument and falls back to `DEFAULT_CODING_MODEL_ID` when omitted.
3. The chat route does not use `CODING_AGENT_MODEL_ID` or any other hardcoded model constant for agent creation.
4. Assistant messages persist the actual resolved model id.
5. Existing CLI requests that omit `modelId` continue to work through the default fallback.
6. `bun run check:server` and `bun run build:server` pass.
