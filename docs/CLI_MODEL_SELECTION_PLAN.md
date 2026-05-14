# CLI Model Selection Plan

## Goal

Continue `CLI_MODEL_ID_PLAN.md` by replacing the CLI's hardcoded `DEFAULT_CODING_MODEL_ID` usage with an active model selection path.

The CLI should maintain the user's selected coding model in a shared, industry-standard React state layer, similar in spirit to how the current chat screen maintains coding mode (`BUILD` or `PLAN`). The selected model should drive both the visible composer label and the `modelId` sent to the server chat route.

## Scope

Included:

1. Add CLI-side active model state with a React context/provider and hook.
2. Initialize active model state from `DEFAULT_CODING_MODEL_ID`.
3. Add a `ModelDialog` component that uses `apps/cli/src/components/search-list-dialog.tsx`.
4. Populate the model dialog from `availableCodingModels` in `packages/ai/src/models.ts` through the `newcode-ai` package export.
5. Wire the existing `/model` prompt command to open the model dialog.
6. Update `apps/cli/src/components/prompt-text-area.tsx` usage so the active model controls the displayed `Model · Provider` label.
7. Update `apps/cli/src/screens/chat-screen.tsx` so `DefaultChatTransport` sends the active `modelId` for each request.
8. Update `apps/cli/src/screens/home-screen.tsx` so its prompt text area displays the same active model.

Not included:

1. No persistence to local storage, config files, route state, database, or server.
2. No per-session model history or per-message model display changes.
3. No server contract changes beyond continuing to receive required `modelId`.
4. No changes to `packages/ai/src/models.ts` model inventory unless type exports are missing.
5. No raw `fetch` or hardcoded model lists in the CLI.

## Current State

`CLI_MODEL_ID_PLAN.md` is already reflected in the codebase. `apps/cli/src/screens/chat-screen.tsx` imports `DEFAULT_CODING_MODEL_ID` and sends it in the chat transport body:

```ts
body: () => ({ mode: modeRef.current, modelId: DEFAULT_CODING_MODEL_ID }),
```

The same screen passes the default model id into the composer:

```tsx
<PromptTextArea
  mode={mode}
  modelId={DEFAULT_CODING_MODEL_ID}
/>
```

`apps/cli/src/screens/home-screen.tsx` also passes `DEFAULT_CODING_MODEL_ID` into `PromptTextArea`.

`apps/cli/src/components/prompt-text-area.tsx` already accepts a `modelId?: CodingModelId`, looks up `availableCodingModels`, and renders the model label plus formatted provider. This component should not own model selection state.

`apps/cli/src/lib/prompt-commands.ts` already defines `/model`:

```ts
{
  name: "/model",
  description: "Change active model",
}
```

`apps/cli/src/components/search-list-dialog.tsx` already provides the reusable searchable list UI needed for a model picker.

`packages/ai/src/models.ts` defines the typed model inventory:

```ts
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
```

## Target Shape

### Active Model State

Add a small CLI-local context, for example `apps/cli/src/lib/model-selection.tsx`, with:

```ts
type ModelSelectionContextValue = {
  modelId: CodingModelId;
  model: CodingModelConfig;
  setModelId: (modelId: CodingModelId) => void;
};
```

The provider should initialize with `DEFAULT_CODING_MODEL_ID` and derive `model` with `getCodingModel(modelId)`.

The hook should fail loudly if used outside the provider:

```ts
export function useModelSelection() {
  const context = useContext(ModelSelectionContext);

  if (!context) {
    throw new Error("useModelSelection must be used within ModelSelectionProvider");
  }

  return context;
}
```

Wrap the app's route tree high enough that both `home-screen.tsx` and `chat-screen.tsx` can consume it. Prefer `apps/cli/src/app.tsx` unless the current provider structure makes `apps/cli/src/index.tsx` more appropriate.

### Model Dialog

Create `apps/cli/src/components/model-dialog.tsx`.

The component should map `availableCodingModels` into `SearchListDialogOption<CodingModelId>`:

```ts
const modelOptions = availableCodingModels.map((model) => ({
  id: model.id,
  label: model.label,
  description: model.description,
  metadata: formatProvider(model.provider),
  group: formatProvider(model.provider),
}));
```

