import { Hono } from "hono";
import { authMiddleware } from "./middleware/auth";
import { chatRoutes } from "./routes/chat";
import { sessionRoutes } from "./routes/sessions";

const routes = new Hono()
  .use("*", authMiddleware)
  .route("/sessions", sessionRoutes)
  .route("/chat", chatRoutes);

export const app = routes;
export type AppType = typeof routes;
