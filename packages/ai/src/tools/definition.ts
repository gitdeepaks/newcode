import { tool } from "ai";
import type { z } from "zod";

export type ToolSpec<
  TInput = unknown,
  TOutput = unknown,
> = {
  description: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  providerOptions?: Parameters<typeof tool>[0]["providerOptions"];
};

export type ToolSpecMap = Record<string, ToolSpec>;

export type ToolInput<TSpec extends ToolSpec> = TSpec extends ToolSpec<
  infer TInput,
  unknown
>
  ? TInput
  : never;
export type ToolOutput<TSpec extends ToolSpec> = TSpec extends ToolSpec<
  unknown,
  infer TOutput
>
  ? TOutput
  : never;

export type AiToolMap<TSpecs extends ToolSpecMap> = {
  [K in keyof TSpecs]: unknown;
};

export type ToolHandler<TSpec extends ToolSpec> = (
  workspaceRoot: string,
  input: unknown,
) => Promise<ToolOutput<TSpec>>;

export type ToolHandlerMap<TSpecs extends ToolSpecMap> = {
  [K in keyof TSpecs]: ToolHandler<TSpecs[K]>;
};

export type ToolRunner<TSpec extends ToolSpec> = (
  workspaceRoot: string,
  input: ToolInput<TSpec>,
) => Promise<ToolOutput<TSpec>>;

export function defineAiTool<TSpec extends ToolSpec>(spec: TSpec) {
  return tool({
    description: spec.description,
    inputSchema: spec.inputSchema,
    outputSchema: spec.outputSchema,
    providerOptions: spec.providerOptions,
  });
}

export function defineToolHandler<TInput, TOutput>(
  spec: ToolSpec<TInput, TOutput>,
  runner: ToolRunner<ToolSpec<TInput, TOutput>>,
): ToolHandler<ToolSpec<TInput, TOutput>> {
  return async function toolHandler(workspaceRoot, input) {
    const parsedInput = spec.inputSchema.parse(input);
    const output = await runner(workspaceRoot, parsedInput);
    return spec.outputSchema.parse(output);
  };
}
