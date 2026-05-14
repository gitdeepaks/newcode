import * as oauth from "oauth4webapi";
import open from "open";
import type { AuthSession } from "./auth-config";
import { startCallbackServer } from "./callback-server";
import { getAuthEnv } from "./env";

export type LoginResult =
  | { status: "success"; session: AuthSession }
  | { status: "cancelled" }
  | { status: "timeout" }
  | { status: "error"; error: Error; authorizeUrl?: string };

export type AuthSessionResult =
  | { status: "authenticated"; session: AuthSession }
  | { status: "signed-out" }
  | { status: "error"; error: Error };

export type LogoutResult =
  | { status: "success" }
  | { status: "local-only"; error: Error };

const refreshBufferMs = 60_000;

export async function loginWithBrowser(): Promise<LoginResult> {
  let authorizeUrl: string | undefined;

  try {
    const env = getAuthEnv();
    const callbackServer = startCallbackServer(env.CLERK_OAUTH_REDIRECT_URI);

    try {
      const authorizationServer = buildAuthorizationServer(env.CLERK_FRONTEND_API);
      const client: oauth.Client = { client_id: env.CLERK_OAUTH_CLIENT_ID };

      const codeVerifier = oauth.generateRandomCodeVerifier();
      const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);
      const state = oauth.generateRandomState();
      const nonce = oauth.generateRandomNonce();

      authorizeUrl = buildAuthorizeUrl({
        authorizationEndpoint: authorizationServer.authorization_endpoint,
        clientId: client.client_id,
        redirectUri: callbackServer.redirectUri,
        codeChallenge,
        state,
        nonce,
      });

      await open(authorizeUrl);

      const callback = await callbackServer.waitForCallback();

      if (callback.status === "timeout") {
        return { status: "timeout" };
      }

      if (callback.data.error) {
        if (callback.data.error === "access_denied") {
          return { status: "cancelled" };
        }

        return {
          status: "error",
          error: new Error(callback.data.errorDescription ?? callback.data.error),
          authorizeUrl,
        };
      }

      if (!callback.data.code) {
        return { status: "cancelled" };
      }

      const callbackParameters = oauth.validateAuthResponse(
        authorizationServer,
        client,
        new URLSearchParams({ code: callback.data.code, state: callback.data.state ?? "" }),
        state,
      );

      const tokenResponse = await oauth.authorizationCodeGrantRequest(
        authorizationServer,
        client,
        oauth.None(),
        callbackParameters,
        callbackServer.redirectUri,
        codeVerifier,
      );
      const tokens = await oauth.processAuthorizationCodeResponse(
        authorizationServer,
        client,
        tokenResponse,
        { expectedNonce: nonce },
      );
      const userInfoResponse = await oauth.userInfoRequest(
        authorizationServer,
        client,
        tokens.access_token,
      );
      const userInfo = await oauth.processUserInfoResponse(
        authorizationServer,
        client,
        oauth.skipSubjectCheck,
        userInfoResponse,
      );

      return { status: "success", session: toAuthSession(tokens, userInfo) };
    } finally {
      callbackServer.stop();
    }
  } catch (error) {
    return { status: "error", error: toError(error), authorizeUrl };
  }
}

export async function getValidAuthSession(
  session: AuthSession | null,
): Promise<AuthSessionResult> {
  if (!session) {
    return { status: "signed-out" };
  }

  if (!shouldRefreshSession(session)) {
    return { status: "authenticated", session };
  }

  if (!session.refreshToken) {
    return { status: "signed-out" };
  }

  try {
    const refreshedSession = await refreshAuthSession(session);
    return { status: "authenticated", session: refreshedSession };
  } catch (error) {
    return { status: "error", error: toError(error) };
  }
}

export async function refreshAuthSession(session: AuthSession): Promise<AuthSession> {
  if (!session.refreshToken) {
    throw new Error("No refresh token is available");
  }

  const env = getAuthEnv();
  const authorizationServer = buildAuthorizationServer(env.CLERK_FRONTEND_API);
  const client: oauth.Client = { client_id: env.CLERK_OAUTH_CLIENT_ID };
  const tokenResponse = await oauth.refreshTokenGrantRequest(
    authorizationServer,
    client,
    oauth.None(),
    session.refreshToken,
  );
  const tokens = await oauth.processRefreshTokenResponse(
    authorizationServer,
    client,
    tokenResponse,
  );
  const userInfoResponse = await oauth.userInfoRequest(
    authorizationServer,
    client,
    tokens.access_token,
  );
  const userInfo = await oauth.processUserInfoResponse(
    authorizationServer,
    client,
    oauth.skipSubjectCheck,
    userInfoResponse,
  );

  return toAuthSession(tokens, userInfo, session);
}

export async function logoutAuthSession(session: AuthSession | null): Promise<LogoutResult> {
  if (!session?.refreshToken) {
    return { status: "success" };
  }

  try {
    const env = getAuthEnv();
    const authorizationServer = buildAuthorizationServer(env.CLERK_FRONTEND_API);
    const client: oauth.Client = { client_id: env.CLERK_OAUTH_CLIENT_ID };
    const response = await oauth.revocationRequest(
      authorizationServer,
      client,
      oauth.None(),
      session.refreshToken,
      { additionalParameters: { token_type_hint: "refresh_token" } },
    );
    await oauth.processRevocationResponse(response);
    return { status: "success" };
  } catch (error) {
    return { status: "local-only", error: toError(error) };
  }
}

function buildAuthorizationServer(base: string): oauth.AuthorizationServer {
  return {
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    revocation_endpoint: `${base}/oauth/token/revoke`,
    userinfo_endpoint: `${base}/oauth/userinfo`,
    introspection_endpoint: `${base}/oauth/token_info`,
  };
}

function buildAuthorizeUrl(input: {
  authorizationEndpoint: string | undefined;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
  nonce: string;
}) {
  if (!input.authorizationEndpoint) {
    throw new Error("Missing Clerk authorization endpoint");
  }

  const url = new URL(input.authorizationEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("scope", "openid profile email offline_access");
  url.searchParams.set("prompt", "login");
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  return url.toString();
}

function toAuthSession(
  tokens: oauth.TokenEndpointResponse,
  userInfo: oauth.UserInfoResponse,
  previousSession?: AuthSession,
): AuthSession {
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? previousSession?.refreshToken,
    idToken: tokens.id_token ?? previousSession?.idToken,
    expiresAt: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : undefined,
    tokenType: tokens.token_type,
    scope: tokens.scope,
    user: {
      sub: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      imageUrl: userInfo.picture,
    },
  };
}

function shouldRefreshSession(session: AuthSession) {
  if (!session.expiresAt) {
    return false;
  }

  const expiresAt = Date.parse(session.expiresAt);
  if (Number.isNaN(expiresAt)) {
    return true;
  }

  return expiresAt - Date.now() <= refreshBufferMs;
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}
