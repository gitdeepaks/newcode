import { Hono } from "hono";
import { chatRoutes } from "./routes/chat";
import { sessionRoutes } from "./routes/sessions";

const routes = new Hono()
  .route("/sessions", sessionRoutes)
  .route("/chat", chatRoutes);

export const app = routes;
export type AppType = typeof routes;
export type { ChatUIMessage } from "./routes/chat";
