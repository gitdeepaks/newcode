import { workspaceName } from "@newcode/shared";
import { Hono } from "hono";

const app = new Hono();

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
  });

export { app };
export type AppType = typeof routes;
