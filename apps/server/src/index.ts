import { workspaceName } from "@newcode/shared";
import { Hono } from "hono";

const app = new Hono()
  .get("/", (c) => {
    return c.json({
      name: workspaceName,
      message: "Welcome to the Hono server.",
      runtime: "bun",
    });
  })
  .get("/health", (c) => {
    return c.json({ status: "ok" });
  });

const port = Number(process.env.PORT ?? 3000);
const server = Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`Hono server listening on ${server.url}`);
