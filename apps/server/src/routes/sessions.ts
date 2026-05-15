import { zValidator } from "@hono/zod-validator";
import { prisma } from "@newcode/db";
import { Hono } from "hono";
import { z } from "zod";
import { fromDbMode } from "../lib/mode-mapping";
import type { AuthVariables } from "../middleware/auth";

const sessionParamSchema = z.object({ id: z.string().min(1) });
const messagePreviewPayloadSchema = z.object({
  parts: z.array(
    z.object({
      type: z.literal("text"),
      text: z.string().trim().min(1),
    }),
  ),
});

export const sessionRoutes = new Hono<AuthVariables>()
  .get("/", async (c) => {
    const userId = c.get("userId");

    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        messages: {
          where: { role: "user" },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { payload: true },
        },
      },
    });

    return c.json({
      sessions: sessions.map((session) => ({
        id: session.id,
        title: getSessionTitle(
          session.title,
          getMessagePreview(session.messages[0]?.payload),
        ),
        updatedAt: session.updatedAt,
      })),
    });
  })
  .post("/", async (c) => {
    const userId = c.get("userId");

    const session = await prisma.session.create({ data: { userId } });
    return c.json({ id: session.id }, 201);
  })
  .get(
    "/:id/messages",
    zValidator("param", sessionParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const userId = c.get("userId");

      const session = await prisma.session.findFirst({ where: { id, userId } });
      if (!session) {
        return c.json({ error: "Session not found" }, 404);
      }

      const records = await prisma.message.findMany({
        where: { sessionId: id },
        orderBy: { createdAt: "asc" },
      });

      // Stored payloads are written by the chat route after passing through
      // `safeValidateUIMessages`, so they're already valid `CodingAgentUIMessage`
      // shapes. The CLI re-validates on receipt — that's where the typed
      // narrowing lands (Hono RPC's JSON serialization widens the union).
      return c.json({
        messages: records.map((m) => ({
          mode: fromDbMode(m.mode),
          model: m.model,
          createdAt: m.createdAt.toISOString(),
          payload: m.payload,
        })),
      });
    },
  );

function getMessagePreview(payload: unknown) {
  const result = messagePreviewPayloadSchema.safeParse(payload);
  if (!result.success) {
    return null;
  }

  return result.data.parts[0]?.text ?? null;
}

function getSessionTitle(title: string | null, messagePreview: string | null) {
  if (title && title !== "Session") {
    return title;
  }

  return messagePreview ?? title;
}
