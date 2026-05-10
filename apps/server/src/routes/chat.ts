import { zValidator } from "@hono/zod-validator";
import {
  MessageRole,
  SessionEventKind,
  prisma,
  toJsonPayload,
} from "@newcode/db";
import { createAgentUIStreamResponse, generateId, safeValidateUIMessages } from "ai";
import { Hono } from "hono";
import {
  CODING_AGENT_MODEL_ID,
  type CodingAgentUIMessage,
  codingAgent,
} from "newcode-ai/server";
import { z } from "zod";

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

    const validation = await safeValidateUIMessages<CodingAgentUIMessage>({
      messages,
      tools: codingAgent.tools,
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
          payload: toJsonPayload(lastMessage),
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

    return createAgentUIStreamResponse({
      agent: codingAgent,
      uiMessages: validation.data,
      headers: {
        "Cache-Control": "no-cache",
      },
      sendReasoning: true,
      generateMessageId: generateId,
      onFinish: async ({ responseMessage, isAborted, finishReason }) => {
        // `createAgentUIStreamResponse` defaults `originalMessages` to the
        // messages we sent in, so when the client posts back with a prior
        // assistant turn (sendAutomaticallyWhen-driven tool roundtrips), the
        // agent helper reuses that assistant message id and extends it. We
        // upsert keyed on id so the first roundtrip inserts and subsequent
        // ones update the same row with the appended content.
        await prisma.message.upsert({
          where: { id: responseMessage.id },
          create: {
            id: responseMessage.id,
            sessionId: session.id,
            role: MessageRole.assistant,
            model: CODING_AGENT_MODEL_ID,
            payload: toJsonPayload(responseMessage),
          },
          update: {
            model: CODING_AGENT_MODEL_ID,
            payload: toJsonPayload(responseMessage),
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
