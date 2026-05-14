# Browser-Based CLI Authentication Plan

## Goals

Add browser-based Clerk authentication for the TUI/CLI only.

- `/login` starts an OAuth Authorization Code + PKCE flow.
- The browser opens to Clerk's sign-in page.
- Login status is communicated through the existing toast API.
- Auth session data persists separately from theme config.
- No server routes, server clients, or server wiring are added.
- Clerk OAuth is configured as public/native, so no client secret is stored or sent.

## Non-Goals

- Do not modify `apps/server`.
- Do not wire authentication to Hono RPC or `apps/cli/src/lib/client.ts`.
- Do not store `CLERK_OAUTH_CLIENT_SECRET`.
- Do not change existing theme persistence unless necessary.
- Do not introduce a larger command framework refactor for this first pass.

## 1. Add OAuth Dependencies

Add dependencies to `apps/cli`:

- `oauth4webapi`
- `open`

Reasons:

- `oauth4webapi` supports OAuth 2.0/OIDC, PKCE, and token exchange without coupling auth to Clerk SDKs or the app server.
- `open` provides cross-platform browser opening instead of maintaining custom platform-specific process spawning.

## 2. Create CLI Auth Modules

Create a focused auth module directory:

```txt
apps/cli/src/lib/auth/
  auth-config.ts
  callback-server.ts
  env.ts
  oauth.ts
```

Responsibilities:

- `oauth.ts`: Own the Clerk OAuth/PKCE flow.
- `callback-server.ts`: Own the temporary loopback callback listener.
- `auth-config.ts`: Own auth session persistence.
- `env.ts`: Own auth environment validation.

Keep these modules CLI-local. They must not import from `apps/server` or use the Hono RPC client.

## 3. Build Clerk OAuth Endpoints

Use `CLERK_FRONTEND_API` from `.env`.

Given:

```txt
CLERK_FRONTEND_API=https://example.clerk.accounts.dev
```

Construct:

```txt
discovery:     ${base}/.well-known/openid-configuration
authorize:     ${base}/oauth/authorize
token:         ${base}/oauth/token
userinfo:      ${base}/oauth/userinfo
introspection: ${base}/oauth/token_info
```

The implementation can use discovery if helpful, but these URLs are directly derivable from `CLERK_FRONTEND_API`.

## 4. Validate Auth Environment

Add `apps/cli/src/lib/auth/env.ts`.

Validate with Zod:

- `CLERK_FRONTEND_API`
- `CLERK_OAUTH_CLIENT_ID`

Ignore `CLERK_OAUTH_CLIENT_SECRET` for this flow.

Security note to capture in code:

- This is a distributed/native-style CLI auth flow.
- Clerk OAuth is public.
- PKCE is the intended protection.
- A client secret must not be embedded, stored, or sent by the CLI.

## 5. Implement Local Callback Server

Add `apps/cli/src/lib/auth/callback-server.ts`.

Requirements:

- Use Bun's local HTTP server, not the app server.
- Bind only to `127.0.0.1`.
- Pick an available localhost port.
- Use callback path `/oauth/callback`.
- Return minimal success HTML, for example: `You can return to Newcode.`
- Return minimal error HTML for OAuth errors.
- Always stop the listener after success, error, cancellation, or timeout.
- Return parsed callback data:
  - `code`
  - `state`
  - `error`
  - `error_description`

Suggested timeout handling:

- Use a finite timeout for the browser flow.
- Return `{ status: "timeout" }` when no callback arrives in time.
- Ensure the Bun server is stopped in all exit paths.

## 6. Implement OAuth + PKCE Flow

Add `apps/cli/src/lib/auth/oauth.ts`.

Expose a function such as:

```ts
export async function loginWithBrowser(): Promise<LoginResult>
```

Flow:

1. Validate auth env.
2. Build Clerk OAuth endpoints from `CLERK_FRONTEND_API`.
3. Generate PKCE verifier and challenge.
4. Generate random `state`.
5. Generate `nonce` if using OIDC `id_token` validation.
6. Start the local callback server.
7. Build the authorize URL.
8. Open the browser with `open`.
9. Wait for callback.
10. Validate returned `state`.
11. Exchange authorization `code` for tokens using PKCE.
12. Fetch userinfo after successful token exchange.
13. Return a typed result.

Authorize URL parameters:

```txt
response_type=code
client_id=<CLERK_OAUTH_CLIENT_ID>
redirect_uri=http://127.0.0.1:<port>/oauth/callback
scope=openid profile email offline_access
code_challenge=<challenge>
code_challenge_method=S256
state=<state>
nonce=<nonce>
```

Do not include `client_secret` in the token exchange.

Suggested result type:

