# Recommended Next Prompt Plan

## Goal

Add a recommended next prompt flow that runs after a chat stream finishes, fetches a suggestion from `/chat/:sessionId/placeholder`, and injects that suggestion into the CLI textarea so the user can submit or edit it.

## Current Context

- Chat UI lives in `apps/cli/src/screens/chat-screen.tsx`.
- Prompt input lives in `apps/cli/src/components/prompt-text-area.tsx`.
- The textarea is OpenTUI-backed and is controlled through `TextareaRenderable` via `useRef`, not React state.
- `PromptTextArea` currently reads `textareaRef.current?.plainText`, submits it through `onSubmitPrompt`, and clears with `textareaRef.current?.clear()` when `clearOnSubmit` is enabled.
- `chat-screen.tsx` owns the `useChat` call and currently calls `sendMessage({ text })` from `submitPrompt`.
- Server chat routes live in `apps/server/src/routes/chat.ts` and are mounted under `/chat` from `apps/server/src/app.ts`.
- The CLI should use the typed Hono RPC client from `apps/cli/src/lib/client.ts`, not raw `fetch`.

## Proposed API

Add a new authenticated route:

```http
POST /chat/:sessionId/placeholder
```

Request body:

```ts
{
  messages: unknown[];
  mode: Mode;
  modelId: CodingModelId;
}
```

Response body:

```ts
{
  placeholder: string;
}
```

The endpoint should:

- Use `zValidator("param", chatParamSchema)`.
- Use `zValidator("json", placeholderRequestSchema)`.
- Verify the session belongs to the authenticated `userId`.
- Validate messages with `safeValidateUIMessages<CodingAgentUIMessage>`.
- Return `404` if the session does not belong to the user.
- Return `400` for invalid messages.
- Return a trimmed placeholder string.

## Server Implementation Plan

1. Extend `apps/server/src/routes/chat.ts`.

2. Convert `chatRoutes` from a single `.post()` export into a chained route export so Hono RPC inference includes both endpoints:

```ts
export const chatRoutes = new Hono<AuthVariables & CreditVariables>()
  .post("/:sessionId", ...)
  .post("/:sessionId/placeholder", ...);
```

3. Add a placeholder request schema:

```ts
const placeholderRequestSchema = z.object({
  messages: z.array(z.unknown()).min(1),
  mode: modeSchema,
  modelId: codingModelIdSchema,
});
```

4. In the placeholder handler:

- Read `sessionId` from validated params.
- Read `messages`, `mode`, and `modelId` from validated JSON.
- Verify the session exists for the current `userId`.
- Remove provider metadata with the existing `removeProviderMetadata` helper.
- Validate UI messages with `safeValidateUIMessages<CodingAgentUIMessage>` and `allCodingTools`.
- Convert messages to model messages and prune the history similarly to the main chat route.

5. Generate one short recommendation.

Recommended minimal approach:

- Add a small helper in `chat.ts` or `newcode-ai/server` that uses the selected model without tools.
- Keep this separate from `createCodingAgent` because suggestions should not call coding tools.
- Use a narrow system instruction such as: `Given this coding conversation, suggest exactly one useful next user prompt. Return only the prompt text. Keep it under 160 characters.`
- Use the active `modelId` so the suggestion follows the user's current model selection.

6. Credit behavior:

- Do not apply `requireCredits(1)` to `/placeholder` for the first version unless product requirements change.
- Treat the suggestion as optional UX. If cost or abuse becomes a concern, add a cheaper quota/rate limit later.

7. Return a safe response:

```ts
return c.json({ placeholder: suggestion.trim() });
```

If generation fails, prefer returning `{ placeholder: "" }` or a non-blocking error response. The CLI should never fail the completed chat turn just because the recommendation failed.

## CLI Component Plan

### `PromptTextArea`

The important constraint is that the textarea is ref-driven, not state-driven. Passing a new React state value is not enough to place text into the input.

Expose an imperative handle from `PromptTextArea`:

```ts
export type PromptTextAreaHandle = {
  replacePrompt: (prompt: string) => void;
  clearPrompt: () => void;
  getPrompt: () => string;
};
```

Implementation details:

- Convert `PromptTextArea` to `forwardRef`.
- Keep the existing internal `textareaRef`.
- Implement `replacePrompt(prompt)` by calling `textareaRef.current?.replaceText(prompt)`.
- Move the cursor to the end with the existing `getCursorPosition` helper.
- Call `commandMenu.updatePrompt(prompt)` and `fileMentionMenu.updatePrompt(prompt)` after replacing text.
- Implement `clearPrompt()` by reusing the existing local `clearPrompt` callback.
- Implement `getPrompt()` from `textareaRef.current?.plainText ?? ""`.

