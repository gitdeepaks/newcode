# AI Package Refactor Plan

## Goal

Make the AI package easier to read and safer to extend without requiring the server or CLI apps to maintain per-tool code.

All AI definitions should stay inside `packages/ai`.

Adding a new tool should be straightforward:

1. Add the tool spec.
2. Add the runner.
3. Add the typed registry entries.
4. Let TypeScript fail if any required piece is missing or mismatched.

## Constraint To Relax

Stop pushing for zero mirrors or perfect generic derivation from one object.

TypeScript does not stay readable when we try to dynamically correlate:

- tool name
- input schema
- output schema
- AI SDK tool definition
- CLI runner

across separate runtime maps.

The better constraint is:

> Allow a few explicit mirrors, but make every mirror exhaustive and strictly typed from the same tool-name registry.

This trades clever generic correlation for boring, readable compile-time checks.

## Target Architecture

Keep all tool-related definitions under `packages/ai/src/tools`:

```txt
packages/ai/src/tools/
  definition.ts   # shared tool types and helper functions
  specs.ts        # canonical tool specs: names, schemas, descriptions, options
  runners.ts      # workspace implementations
  registry.ts     # typed AI SDK tools and typed CLI handlers
```

### `specs.ts`

This should be the canonical tool-name registry.

It owns:

- tool names
- descriptions
- input schemas
- output schemas
- provider options

Example shape:

```ts
export const toolSpecs = {
  read_file: {
    description: "Read the contents of a text file inside the workspace.",
    inputSchema: readFileInput,
    outputSchema: readFileOutput,
  },
  bash: {
    description: "Run a shell command from the workspace root.",
    inputSchema: bashInput,
    outputSchema: bashOutput,
    providerOptions: {
      anthropic: { cacheControl: { type: "ephemeral" } },
    },
  },
} as const;

export type ToolName = keyof typeof toolSpecs;
```

### `registry.ts`

This file should contain the explicit mirrors that TypeScript checks exhaustively.

Example shape:

```ts
export const tools = {
  read_file: tool(toolSpecs.read_file),
  bash: tool(toolSpecs.bash),
} satisfies AiToolMap<typeof toolSpecs>;

export const toolHandlers = {
  read_file: defineToolHandler(toolSpecs.read_file, readFile),
  bash: defineToolHandler(toolSpecs.bash, bash),
} satisfies ToolHandlerMap<typeof toolSpecs>;
```

If `toolSpecs.new_tool` exists but `tools.new_tool` or `toolHandlers.new_tool` is missing, TypeScript should fail.

If a runner accepts the wrong input or returns the wrong output, TypeScript should fail.

### `client.ts`

The client runtime should become small and boring.

It should use the derived handlers from the AI package:

```ts
async function runTool(name: string, input: unknown): Promise<unknown> {
  if (!isToolName(name)) {
    throw new Error(`Unknown tool: ${name}`);
  }

  return toolHandlers[name](root, input);
}
```

No executor map, no giant switch, and no generic schema/executor correlation trick should live in `client.ts`.

## Compile-Time Guarantees

Adding a new tool should produce compile-time errors until all required AI-package pieces are complete:

- the tool exists in `toolSpecs`
- the AI SDK tool exists in `tools`
- the CLI handler exists in `toolHandlers`
- the runner input matches the input schema
- the runner output matches the output schema

The server and CLI apps should not add imports, switches, or per-tool code when a new tool is added.

## Additional Cleanup

`instructions.ts` currently manually lists tool names. That is another hidden mirror.

Either derive the tool list from `toolSpecs`, or stop enumerating tool names manually in the instructions.

The CLI history validation should also move behind a helper exported from `newcode-ai/client`, so UI screens do not import tool internals directly.

## Implementation Steps

1. Add `packages/ai/src/tools/definition.ts`.
2. Move current schema declarations into `packages/ai/src/tools/specs.ts`.
3. Keep actual workspace implementations in `packages/ai/src/tools/runners.ts`.
4. Add `packages/ai/src/tools/registry.ts` with `tools` and `toolHandlers` mirrors checked with `satisfies`.
5. Simplify `packages/ai/src/client.ts` to run through `toolHandlers`.
6. Update `packages/ai/src/server.ts` to import `tools` from the registry.
7. Move CLI message validation into a helper exported by `newcode-ai/client`.
8. Derive or remove the manual tool list in `instructions.ts`.
9. Run verification from the repo root:

```sh
bun run check:cli
bun run check:server
bun run build:cli
bun run build:server
```

## Preferred Tradeoff

Use one canonical `toolSpecs` registry and a few explicit typed mirrors inside the AI package.

This is more readable than trying to avoid mirrors entirely, while still preventing half-implemented tools through TypeScript exhaustiveness checks.
