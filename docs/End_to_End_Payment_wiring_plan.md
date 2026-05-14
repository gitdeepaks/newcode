# End-to-End Payment Wiring Plan

## Goals

Wire the existing server payments endpoints into `apps/cli` so authenticated users can:

- Start a Polar checkout from the TUI with `/upgrade`.
- View their current credits usage from the TUI with `/usage`.
- Understand and recover from out-of-credits chat failures.

The server already exposes billing routes through the shared Hono `AppType`, so the CLI should consume those routes through the existing typed client from `apps/cli/src/lib/client.ts`.

## Existing Context

Server payment routes are mounted under `/payments` and are available to the CLI through Hono RPC:

```txt
GET  /payments/balance
GET  /payments/usage
POST /payments/checkout
GET  /payments/checkout/success
GET  /payments/checkout/cancel
```

Expected response contracts:

```ts
// GET /payments/usage
{
  granted: number;
  used: number;
  remaining: number;
  balance: number;
}

// POST /payments/checkout
{
  id: string;
  url: string;
}

// 402 from paid chat endpoints
{
  error: "Insufficient credits";
  code: "INSUFFICIENT_CREDITS";
  balance: {
    granted: number;
    used: number;
    remaining: number;
  };
  requiredCredits: number;
}
```

The CLI already has cross-platform browser opening through the `open` package in `apps/cli/src/lib/auth/oauth.ts`. Reuse that pattern directly. Do not add an `open-url` helper or introduce a second browser-opening abstraction.

## Non-Goals

- Do not put Polar SDK usage, Polar credentials, product IDs, meter IDs, or payment business logic in `apps/cli`.
- Do not bypass the typed Hono RPC client with raw `fetch` for server payment routes.
- Do not send Clerk user IDs from the CLI for payment actions. The server derives the user from auth context.
- Do not add a local credit ledger or client-side balance cache in this pass.
- Do not implement a Polar webhook flow in the CLI.
- Do not add a generic URL-opening helper.

## Implementation Plan

### 1. Add Payment Prompt Commands

Update `apps/cli/src/lib/prompt-commands.ts` with:

```ts
{
  name: "/upgrade",
  description: "Buy credits",
},
{
  name: "/usage",
  description: "Show credits usage",
},
```

Recommended placement is near `/login`, `/logout`, `/settings`, or other account-level commands so the command palette remains coherent.

### 2. Implement `/upgrade`

Update `apps/cli/src/hooks/use-prompt-command.ts`.

Import `open` directly, following the existing OAuth implementation:

```ts
import open from "open";
```

Add an async `upgrade()` command handler that:

- Calls `client.payments.checkout.$post({ json: {} })`.
- Handles unauthenticated responses with a toast telling the user to run `/login`.
- Handles non-OK payment/server responses with a clear failure toast.
- Parses the checkout response with the typed RPC response.
- Calls `await open(checkout.url)`.
- Shows a success toast when checkout opens.
- If browser opening fails, shows an error toast containing the checkout URL so the user can still open it manually.

Conceptual shape:

```ts
async function upgrade() {
  let checkoutUrl: string | undefined;

  try {
    const res = await client.payments.checkout.$post({ json: {} });

    if (res.status === 401) {
      toast.warning("Sign in required", {
        description: "Run /login before starting checkout.",
        duration: 7000,
      });
      return;
    }

    if (!res.ok) {
      toast.error("Could not start checkout", {
        description: getPaymentRequestFailureDescription(res.status),
        duration: 9000,
      });
      return;
    }

    const checkout = await res.json();
    checkoutUrl = checkout.url;
    await open(checkout.url);

    toast.success("Checkout opened", {
      description: "Complete the Polar checkout in your browser, then run /usage to refresh your balance.",
      duration: 8000,
    });
  } catch (error) {
    toast.error("Could not open checkout", {
      description: checkoutUrl
        ? `Open this URL manually: ${checkoutUrl}`
        : `Checkout failed before a URL was created: ${getErrorMessage(error)}`,
      duration: 10_000,
    });
  }
}
```

Wire it into the command switch:

```ts
case "/upgrade":
  void upgrade();
  return;
```

### 3. Implement `/usage`

Create `apps/cli/src/components/usage-dialog.tsx`.

The component should:

- Load data on mount with `client.payments.usage.$get()`.
- Render loading, error, and success states.
- Display `remaining`, `used`, and `granted` credits.
- Mention that Polar usage and checkout updates can be eventually consistent.
- Tell the user to run `/upgrade` to buy more credits.

