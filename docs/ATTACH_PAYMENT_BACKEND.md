# Attach Payment Backend Plan

## Goals

Wire `@newcode/payments` into `@newcode/server` so the server can create checkout sessions, fetch usage/balance, and spend credits when invoking chat generations.

- Keep Polar as the source of truth for checkout sessions, purchased credits, consumed usage, and remaining balance.
- Use the authenticated Clerk `userId` as Polar's `externalCustomerId` everywhere.
- Preserve the Hono RPC type chain from server routes to `@newcode/cli`.
- Add server-side credit gating before paid AI work starts.
- Ingest usage after a successful generation so balance reflects chat usage.
- Return actionable insufficient-credit responses for future clients without implementing client-side handling in this pass.

## Non-Goals

- Do not add a local credit ledger or database balance cache.
- Do not create Polar products, meters, benefits, customers, or webhooks in this pass.
- Do not expose `POLAR_ACCESS_TOKEN` or any Polar server credentials to the CLI.
- Do not wire, edit, or refactor anything in `apps/cli` in this pass.
- Do not add CLI prompt commands, checkout UI, balance UI, usage UI, or chat error handling.
- Do not block non-chat endpoints behind balance checks unless they spend credits.

## Existing State

`packages/payments` already provides the core service API:

```ts
createPaymentsService().createCreditCheckout(input)
createPaymentsService().getCreditBalance(input)
createPaymentsService().assertHasCredits(input)
createPaymentsService().canStartGeneration(input)
createPaymentsService().ingestUsage(input)
```

Relevant behavior:

- `createCreditCheckout` creates a Polar checkout for `POLAR_PRODUCT_ID`.
- `getCreditBalance` reads `POLAR_CREDITS_METER_ID` through Polar customer meters.
- `assertHasCredits` throws `InsufficientCreditsError` when `remaining < requiredCredits`.
- `ingestUsage` sends `newcode_usage` events with a `credits` metadata field.

`apps/server` currently authenticates every route with Clerk in `authMiddleware` and stores:

```ts
c.set("userId", auth.userId)
```

That value should be the only source for `externalCustomerId`; the CLI should never send a user ID for payment actions.

## Environment

Add `@newcode/payments` to `apps/server/package.json` dependencies:

```json
"@newcode/payments": "workspace:*"
```

Server runtime needs the existing payment variables:

```txt
POLAR_ACCESS_TOKEN=
POLAR_PRODUCT_ID=
POLAR_SERVER=sandbox
POLAR_CREDITS_METER_ID=
```

Checkout route URL construction also needs a public application base URL. Add one server-only env var:

```txt
APP_URL=http://localhost:3000
```

Use it only to create Polar redirect URLs. If there is no web app yet, route the success/cancel URLs to stable server endpoints that return a small text response.

## Server Shape

Create payment-specific server files:

```txt
apps/server/src/lib/payments.ts
apps/server/src/middleware/credits.ts
apps/server/src/routes/payments.ts
```

Mount routes in `apps/server/src/app.ts` while preserving chained Hono route inference:

```ts
const routes = new Hono()
  .use("*", authMiddleware)
  .route("/sessions", sessionRoutes)
  .route("/chat", chatRoutes)
  .route("/payments", paymentRoutes);
```

## 1. Payment Service Singleton

Add `apps/server/src/lib/payments.ts`:

```ts
import { createPaymentsService } from "@newcode/payments";

let paymentsService: ReturnType<typeof createPaymentsService> | undefined;

export function getPaymentsService() {
  paymentsService ??= createPaymentsService();
  return paymentsService;
}
```

Rationale:

- Keeps config validation and Polar client construction lazy.
- Avoids creating a new Polar client for every request.
- Keeps all Polar credentials server-side.

## 2. Payment Routes

Add `apps/server/src/routes/payments.ts` with a `Hono<AuthVariables>()` route group.

Recommended endpoints:

```txt
GET  /payments/balance
GET  /payments/usage
POST /payments/checkout
GET  /payments/checkout/success
GET  /payments/checkout/cancel
```

### `GET /payments/balance`

Handler:

- Read `userId` from `c.get("userId")`.
- Call `getPaymentsService().getCreditBalance({ externalCustomerId: userId })`.
- Return:

```ts
{
  granted: number;
  used: number;
  remaining: number;
}
```

### `GET /payments/usage`

For now, this can return the same shape as balance plus a semantic alias for future client UX:

```ts
{
  granted: number;
  used: number;
  remaining: number;
  balance: number;
}
```

Rationale:

- The existing package exposes Polar meter totals, not a local itemized usage ledger.
- A separate route gives future clients a stable endpoint if richer usage history is added later.

### `POST /payments/checkout`

Use `zValidator("json", schema)` for optional redirect overrides:

```ts
const checkoutRequestSchema = z.object({
  successUrl: z.url().optional(),
  cancelUrl: z.url().optional(),
});
```

Handler:

- Read `userId` from auth context.
- Build defaults from `APP_URL`:
  - `successUrl = ${APP_URL}/payments/checkout/success`
  - `cancelUrl = ${APP_URL}/payments/checkout/cancel`
- Call `createCreditCheckout({ externalCustomerId: userId, successUrl, cancelUrl })`.
- Return:

```ts
{
  id: string;
  url: string;
}
```

Notes:

- Allowing optional `successUrl` and `cancelUrl` keeps the route flexible for future web or CLI deep-link flows.
- Validate user-provided URLs strictly; never accept a non-URL string.
- Do not accept `externalCustomerId` in the body.

### Checkout Result Pages

`GET /payments/checkout/success` and `GET /payments/checkout/cancel` can return plain text:

```txt
Payment complete.
```

```txt
Payment cancelled.
```

