import { zValidator } from "@hono/zod-validator";
import { prisma } from "@newcode/db";
import { Hono } from "hono";
import { z } from "zod";
import type { ChatUIMessage } from "./chat";

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

      return c.json({
        messages: records.map((m) => m.payload as unknown as ChatUIMessage),
      });
    },
  );
