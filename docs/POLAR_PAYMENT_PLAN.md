# Polar Payments Package Plan

## Goals

Develop a new `@newcode/payments` workspace package for Polar-backed credits and usage billing.

- Keep the implementation isolated to `packages/payments`.
- Do not wire the package into `apps/server`, `apps/cli`, or existing chat routes in this pass.
- Use Polar as the source of truth for checkout, credit grants, metering, and balances.
- Do not implement webhooks.
- Use Clerk's user ID as Polar's `externalCustomerId`.
- Support stacked credit purchases through Polar's existing product benefit setup.
- Provide a simple API for checkout creation, balance checks, usage ingestion, and usage gating.

## Non-Goals

- Do not create local credit ledger tables.
- Do not implement unit economics or pricing logic locally.
- Do not manually grant credits after checkout.
- Do not process `order.paid` or any other webhook event.
- Do not create new Polar products, meters, or benefits from code.
- Do not mount routes into the server app yet.
- Do not require customer email for checkout unless Polar's API forces it.

## Existing Polar Setup

The Polar-side setup is already complete:

- The one-time product costs `$20 USD`.
- The product has a benefit attached.
- The benefit grants `1,000` credits through Polar's metering system.
- Users can purchase the product multiple times, and credits can stack.
- The usage meter filters events where `name` equals `newcode_usage`.
- The usage meter aggregates by summing the `credits` field.

The package should rely on this setup instead of recreating it locally.

## Environment Variables

Use the existing variables from `.env.example`:

```txt
POLAR_ACCESS_TOKEN=
POLAR_PRODUCT_ID=
POLAR_SERVER=
POLAR_CREDITS_METER_ID=
```

Expected meanings:

- `POLAR_ACCESS_TOKEN`: Organization Access Token used server-side only.
- `POLAR_PRODUCT_ID`: Existing one-time `$20` product that grants `1,000` credits.
- `POLAR_SERVER`: Polar environment, likely `sandbox` or `production`.
- `POLAR_CREDITS_METER_ID`: Existing meter that tracks usage events named `newcode_usage`.

## 1. Create Workspace Package

Create:

```txt
packages/payments/
  package.json
  src/
    index.ts
    config.ts
    client.ts
    checkout.ts
    usage.ts
    types.ts
```

Package metadata:

```json
{
  "name": "@newcode/payments",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

Dependencies:

- `@polar-sh/sdk`
- `zod`

Dev dependencies:

- `@types/bun`
- `typescript`

## 2. Validate Payment Config

Add `src/config.ts`.

Expose a small config loader:

```ts
export function loadPaymentsConfig(env?: NodeJS.ProcessEnv): PaymentsConfig
```

Config shape:

```ts
type PaymentsConfig = {
  accessToken: string;
  server: "sandbox" | "production";
  productId: string;
  creditsMeterId: string;
};
```

Validation rules:

- `POLAR_ACCESS_TOKEN` is required.
- `POLAR_PRODUCT_ID` is required.
- `POLAR_CREDITS_METER_ID` is required.
- `POLAR_SERVER` defaults to `sandbox` if missing during local development, or requires an explicit value if we want stricter behavior.
- Accept only the Polar SDK server values we actually support.

Keep config validation inside the package so future consumers get clear startup errors.

## 3. Create Polar Client Helper

Add `src/client.ts`.

Expose:

```ts
export function createPolarClient(config: PaymentsConfig): Polar
```

Responsibilities:

- Construct the Polar SDK client.
- Pass `accessToken` from config.
- Pass `server` from config.
- Keep the Organization Access Token server-only.

Do not expose the raw token in return values, errors, or logs.

## 4. Create Checkout API

Add `src/checkout.ts`.

Expose:

```ts
export async function createCreditCheckout(input: CreateCreditCheckoutInput): Promise<CreateCreditCheckoutResult>
```

Suggested input:

```ts
type CreateCreditCheckoutInput = {
  externalCustomerId: string;
  successUrl: string;
  cancelUrl?: string;
};
```

Rules:

- `externalCustomerId` must be the Clerk user ID.
- Use `POLAR_PRODUCT_ID` from package config.
- Do not require email.
- Create a single-use Polar checkout session, not a checkout link.
- Return the minimum useful checkout data, primarily the checkout URL and session ID.

Suggested result:

```ts
type CreateCreditCheckoutResult = {
  id: string;
  url: string;
};
```

Expected behavior:

1. App asks package to create checkout for a Clerk user.
2. Package creates Polar checkout using `externalCustomerId`.
3. User completes payment in Polar.
4. Polar grants credits through the existing product benefit.
5. No webhook is processed by Newcode.
6. Later balance checks query Polar using the same `externalCustomerId`.

## 5. Create Usage Ingestion API

Add `src/usage.ts`.

Expose:

```ts
export async function ingestUsage(input: IngestUsageInput): Promise<IngestUsageResult>
```

Suggested input:

```ts
type IngestUsageInput = {
  externalCustomerId: string;
  credits?: number;
  metadata?: Record<string, string | number | boolean>;
};
```

Rules:

- Default `credits` to `1` for now.
- Require `credits` to be a positive integer.
- Send an event whose `name` is exactly `newcode_usage`.
- Put the usage amount in the event field named `credits`.
- Attach `externalCustomerId` so Polar attributes usage to the Clerk user.
- Keep metadata optional and small.

Expected event payload conceptually:

```ts
{
  name: "newcode_usage",
  externalCustomerId: clerkUserId,
  metadata: {
    credits: 1
  }
}
```

The exact SDK method and event shape should follow the installed `@polar-sh/sdk` TypeScript types. The important contract is that Polar receives:

- `name = "newcode_usage"`
- `credits = <number>`
- `externalCustomerId = <Clerk user ID>`

## 6. Create Balance and Credit Check API

Add balance helpers in `src/usage.ts`.

Expose:

```ts
export async function getCreditBalance(input: GetCreditBalanceInput): Promise<CreditBalance>
export async function assertHasCredits(input: AssertHasCreditsInput): Promise<CreditBalance>
```

Suggested input:

```ts
type GetCreditBalanceInput = {
  externalCustomerId: string;
};

