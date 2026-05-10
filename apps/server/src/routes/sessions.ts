import { zValidator } from "@hono/zod-validator";
import { prisma } from "@newcode/db";
import { Hono } from "hono";
import { z } from "zod";

const sessionParamSchema = z.object({ id: z.string().min(1) });

export const sessionRoutes = new Hono()
  .post("/", async (c) => {
    const session = await prisma.session.create({ data: {} });
    return c.json({ id: session.id }, 201);
  })
  .get(
    "/:id/messages",
    zValidator("param", sessionParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");

      const session = await prisma.session.findUnique({ where: { id } });
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
      return c.json({ messages: records.map((m) => m.payload) });
    },
  );
