import { workspaceName } from "@newcode/shared";
import { anthropic } from "@ai-sdk/anthropic";
import { zValidator } from "@hono/zod-validator";
import { convertToModelMessages, safeValidateUIMessages, streamText } from "ai";
import { Hono } from "hono";
import { z } from "zod";

const app = new Hono();

const chatRequestSchema = z.object({
  messages: z.array(z.unknown()).min(1),
});

const routes = app
  .get("/", (c) => {
    return c.json({
      name: workspaceName,
      status: "ok",
      message: "Welcome to the Hono server.",
      runtime: "bun",
      timestamp: new Date().toISOString(),
    });
  })
  .get("/health", (c) => {
    return c.json({ status: "ok" });
  })
  .post("/chat", zValidator("json", chatRequestSchema), async (c) => {
    if (!process.env.ANTHROPIC_API_KEY) {
      return c.text(
        "ANTHROPIC_API_KEY is not set. Set ANTHROPIC_API_KEY and retry this completion.",
        500,
      );
    }

    const { messages } = c.req.valid("json");

    const validation = await safeValidateUIMessages({ messages });
    if (!validation.success) {
      return c.json(
        { error: "Invalid messages", message: validation.error.message },
        400,
      );
    }

    const result = streamText({
      model: anthropic("claude-sonnet-4-6"),
      system: "You are a helpful assistant.",
      messages: await convertToModelMessages(validation.data),
    });

    return result.toUIMessageStreamResponse({
      headers: {
        "Cache-Control": "no-cache",
      },
    });
  });

export { app };
export type AppType = typeof routes;