These routes are mainly redirect targets for Polar. They can stay behind auth for now if Polar preserves the user's browser session; otherwise move only these two endpoints outside `authMiddleware` by mounting public routes before the authenticated group.

Do not add any CLI behavior around these pages in this pass.

## 3. Credits Middleware

Create `apps/server/src/middleware/credits.ts`.

Recommended variables:

```ts
import type { CreditBalance } from "@newcode/payments";

export type CreditVariables = {
  Variables: {
    creditBalance: CreditBalance;
  };
};
```

Middleware factory:

```ts
export function requireCredits(requiredCredits = 1) {
  return createMiddleware<AuthVariables & CreditVariables>(async (c, next) => {
    try {
      const balance = await getPaymentsService().assertHasCredits({
        externalCustomerId: c.get("userId"),
        requiredCredits,
      });
      c.set("creditBalance", balance);
      await next();
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        return c.json(
          {
            error: "Insufficient credits",
            code: error.code,
            balance: error.balance,
            requiredCredits,
          },
          402,
        );
      }
      throw error;
    }
  });
}
```

Rationale:

- Centralizes credit checks and the `402 Payment Required` response contract.
- Keeps chat route focused on generation and persistence.
- Makes future paid endpoints use the same behavior.

## 4. Chat Route Usage Flow

Attach `requireCredits(1)` to `POST /chat/:sessionId` before the handler:

```ts
export const chatRoutes = new Hono<AuthVariables & CreditVariables>().post(
  "/:sessionId",
  requireCredits(1),
  zValidator("param", chatParamSchema),
  zValidator("json", chatRequestSchema),
  async (c) => {
    // existing handler
  },
);
```

Usage ingestion should happen in `onFinish` after the assistant message and stream finish event are persisted.

Call:

```ts
await getPaymentsService().ingestUsage({
  externalCustomerId: userId,
  credits: 1,
  metadata: {
    sessionId: session.id,
    modelId,
    mode,
    finishReason: finishReason ?? "unknown",
    aborted: isAborted,
  },
});
```

Only ingest usage when the request produced a billable generation. Recommended first-pass rule:

- Ingest when `isAborted === false` and an assistant response was persisted.
- Do not ingest when validation fails, session lookup fails, provider API key is missing, or the stream errors before finish.

Open question for implementation:

- Decide whether aborted streams should spend a credit. If yes, ingest with `aborted: true`; if no, skip as above.

## 5. Explicit CLI Constraint

Do not modify `apps/cli` as part of this plan.

This pass is limited to server-to-payments wiring:

- Add and mount payment routes in `apps/server`.
- Add server-side credit middleware in `apps/server`.
- Add server-side usage ingestion in `apps/server` chat handling.
- Keep route response bodies typed and stable so future CLI work can consume them through Hono RPC.

Future CLI work can add prompt commands, checkout URL display, balance/usage UI, and `402` chat error handling, but those are out of scope for this server-only pass.

## 6. Response Contracts

Keep response bodies small and stable.

Balance:

```json
{
  "granted": 1000,
  "used": 17,
  "remaining": 983
}
```

Usage:

```json
{
  "granted": 1000,
  "used": 17,
  "remaining": 983,
  "balance": 983
}
```

Checkout:

```json
{
  "id": "checkout_id",
  "url": "https://polar.sh/..."
}
```

Insufficient credits:

```json
{
  "error": "Insufficient credits",
  "code": "INSUFFICIENT_CREDITS",
  "balance": {
    "granted": 0,
    "used": 0,
    "remaining": 0
  },
  "requiredCredits": 1
}
```

## 7. Implementation Order

1. Add `@newcode/payments` to `apps/server` dependencies.
2. Add `apps/server/src/lib/payments.ts` singleton helper.
3. Add `apps/server/src/routes/payments.ts` with checkout, balance, usage, and redirect endpoints.
4. Mount `/payments` in `apps/server/src/app.ts` after authenticated middleware.
5. Add `apps/server/src/middleware/credits.ts` with `requireCredits`.
6. Apply `requireCredits(1)` to `POST /chat/:sessionId`.
7. Ingest usage in chat `onFinish` after successful assistant persistence.
8. Run server typecheck/build.
9. Optionally run CLI typecheck only to ensure exported `AppType` changes did not break cross-package type inference; do not edit CLI files.

## 8. Verification

Run from the repo root:

```sh
bun run check:server
bun run build:server
```

Optional compatibility check, without changing CLI code:

```sh
bun run check:cli
```

Manual verification with sandbox Polar credentials:

1. Start the server with payment env vars loaded.
2. Exercise authenticated server routes with an authenticated request.
3. Call `GET /payments/balance`; expect the Polar meter totals for the Clerk user.
4. Call `POST /payments/checkout`; expect a Polar checkout URL.
5. Complete checkout in Polar sandbox.
6. Call `GET /payments/balance`; expect `granted` and `remaining` to include purchased credits.
7. Send a chat request; expect the request to succeed when credits are available.
8. Call `GET /payments/usage`; expect `used` to increase after Polar processes the usage event.
9. Test a zero-credit user; expect chat to return `402` with the insufficient-credit response contract.

## Risks And Decisions

- Polar meter balance may be eventually consistent after checkout or usage ingestion. Future clients should tolerate a short delay and allow users to retry balance checks.
- If Polar redirect pages require public access, split checkout success/cancel routes out of the authenticated route group.
- The first pass bills a flat `1` credit per completed generation. Token-based or model-based credit pricing should be a separate change.
- If `onFinish` usage ingestion fails after the generation succeeds, log a `sessionEvent` with the error and return the completed response; do not fail the already-finished stream.
- If payment config is missing, payment endpoints should fail with a server error, but non-payment endpoints should only fail when they actually invoke payment code.
