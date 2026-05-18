export const buildServerUrl =
  typeof BUILD_SERVER_URL === "undefined" ? undefined : BUILD_SERVER_URL;
export const buildClerkFrontendApi =
  typeof BUILD_CLERK_FRONTEND_API === "undefined"
    ? undefined
    : BUILD_CLERK_FRONTEND_API;
export const buildClerkOAuthClientId =
  typeof BUILD_CLERK_OAUTH_CLIENT_ID === "undefined"
    ? undefined
    : BUILD_CLERK_OAUTH_CLIENT_ID;
export const buildClerkOAuthRedirectUri =
  typeof BUILD_CLERK_OAUTH_REDIRECT_URI === "undefined"
    ? undefined
    : BUILD_CLERK_OAUTH_REDIRECT_URI;
