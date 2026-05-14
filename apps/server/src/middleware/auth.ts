import {
  type AuthObject,
  createClerkClient,
  type ClerkClient,
} from "@clerk/backend";
import { createMiddleware } from "hono/factory";

export type AuthVariables = {
  Variables: {
    auth: Extract<AuthObject, { isAuthenticated: true }>;
    userId: string;
  };
};

let clerkClient: ClerkClient | undefined;

function getClerkClient(): ClerkClient | { error: string } {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return { error: "CLERK_SECRET_KEY is not set" };
  }

  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return { error: "CLERK_PUBLISHABLE_KEY is not set" };
  }

  clerkClient ??= createClerkClient({ publishableKey, secretKey });
  return clerkClient;
}

export const authMiddleware = createMiddleware<AuthVariables>(async (c, next) => {
  const client = getClerkClient();
  if ("error" in client) {
    return c.json({ error: client.error }, 500);
  }

  const requestState = await client.authenticateRequest(c.req.raw, {
    acceptsToken: ["session_token", "oauth_token"],
  });
  if (!requestState.isAuthenticated) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const auth = requestState.toAuth();
  if (!("userId" in auth) || typeof auth.userId !== "string") {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("auth", auth);
  c.set("userId", auth.userId);
  await next();
});
