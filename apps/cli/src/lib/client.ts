import { hc } from "hono/client";
import type { AppType } from "@newcode/server/app";
import { authConfigService } from "./auth/auth-config";
import { getValidAuthSession } from "./auth/oauth";
import { z } from "zod";
import { buildServerUrl } from "./build-env";

const serverUrlSchema = z.url().transform((value) => value.replace(/\/+$/, ""));
const BASE_URL = serverUrlSchema.parse(
  buildServerUrl ?? process.env.SERVER_URL ?? "http://localhost:3000",
);

export const client = hc<AppType>(BASE_URL, {
  headers: getAuthHeaders,
});

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const result = await getValidAuthSession(authConfigService.getSession());
  if (result.status !== "authenticated") {
    return {};
  }

  authConfigService.setSession(result.session);
  return { Authorization: `Bearer ${result.session.accessToken}` };
}