The dialog should accept `activeModelId`, `onSelect`, and `onClose` props. Selection should call `onSelect(option.id)` and close the dialog.

Use `initialActiveIndex` so the currently selected model is highlighted when the dialog opens.

Handle `escape` in the owning screen or dialog layer consistently with existing dialog components. Do not add a second independent keyboard system.

### Prompt Command Wiring

Keep `/model` in `apps/cli/src/lib/prompt-commands.ts` as the source of command metadata.

Update the command handling path so when `PromptCommandInvocation.name === "/model"`, the active screen opens `ModelDialog` instead of treating it as a normal prompt action.

The likely implementation points are:

1. `apps/cli/src/hooks/use-prompt-command.ts`, if prompt commands are centralized there.
2. `apps/cli/src/screens/chat-screen.tsx` and `apps/cli/src/screens/home-screen.tsx`, if screen-specific dialog state is cleaner after inspecting the hook.

Prefer the smallest change that keeps `/model` behavior available from both home and chat composers.

### Prompt Label

Keep `apps/cli/src/components/prompt-text-area.tsx` presentational. It should continue accepting `modelId` as a prop and rendering the model label/provider from `availableCodingModels`.

Update callers to pass the active model id:

```tsx
const { modelId } = useModelSelection();

<PromptTextArea
  mode={mode}
  modelId={modelId}
/>
```

The visible label should show the selected model and provider instead of always showing `DEFAULT_CODING_MODEL_ID`.

### Chat Transport

Update `apps/cli/src/screens/chat-screen.tsx` so the transport request body reads the latest active model id at submit time, the same way it already reads the latest mode.

Add a model ref beside the existing mode ref:

```ts
const { modelId } = useModelSelection();
const modelIdRef = useRef(modelId);

modelIdRef.current = modelId;
```

Then update the lazy body:

```ts
body: () => ({
  mode: modeRef.current,
  modelId: modelIdRef.current,
}),
```

Keep the transport memo dependency stable around `sessionId`. The existing comment explains that `useChat` keeps one chat instance for a stable id, so the body callback should remain lazy rather than rebuilding transport for every model change.

## Implementation Steps

1. Inspect `apps/cli/src/app.tsx`, `apps/cli/src/index.tsx`, `apps/cli/src/hooks/use-prompt-command.ts`, `apps/cli/src/screens/home-screen.tsx`, and current dialog components to choose the smallest provider/dialog wiring point.
2. Add `apps/cli/src/lib/model-selection.tsx` with `ModelSelectionProvider` and `useModelSelection`.
3. Wrap the CLI route tree in `ModelSelectionProvider`.
4. Add `apps/cli/src/components/model-dialog.tsx` using `SearchListDialog` and `availableCodingModels`.
5. Wire `/model` so submitting the command opens `ModelDialog` from both home and chat screens.
6. On model selection, call `setModelId(option.id)` and close the dialog.
7. Update `home-screen.tsx` to pass the active `modelId` to `PromptTextArea`.
8. Update `chat-screen.tsx` to pass the active `modelId` to `PromptTextArea`.
9. Update `chat-screen.tsx` transport body to send the latest active `modelId` through a ref-backed lazy body callback.
10. Remove now-unused `DEFAULT_CODING_MODEL_ID` imports from screens after they consume model context.
11. Run verification from the repo root:

```sh
bun run check:cli
bun run build:cli
```

If shared model exports or server request types are touched unexpectedly, also run:

```sh
bun run check:server
bun run build:server
```

## Acceptance Criteria

1. The active model defaults to `DEFAULT_CODING_MODEL_ID` on CLI startup.
2. `/model` opens a searchable `ModelDialog` populated from `availableCodingModels`.
3. Selecting a model updates shared CLI state without persistence.
4. The composer label displays the selected model and formatted provider in both home and chat screens.
5. Chat requests send the selected `modelId`, not a hardcoded default.
6. The chat transport body reads the latest selected model at request time.
7. No CLI code duplicates the model list or hardcodes provider/model display data outside the shared model inventory.
8. `bun run check:cli` and `bun run build:cli` pass.
