import { zValidator } from "@hono/zod-validator";
import {
  MessageRole,
  SessionEventKind,
  prisma,
  toJsonPayload,
} from "@newcode/db";
import {
  convertToModelMessages,
  consumeStream,
  generateId,
  pruneMessages,
  safeValidateUIMessages,
} from "ai";
import { Hono } from "hono";
import {
  allCodingTools,
  codingModelIdSchema,
  getCodingModel,
  modeSchema,
} from "newcode-ai";
import {
  type CodingAgentUIMessage,
  createCodingAgent,
  generateRecommendedNextPrompt,
} from "newcode-ai/server";
import { z } from "zod";
import { getPaymentsService } from "../lib/payments";
import { toDbMode } from "../lib/mode-mapping";
import type { AuthVariables } from "../middleware/auth";
import { type CreditVariables, requireCredits } from "../middleware/credits";

const chatParamSchema = z.object({ sessionId: z.string().min(1) });
const chatRequestSchema = z.object({
  messages: z.array(z.unknown()).min(1),
  mode: modeSchema,
  modelId: codingModelIdSchema,
});
const placeholderRequestSchema = z.object({
  messages: z.array(z.unknown()).min(1),
  mode: modeSchema,
  modelId: codingModelIdSchema,
});

const AGENT_CONTEXT_MAX_MODEL_MESSAGES = 12;

export const chatRoutes = new Hono<AuthVariables & CreditVariables>()
  .post(
    "/:sessionId",
    requireCredits(1),
    zValidator("param", chatParamSchema),
    zValidator("json", chatRequestSchema),
    async (c) => {
    const { sessionId } = c.req.valid("param");
    const { messages, mode, modelId } = c.req.valid("json");
    const userId = c.get("userId");
    const model = getCodingModel(modelId);
    const missingApiKey = getMissingProviderApiKey(model.provider);

    if (missingApiKey) {
      await prisma.sessionEvent.create({
        data: {
          kind: SessionEventKind.config_error,
          payload: { reason: `${missingApiKey} missing`, provider: model.provider },
        },
      });
      return c.text(
        `${missingApiKey} is not set. Set ${missingApiKey} and retry this completion.`,
        500,
      );
    }

    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    const validation = await safeValidateUIMessages<CodingAgentUIMessage>({
      messages,
      tools: allCodingTools,
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

    const agent = createCodingAgent(mode, modelId);

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
          mode: toDbMode(mode),
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

    // History can span multiple modes, so validate and convert it against the
    // full tool universe even when the active turn uses a narrower mode.
    const modelMessages = await convertToModelMessages(validation.data, {
      tools: allCodingTools,
    });
    const prunedModelMessages = pruneMessages({
      messages: modelMessages,
      reasoning: "all",
      toolCalls: "before-last-2-messages",
    }).slice(-AGENT_CONTEXT_MAX_MODEL_MESSAGES);

    const result = await agent.stream({
      prompt: prunedModelMessages,
      abortSignal: c.req.raw.signal,
    });

    return result.toUIMessageStreamResponse({
      headers: {
        "Cache-Control": "no-cache",
      },
      originalMessages: validation.data,
      sendReasoning: true,
      consumeSseStream: consumeStream,
      generateMessageId: generateId,
      onFinish: async ({ responseMessage: rawResponseMessage, isAborted, finishReason }) => {
        const responseMessage = rawResponseMessage as CodingAgentUIMessage;

        // Preserve the original UI messages for id reuse on automatic tool
        // roundtrips, but prune older model history before the next LLM call.
        await prisma.message.upsert({
          where: { id: responseMessage.id },
          create: {
            id: responseMessage.id,
            sessionId: session.id,
            role: MessageRole.assistant,
            mode: toDbMode(mode),
            model: modelId,
            payload: toJsonPayload(responseMessage),
          },
          update: {
            model: modelId,
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

        if (!isAborted) {
          try {
            await getPaymentsService().ingestUsage({
              externalCustomerId: userId,
              credits: 1,
              metadata: {
                sessionId: session.id,
                modelId,
                mode,
                finishReason: finishReason ?? "unknown",
                aborted: false,
              },
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await prisma.sessionEvent.create({
              data: {
                sessionId: session.id,
                kind: SessionEventKind.stream_error,
                payload: { message, source: "usage_ingestion" },
              },
            });
          }
        }
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
  )
  .post(
    "/:sessionId/placeholder",
    zValidator("param", chatParamSchema),
    zValidator("json", placeholderRequestSchema),
    async (c) => {
      const { sessionId } = c.req.valid("param");
      const { messages, modelId } = c.req.valid("json");
      const userId = c.get("userId");

      const session = await prisma.session.findFirst({
        where: { id: sessionId, userId },
      });
      if (!session) {
        return c.json({ error: "Session not found" }, 404);
      }

      const validation = await safeValidateUIMessages<CodingAgentUIMessage>({
        messages,
        tools: allCodingTools,
      });
      if (!validation.success) {
        return c.json(
          { error: "Invalid messages", message: validation.error.message },
          400,
        );
      }

      try {
        const modelMessages = await convertToModelMessages(validation.data, {
          tools: allCodingTools,
        });
        const prunedModelMessages = pruneMessages({
          messages: modelMessages,
          reasoning: "all",
          toolCalls: "before-last-2-messages",
        }).slice(-AGENT_CONTEXT_MAX_MODEL_MESSAGES);
        const placeholder = await generateRecommendedNextPrompt({
          messages: prunedModelMessages,
          abortSignal: c.req.raw.signal,
        });

        return c.json({ placeholder: placeholder.trim() });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await prisma.sessionEvent.create({
          data: {
            sessionId: session.id,
            kind: SessionEventKind.stream_error,
            payload: { message, source: "placeholder" },
          },
        });
        return c.json({ placeholder: "" });
      }
    },
  );

function getMissingProviderApiKey(provider: ReturnType<typeof getCodingModel>["provider"]) {
  switch (provider) {
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY ? null : "ANTHROPIC_API_KEY";
    case "openai":
      return process.env.OPENAI_API_KEY ? null : "OPENAI_API_KEY";
  }
}
