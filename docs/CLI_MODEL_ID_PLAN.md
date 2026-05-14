# CLI Model ID Plan

## Goal

Wire `apps/cli` into the server chat model id contract.

The CLI should include a `modelId` when submitting chat messages to `apps/server/src/routes/chat.ts`. There should be no TUI state management, model picker, persisted active model, or user-facing model selection in this plan. Until a model picker exists, the CLI should always send `DEFAULT_CODING_MODEL_ID` with each chat request.

Because the CLI will send a model id, the server chat route should stop accepting missing `modelId`. `modelId` should be required and validated with `codingModelIdSchema`.

## Scope

Included:

1. Update the CLI chat submission path in `apps/cli/src/screens/chat-screen.tsx` so `DefaultChatTransport` sends `modelId: DEFAULT_CODING_MODEL_ID` in the request body.
2. Import `DEFAULT_CODING_MODEL_ID` from `newcode-ai` in the CLI where the chat request body is created.
3. Update `apps/server/src/routes/chat.ts` so `chatRequestSchema` requires `modelId` instead of accepting it as optional.
4. Remove the server-side `modelId ?? DEFAULT_CODING_MODEL_ID` fallback in the chat route.
5. Continue passing the validated `modelId` into `createCodingAgent` and persisting the same model id on assistant messages.

Not included:

1. No model picker UI.
2. No CLI state for the active model id.
3. No route state, local storage, config file, or database persistence for selected model id.
4. No server fallback for omitted `modelId` on the chat route.
5. No changes to `packages/ai/src/server.ts` unless type errors reveal a mismatch with the existing `createCodingAgent(mode, modelId)` API.
6. No database schema changes.

## Current State

`SERVER_MODEL_ID_PLAN.md` made the server ready for per-request model ids while preserving compatibility with CLI requests that omit `modelId`.

`apps/server/src/routes/chat.ts` currently validates `modelId` as optional:

```ts
const chatRequestSchema = z.object({
  messages: z.array(z.unknown()).min(1),
  mode: modeSchema,
  modelId: codingModelIdSchema.optional(),
});
```

The route currently resolves a fallback before creating the agent:

```ts
const { messages, mode, modelId } = c.req.valid("json");
const resolvedModelId = modelId ?? DEFAULT_CODING_MODEL_ID;
const agent = createCodingAgent(mode, resolvedModelId);
```

Assistant messages are persisted with `resolvedModelId`.

`apps/cli/src/screens/chat-screen.tsx` currently creates the chat transport with a lazy request body that only sends `mode`:

```ts
const transport = useMemo(
  () =>
    new DefaultChatTransport<CodingAgentUIMessage>({
      api: client.chat[":sessionId"]
        .$url({ param: { sessionId: sessionId ?? "" } })
        .toString(),
      body: () => ({ mode: modeRef.current }),
      headers: getAuthHeaders,
    }),
  [sessionId],
);
```

## Target Shape

### CLI Chat Transport

Import `DEFAULT_CODING_MODEL_ID` alongside the existing mode imports:

```ts
import {
  DEFAULT_CODING_MODEL_ID,
  DEFAULT_MODE,
  getNextMode,
  type Mode,
} from "newcode-ai";
```

Include the default model id in the lazy transport body:

```ts
body: () => ({
  mode: modeRef.current,
  modelId: DEFAULT_CODING_MODEL_ID,
}),
```

Keep `modelId` constant at request time. Do not add React state, refs, reducers, route state, or config plumbing for model selection.

### Server Chat Route

Keep importing `codingModelIdSchema` from `newcode-ai`, but remove `DEFAULT_CODING_MODEL_ID` from `apps/server/src/routes/chat.ts` if it is only used for the fallback.

Require `modelId` in the request schema:

```ts
const chatRequestSchema = z.object({
  messages: z.array(z.unknown()).min(1),
  mode: modeSchema,
  modelId: codingModelIdSchema,
});
```

Use the validated model id directly:

```ts
const { messages, mode, modelId } = c.req.valid("json");
const agent = createCodingAgent(mode, modelId);
```

Persist the validated `modelId` directly in both assistant message upsert branches:

```ts
model: modelId,
```

## Request Behavior

Required behavior after this plan:

1. CLI chat requests always include `modelId: DEFAULT_CODING_MODEL_ID`.
2. Server chat requests with a valid `modelId` use that model id for agent creation and assistant message persistence.
3. Server chat requests with an invalid `modelId` are rejected by `zValidator`.
4. Server chat requests that omit `modelId` are rejected by `zValidator`.

This intentionally changes the server contract from compatibility fallback to required model id now that the CLI is wired up.

## Implementation Steps

1. Update imports in `apps/cli/src/screens/chat-screen.tsx` to include `DEFAULT_CODING_MODEL_ID` from `newcode-ai`.
2. Update the `DefaultChatTransport` `body` callback in `apps/cli/src/screens/chat-screen.tsx` to return both `mode` and `modelId`.
3. Update `apps/server/src/routes/chat.ts` so `chatRequestSchema.modelId` uses `codingModelIdSchema` without `.optional()`.
4. Remove the `resolvedModelId` fallback in `apps/server/src/routes/chat.ts`.
5. Pass `modelId` directly into `createCodingAgent(mode, modelId)`.
6. Persist `modelId` directly in both `create` and `update` branches of the assistant message upsert.
7. Remove any now-unused `DEFAULT_CODING_MODEL_ID` import from `apps/server/src/routes/chat.ts`.
8. Run verification from the repo root:

```sh
bun run check:server
bun run build:server
bun run check:cli
bun run build:cli
```

## Acceptance Criteria

1. `apps/cli/src/screens/chat-screen.tsx` sends `modelId: DEFAULT_CODING_MODEL_ID` with every chat request.
2. The CLI does not introduce active model state, model selection UI, route state, config, or persistence.
3. `apps/server/src/routes/chat.ts` validates `modelId` as required with `codingModelIdSchema`.
4. The server chat route does not fallback to `DEFAULT_CODING_MODEL_ID` when `modelId` is missing.
5. `createCodingAgent` receives the validated request `modelId`.
6. Assistant messages persist the validated request `modelId`.
7. `bun run check:server`, `bun run build:server`, `bun run check:cli`, and `bun run build:cli` pass.
