import { Hono } from "hono";
import { chatRoutes } from "./routes/chat";

const routes = new Hono().route("/chat", chatRoutes);

export const app = routes;
export type AppType = typeof routes;
export type {
  ChatDataParts,
  ChatMetadata,
  ChatTools,
  ChatUIMessage,
} from "./routes/chat";
