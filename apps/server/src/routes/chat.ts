import { anthropic } from "@ai-sdk/anthropic";
import { zValidator } from "@hono/zod-validator";
import {
  convertToModelMessages,
  safeValidateUIMessages,
  stepCountIs,
  streamText,
  tool,
  type InferUITools,
  type UIDataTypes,
  type UIMessage,
} from "ai";
import { Hono } from "hono";
import { z } from "zod";

// Minimal tool set — kept here so the inferred types flow into ChatUIMessage
// and the CLI's <ChatMessage> tool branches have something to render.
const tools = {
  add: tool({
    description:
      "Add two numbers and return their sum. Throws if either number is negative.",
    inputSchema: z.object({
      a: z.number().describe("First addend."),
      b: z.number().describe("Second addend."),
    }),
    execute: async ({ a, b }: { a: number; b: number }) => {
      if (a < 0 || b < 0) {
        throw new Error("Negative numbers are not supported by the add tool.");
      }
      return { sum: a + b };
    },
  }),
};

// Single source of truth for the chat message shape. ChatTools is inferred
// from the server-side tool set, so the CLI's part renderers narrow to the
// real tool union for free.
export type ChatTools = InferUITools<typeof tools>;
export type ChatDataParts = UIDataTypes;
export type ChatMetadata = unknown;
export type ChatUIMessage = UIMessage<ChatMetadata, ChatDataParts, ChatTools>;

const chatRequestSchema = z.object({
  messages: z.array(z.unknown()).min(1),
});

export const chatRoutes = new Hono().post(
  "/",
  zValidator("json", chatRequestSchema),
  async (c) => {
    if (!process.env.ANTHROPIC_API_KEY) {
      return c.text(
        "ANTHROPIC_API_KEY is not set. Set ANTHROPIC_API_KEY and retry this completion.",
        500,
      );
    }

    const { messages } = c.req.valid("json");

    const validation = await safeValidateUIMessages<ChatUIMessage>({
      messages,
      tools,
    });
    if (!validation.success) {
      return c.json(
        { error: "Invalid messages", message: validation.error.message },
        400,
      );
    }

    const result = streamText({
      model: anthropic("claude-sonnet-4-6"),
      system:
        "You are a helpful assistant. When the user asks for a sum, call the `add` tool with the two numbers. Before answering, take a moment to reason briefly about what to do.",
      messages: await convertToModelMessages(validation.data),
      tools,
      stopWhen: stepCountIs(5),
      providerOptions: {
        anthropic: {
          thinking: { type: "enabled", budgetTokens: 1024 },
        },
      },
    });

    return result.toUIMessageStreamResponse({
      headers: {
        "Cache-Control": "no-cache",
      },
      sendReasoning: true,
    });
  },
);