Keep this as a dialog component, not a full screen. It fits the existing patterns used by `SessionDialog`, `ModelDialog`, and `ThemeListDialog`.

Recommended UI content:

```txt
Credits remaining: 983
Credits used:      17
Credits granted:   1000

Usage can take a moment to update after checkout or generation.
Run /upgrade to buy more credits.
```

Update `apps/cli/src/hooks/use-prompt-command.ts`:

```ts
case "/usage":
  openDialog({
    title: "Usage",
    content: createElement(UsageDialog),
  });
  return;
```

### 4. Improve Out-of-Credits Chat Recovery

Update `apps/cli/src/screens/chat-screen.tsx` so users understand payment failures from paid chat requests.

Desired user-facing behavior:

- If the chat request fails because credits are exhausted, show a toast titled `Insufficient credits`.
- Include recovery instructions: `Run /upgrade to buy credits or /usage to view your balance.`
- Preserve the existing generic chat failure handling for other errors.

Implementation detail to verify:

- The chat request uses AI SDK `DefaultChatTransport`, so the exact error object may not expose the raw `402` JSON body.
- First try to detect the status/message reliably from the `Error` surfaced by `useChat`.
- If structured `402` details are not available through `DefaultChatTransport`, keep the first pass conservative and match on the stable server error text/code if present.
- Do not weaken types with `any` or raw response casts just to access internal transport details.

If the AI SDK transport does not expose enough information for robust handling, add a follow-up task to customize the chat transport error parsing separately.

### 5. Optional Balance Surface On Home

Optionally show a compact balance line on `HomeScreen` for signed-in users:

```txt
983 credits remaining
```

This is optional for the first pass because:

- It adds another network request to the home screen.
- Polar balance updates may be eventually consistent.
- `/usage` already gives users an explicit way to refresh balance.

If implemented, fetch only when auth becomes signed in or when the screen mounts. Do not poll aggressively.

## Recommended Command Set

Add now:

- `/upgrade`: create a Polar checkout and open it in the browser.
- `/usage`: show current credits usage and remaining balance.

Consider later:

- `/balance`: alias for `/usage` if users naturally search for balance.
- `/pricing`: show the current credit pack details before checkout.
- `/billing`: open a customer billing portal if one is added later.
- `/refresh-usage`: force refresh if usage state becomes cached or shared globally.

Avoid adding too many billing commands now. `/upgrade` and `/usage` are enough to complete the payment loop.

## Error Handling Guidelines

Use concise, actionable toasts:

- `401`: `Sign in required` with `Run /login before using payments.`
- `402`: `Insufficient credits` with `Run /upgrade to buy credits or /usage to view your balance.`
- `5xx`: `Payment service unavailable` with `Check the server logs and payment environment variables.`
- Browser open failure: include the checkout URL as a manual fallback.

Do not expose raw Polar SDK errors, tokens, product IDs, or meter IDs in CLI messages.

## Verification

Run from the repo root:

```sh
bun run check:cli
bun run build:cli
bun run check:server
bun run build:server
```

Manual sandbox verification:

1. Start the server with Clerk and Polar sandbox environment variables.
2. Start the CLI.
3. Run `/login` and complete Clerk auth.
4. Run `/usage`; expect current `granted`, `used`, and `remaining` credits.
5. Run `/upgrade`; expect a Polar checkout to open in the browser.
6. Complete checkout in Polar sandbox.
7. Run `/usage`; expect credits to appear after Polar processes the purchase.
8. Send a chat message; expect one credit to be consumed after successful generation.
9. Run `/usage`; expect usage to increase after Polar processes the event.
10. Test a zero-credit user; expect chat failure messaging to point to `/upgrade` and `/usage`.

## Risks And Follow-Ups

- Polar balance and usage data may be eventually consistent after checkout or generation. CLI copy should acknowledge this.
- Checkout success/cancel routes are currently mounted under authenticated payment routes. If Polar redirects do not preserve a usable browser session, move only those redirect endpoints to public server routes.
- AI SDK `DefaultChatTransport` may not expose the structured `402` response body. If so, implement a targeted transport/error parsing follow-up instead of weakening types.
- Future pricing may become model-based or token-based. Keep CLI copy generic enough to avoid promising that all generations always cost exactly one credit.