type AssertHasCreditsInput = {
  externalCustomerId: string;
  requiredCredits?: number;
};
```

Suggested result:

```ts
type CreditBalance = {
  granted: number;
  used: number;
  remaining: number;
};
```

Rules:

- Query Polar by `externalCustomerId`.
- Use the configured `POLAR_CREDITS_METER_ID`.
- Treat Polar's returned customer meter state as authoritative.
- Do not compute purchases or stacked balances locally.
- `assertHasCredits` defaults `requiredCredits` to `1`.
- If `remaining < requiredCredits`, throw a typed insufficient-credits error.

Open implementation detail:

- Confirm whether the Polar SDK exposes the remaining balance directly through customer meters/customer state, or whether the package needs to read the relevant meter quantities/state fields and normalize them into `CreditBalance`.
- Keep this normalization inside the package so callers do not depend on Polar response shapes.

## 7. Add Demonstration Generation Guard

The package should provide a tiny helper for future LLM usage gating:

```ts
export async function canStartGeneration(input: CanStartGenerationInput): Promise<CreditBalance>
```

Suggested behavior:

```ts
await payments.canStartGeneration({ externalCustomerId: clerkUserId })
```

Rules:

- Each generation costs `1` credit for now.
- The helper only checks credits; it does not start generation.
- If credits are available, return the current balance.
- If credits are exhausted, throw the same typed insufficient-credits error used by `assertHasCredits`.

Future server flow, not implemented in this package-only pass:

1. Read Clerk user ID from auth middleware.
2. Call `canStartGeneration({ externalCustomerId: userId })`.
3. If allowed, run the LLM generation.
4. After a successful generation, call `ingestUsage({ externalCustomerId: userId, credits: 1 })`.

This avoids charging failed requests before the model produces a result.

## 8. Export a Small Service Object

Add `src/index.ts`.

Expose a simple factory:

```ts
export function createPaymentsService(config?: PaymentsConfig): PaymentsService
```

Suggested service shape:

```ts
type PaymentsService = {
  createCreditCheckout(input: CreateCreditCheckoutInput): Promise<CreateCreditCheckoutResult>;
  getCreditBalance(input: GetCreditBalanceInput): Promise<CreditBalance>;
  assertHasCredits(input: AssertHasCreditsInput): Promise<CreditBalance>;
  canStartGeneration(input: CanStartGenerationInput): Promise<CreditBalance>;
  ingestUsage(input: IngestUsageInput): Promise<IngestUsageResult>;
};
```

The package can also export the lower-level functions for tests or advanced usage, but the service object should be the primary API.

## 9. Typed Errors

Add a small typed error in `src/types.ts` or `src/errors.ts`.

Suggested error:

```ts
export class InsufficientCreditsError extends Error {
  readonly code = "INSUFFICIENT_CREDITS";
  readonly balance: CreditBalance;
}
```

Expected behavior:

- Callers can catch this error and return a user-facing message.
- The error should not include Polar tokens or sensitive raw responses.
- The balance can be included so the UI can show `0 credits remaining`.

## 10. Optional Unmounted Hono Routes

Do not add these unless we decide the package should include route primitives now.

If needed later, add `src/routes.ts` that exports:

```ts
export function createPaymentsRoutes(payments: PaymentsService): Hono
```

Possible routes:

- `POST /checkout`
- `GET /credits/balance`
- `POST /usage/ingest`

For this pass, prefer the TypeScript service only. It is simpler and keeps the package independent from Hono.

## 11. Verification

Package-only verification:

```sh
bunx tsc -p packages/payments/tsconfig.json --noEmit
```

If no package-local `tsconfig.json` is added, verify through the server once the package is consumed later.

Manual sandbox checks after implementation:

1. Set `POLAR_ACCESS_TOKEN`, `POLAR_PRODUCT_ID`, `POLAR_SERVER`, and `POLAR_CREDITS_METER_ID`.
2. Create a checkout for a test Clerk user ID.
3. Complete the `$20` sandbox purchase in Polar.
4. Query balance with the same `externalCustomerId`.
5. Confirm Polar reports granted credits.
6. Ingest one event with `name = "newcode_usage"` and `credits = 1`.
7. Query balance again.
8. Confirm remaining credits decreased by `1`.
9. Repeat checkout for the same `externalCustomerId`.
10. Confirm stacked credits are reflected by Polar.

## Follow-Up Ideas

- Add a mounted server route once the package API is stable.
- Add CLI UI for remaining credits.
- Add a purchase-credits command or screen.
- Add richer usage metadata such as model ID, session ID, or token count.
- Replace the demo `1 credit per generation` policy with model-specific costs later.
