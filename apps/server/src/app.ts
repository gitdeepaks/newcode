import { Hono } from "hono";
import { authMiddleware } from "./middleware/auth";
import { chatRoutes } from "./routes/chat";
import { paymentRedirectRoutes, paymentRoutes } from "./routes/payments";
import { sessionRoutes } from "./routes/sessions";

const routes = new Hono()
  .route("/payments", paymentRedirectRoutes)
  .use("*", authMiddleware)
  .route("/sessions", sessionRoutes)
  .route("/chat", chatRoutes)
  .route("/payments", paymentRoutes);

export const app = routes;
export type AppType = typeof routes;
