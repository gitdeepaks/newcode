const buildEnv = globalThis as typeof globalThis & {
  BUILD_SERVER_URL?: string;
  BUILD_CLERK_FRONTEND_API?: string;
  BUILD_CLERK_OAUTH_CLIENT_ID?: string;
  BUILD_CLERK_OAUTH_REDIRECT_URI?: string;
};

export const buildServerUrl = buildEnv.BUILD_SERVER_URL;
export const buildClerkFrontendApi = buildEnv.BUILD_CLERK_FRONTEND_API;
export const buildClerkOAuthClientId = buildEnv.BUILD_CLERK_OAUTH_CLIENT_ID;
export const buildClerkOAuthRedirectUri = buildEnv.BUILD_CLERK_OAUTH_REDIRECT_URI;
