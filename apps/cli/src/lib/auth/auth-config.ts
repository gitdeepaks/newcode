import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import { getConfigRoot } from "../config-paths";

const authUserSchema = z.object({
  sub: z.string(),
  email: z.string().optional(),
  name: z.string().optional(),
  imageUrl: z.string().optional(),
});

const authSessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  idToken: z.string().optional(),
  expiresAt: z.string().optional(),
  tokenType: z.string().optional(),
  scope: z.string().optional(),
  user: authUserSchema.optional(),
});

export type AuthSession = z.infer<typeof authSessionSchema>;

const authConfigPath = join(getConfigRoot(), "auth.json");

export const authConfigService = {
  getSession() {
    return readAuthSession();
  },

  setSession(session: AuthSession) {
    writeAuthSession(authSessionSchema.parse(session));
  },

  clearSession() {
    deleteAuthSession();
  },
};

function readAuthSession(): AuthSession | null {
  if (!existsSync(authConfigPath)) {
    return null;
  }

  try {
    return authSessionSchema.parse(JSON.parse(readFileSync(authConfigPath, "utf8")));
  } catch {
    return null;
  }
}

function writeAuthSession(session: AuthSession) {
  mkdirSync(dirname(authConfigPath), { recursive: true });

  const temporaryPath = `${authConfigPath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(session, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  renameSync(temporaryPath, authConfigPath);
  chmodSync(authConfigPath, 0o600);
}

function deleteAuthSession() {
  try {
    rmSync(authConfigPath, { force: true });
  } catch {
    // Logout should be idempotent even when the config file is already gone.
  }
}