### `chat-screen.tsx`

1. Add a prompt textarea ref:

```ts
const promptTextAreaRef = useRef<PromptTextAreaHandle>(null);
```

2. Pass it into `PromptTextArea`:

```tsx
<PromptTextArea
  ref={promptTextAreaRef}
  ...
/>
```

3. Maintain a latest messages ref to avoid stale `onFinish` closures:

```ts
const messagesRef = useRef<CodingAgentUIMessage[]>([]);
messagesRef.current = messages;
```

4. Add a placeholder request sequence ref to avoid late writes:

```ts
const placeholderRequestIdRef = useRef(0);
```

5. In `submitPrompt`, invalidate any previous placeholder request before sending the new message:

```ts
placeholderRequestIdRef.current += 1;
void sendMessage({ text });
```

6. Add `onFinish` to `useChat` and call a local loader:

```ts
const { messages, sendMessage, setMessages, status, error, addToolOutput, stop } =
  useChat<CodingAgentUIMessage>({
    id: sessionId,
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall,
    onFinish: async () => {
      await loadRecommendedNextPrompt();
    },
  });
```

7. Implement `loadRecommendedNextPrompt` with the typed Hono RPC client:

```ts
async function loadRecommendedNextPrompt() {
  if (!sessionId) {
    return;
  }

  const requestId = placeholderRequestIdRef.current + 1;
  placeholderRequestIdRef.current = requestId;

  const res = await client.chat[":sessionId"].placeholder.$post({
    param: { sessionId },
    json: {
      messages: messagesRef.current,
      mode: modeRef.current,
      modelId: modelIdRef.current,
    },
  });

  if (!res.ok || placeholderRequestIdRef.current !== requestId) {
    return;
  }

  const data = await res.json();
  const placeholder = data.placeholder.trim();
  if (!placeholder) {
    return;
  }

  const currentPrompt = promptTextAreaRef.current?.getPrompt() ?? "";
  if (currentPrompt.trim().length > 0) {
    return;
  }

  promptTextAreaRef.current?.replacePrompt(placeholder);
}
```

The exact function shape can be adjusted during implementation, but it must preserve these behaviors:

- Do not call the endpoint without `sessionId`.
- Do not overwrite user-typed text.
- Do not inject a late suggestion from an older request.
- Do not block chat if recommendation generation fails.

## UX Rules

- The recommendation should become editable textarea content, not only placeholder display text.
- Keep the existing `placeholder="Send a message..."` as fallback empty-state text.
- Do not overwrite text the user typed after the stream finished.
- Do not inject while a new message is already submitted or streaming.
- If placeholder generation fails, keep the textarea empty and avoid noisy errors.
- Pressing Enter after injection should submit the suggested prompt through the existing `onSubmitPrompt` flow.

## Edge Cases

- Aborted stream: do not inject a recommendation if the user pressed Escape/stop.
- Tool roundtrips: only trigger the recommendation after the final assistant response, not between automatic tool-call continuations.
- Empty response from `/placeholder`: do nothing.
- User starts typing before `/placeholder` returns: do not overwrite their prompt.
- Session changes while request is in flight: ignore the old result.

## Verification Plan

Run from the repository root:

```sh
bun run check:server
bun run check:cli
bun run build:server
bun run build:cli
```

Manual verification:

1. Start the server and CLI.
2. Submit a chat message.
3. Wait for streaming to complete.
4. Confirm `/chat/:sessionId/placeholder` is called.
5. Confirm suggested text appears inside the textarea.
6. Confirm pressing Enter submits the suggested prompt.
7. Confirm editing the suggested prompt works.
8. Confirm user-typed text is not overwritten if placeholder generation finishes late.
9. Confirm Escape/stop does not inject a suggestion for aborted streams.

## Implementation Order

1. Add the server `/chat/:sessionId/placeholder` route with typed validation.
2. Add the server-side recommendation generation helper.
3. Expose `PromptTextAreaHandle` from `PromptTextArea` using an imperative ref.
4. Wire `PromptTextAreaHandle` into `chat-screen.tsx`.
5. Add the `useChat` `onFinish` placeholder request.
6. Add race protection and user-input overwrite protection.
7. Run server and CLI typechecks/builds.
