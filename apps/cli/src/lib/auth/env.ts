import { z } from "zod";
import {
  buildClerkFrontendApi,
  buildClerkOAuthClientId,
  buildClerkOAuthRedirectUri,
} from "../build-env";

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
      buildClerkFrontendApi ?? process.env.CLERK_FRONTEND_API,
    CLERK_OAUTH_CLIENT_ID:
      buildClerkOAuthClientId ?? process.env.CLERK_OAUTH_CLIENT_ID,
    CLERK_OAUTH_REDIRECT_URI:
      buildClerkOAuthRedirectUri ?? process.env.CLERK_OAUTH_REDIRECT_URI,
  });
}
