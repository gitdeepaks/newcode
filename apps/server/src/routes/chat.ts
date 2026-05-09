import { anthropic } from "@ai-sdk/anthropic";
import { zValidator } from "@hono/zod-validator";
import { MessageRole, SessionEventKind, prisma } from "@newcode/db";
import {
  convertToModelMessages,
  generateId,
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

// Single hardcoded model for now. When the app goes multi-model, this becomes
// per-request (request body or session config) and is what we persist on the
// assistant message row.
const MODEL_ID = "claude-sonnet-4-6";

const chatParamSchema = z.object({ sessionId: z.string().min(1) });
const chatRequestSchema = z.object({
  messages: z.array(z.unknown()).min(1),
});

export const chatRoutes = new Hono().post(
  "/:sessionId",
  zValidator("param", chatParamSchema),
  zValidator("json", chatRequestSchema),
  async (c) => {
    const { sessionId } = c.req.valid("param");
    const { messages } = c.req.valid("json");

    if (!process.env.ANTHROPIC_API_KEY) {
      await prisma.sessionEvent.create({
        data: {
          kind: SessionEventKind.config_error,
          payload: { reason: "ANTHROPIC_API_KEY missing" },
        },
      });
      return c.text(
        "ANTHROPIC_API_KEY is not set. Set ANTHROPIC_API_KEY and retry this completion.",
        500,
      );
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    const validation = await safeValidateUIMessages<ChatUIMessage>({
      messages,
      tools,
    });
    if (!validation.success) {
      await prisma.sessionEvent.create({
        data: {
          sessionId: session.id,
          kind: SessionEventKind.validation_error,
          payload: { message: validation.error.message },
        },
      });
      return c.json(
        { error: "Invalid messages", message: validation.error.message },
        400,
      );
    }

    // Persist only the tail of the messages array — the rest is prior history
    // already written on previous turns. Upsert keyed by UIMessage.id so a
    // client retry stays idempotent.
    const lastMessage = validation.data.at(-1);
    if (lastMessage && lastMessage.role === "user") {
      await prisma.message.upsert({
        where: { id: lastMessage.id },
        create: {
          id: lastMessage.id,
          sessionId: session.id,
          role: MessageRole.user,
          payload: lastMessage as unknown as object,
        },
        update: {},
      });
    }

    await prisma.sessionEvent.create({
      data: {
        sessionId: session.id,
        kind: SessionEventKind.stream_start,
        payload: {},
      },
    });

    const result = streamText({
      model: anthropic(MODEL_ID),
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
      generateMessageId: generateId,
      onFinish: async ({ responseMessage, isAborted, finishReason }) => {
        await prisma.message.create({
          data: {
            id: responseMessage.id,
            sessionId: session.id,
            role: MessageRole.assistant,
            model: MODEL_ID,
            payload: responseMessage as unknown as object,
          },
        });
        await prisma.sessionEvent.create({
          data: {
            sessionId: session.id,
            kind: isAborted
              ? SessionEventKind.aborted
              : SessionEventKind.stream_finish,
            payload: { finishReason: finishReason ?? null },
          },
        });
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : String(error);
        // onError must return a string synchronously; fire-and-forget the log.
        prisma.sessionEvent
          .create({
            data: {
              sessionId: session.id,
              kind: SessionEventKind.stream_error,
              payload: { message },
            },
          })
          .catch(() => {});
        return message;
      },
    });
  },
);
