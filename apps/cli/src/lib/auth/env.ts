import { z } from "zod";

const authEnvSchema = z.object({
  CLERK_FRONTEND_API: z.url().transform((value) => value.replace(/\/+$/, "")),
  CLERK_OAUTH_CLIENT_ID: z.string().min(1),
  CLERK_OAUTH_REDIRECT_URI: z.url().default("http://127.0.0.1:8976/oauth/callback"),
});

export type AuthEnv = z.infer<typeof authEnvSchema>;

export function getAuthEnv() {
  return authEnvSchema.parse({
    ...process.env,
    CLERK_FRONTEND_API:
      BUILD_CLERK_FRONTEND_API ?? process.env.CLERK_FRONTEND_API,
    CLERK_OAUTH_CLIENT_ID:
      BUILD_CLERK_OAUTH_CLIENT_ID ?? process.env.CLERK_OAUTH_CLIENT_ID,
    CLERK_OAUTH_REDIRECT_URI:
      BUILD_CLERK_OAUTH_REDIRECT_URI ?? process.env.CLERK_OAUTH_REDIRECT_URI,
  });
}
