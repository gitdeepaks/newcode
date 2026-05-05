import { app } from "./app";

const port = Number(process.env.PORT ?? 3000);
const server = Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`Hono server listening on ${server.url}`);