```ts
type LoginResult =
  | { status: "success"; session: AuthSession }
  | { status: "cancelled" }
  | { status: "timeout" }
  | { status: "error"; error: Error; authorizeUrl?: string };
```

If browser opening fails, return an error that includes the authorize URL so the UI can show it to the user.

## 7. Persist Auth Session

Add `apps/cli/src/lib/auth/auth-config.ts`.

Store auth separately from theme config, but in the same config root:

```txt
$XDG_CONFIG_HOME/newcode/auth.json
```

Fallback:

```txt
~/.config/newcode/auth.json
```

Validate with Zod.

Persist only what the CLI needs:

- `accessToken`
- `refreshToken`, if Clerk returns one
- `idToken`, if needed
- `expiresAt`
- `tokenType`
- `scope`
- basic user profile from userinfo

Suggested session shape:

```ts
type AuthSession = {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt?: string;
  tokenType?: string;
  scope?: string;
  user?: {
    sub: string;
    email?: string;
    name?: string;
    imageUrl?: string;
  };
};
```

File permissions and write behavior:

- Create the config directory if missing.
- Write `auth.json` with mode `0o600`.
- On existing files, call `chmodSync(path, 0o600)` after writes.
- Use atomic-ish writes:
  - write a temporary file with mode `0o600`
  - rename it into place
  - chmod the final path to `0o600`

Do not change theme persistence behavior unless necessary.

## 8. Shared Config Root Helper

Add a small shared config root helper, for example:

```txt
apps/cli/src/lib/config-paths.ts
```

Expose only the common config root for now:

```ts
getConfigRoot() // ~/.config/newcode or $XDG_CONFIG_HOME/newcode
```

Use this helper from `auth-config.ts`.

Do not refactor `apps/cli/src/lib/config.ts` theme persistence in this change. Theme persistence currently works and can be migrated later if desired.

Expected files after this change:

```txt
~/.config/newcode/config.json  // existing theme config
~/.config/newcode/auth.json    // new auth session config
```

## 9. Wire `/login` Command

This repo currently uses prompt commands, not `chat-commands.ts`.

Current command files:

```txt
apps/cli/src/lib/prompt-commands.ts
apps/cli/src/hooks/use-prompt-command.ts
```

Update `apps/cli/src/lib/prompt-commands.ts` with a suggestion:

```ts
{
  name: "/login",
  description: "Sign in with Clerk",
}
```

Update `apps/cli/src/hooks/use-prompt-command.ts` with command execution.

Expected toast behavior:

- Before auth:
  - `toast.info("Opening browser for sign-in...", { duration: 6000 })`
- On success:
  - save session
  - `toast.success("Signed in", { description: user email/name })`
- On timeout or cancelled:
  - `toast.info("Sign-in cancelled")`
- On error:
  - `toast.error("Sign-in failed", { description })`

## 10. Keep Async Command Handling Minimal

Current `usePromptCommand()` returns a synchronous command handler.

For the first implementation:

- Add a named async helper inside `usePromptCommand`, such as `login()`.
- In the `/login` switch case, call `void login()`.
- Ensure `login()` catches and reports its own errors through toast.

This keeps existing `PromptTextArea`, `home-screen.tsx`, and `chat-screen.tsx` handling unchanged.

A broader command abstraction can be introduced later if needed.

## 11. Toast API

No major toast API changes are needed.

The existing API already supports:

- `toast.info`
- `toast.success`
- `toast.error`
- descriptions
- durations

Use longer durations for login state:

- opening browser: `6000`
- success/error: default or `6000`

Do not add persistent or updateable toast behavior initially. Keep the change small.

## 12. Verification

Run CLI typecheck:

```sh
bunx tsc -p apps/cli/tsconfig.json --noEmit
```

Run CLI build:

```sh
bun run build:cli
```

Manual test:

1. Ensure `.env` contains:
   - `CLERK_FRONTEND_API`
   - `CLERK_OAUTH_CLIENT_ID`
2. Start the CLI.
3. Run `/login`.
4. Confirm browser opens Clerk.
5. Complete sign-in.
6. Confirm TUI receives a success toast.
7. Confirm `auth.json` exists at:
   - `$XDG_CONFIG_HOME/newcode/auth.json`, or
   - `~/.config/newcode/auth.json`
8. Confirm `auth.json` has `0600` permissions.
9. Confirm no server files changed.
10. Confirm existing theme persistence still works.

## Follow-Up Ideas

- Add `/logout` to remove `auth.json`.
- Add `/whoami` or account status display.
- Add token refresh support if/when the CLI needs authenticated API calls.
- Move existing theme config to the shared config root helper in a separate cleanup.
