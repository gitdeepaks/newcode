import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { getPaymentsService } from "../lib/payments";
import type { AuthVariables } from "../middleware/auth";

const checkoutRequestSchema = z.object({
  successUrl: z.url().optional(),
  cancelUrl: z.url().optional(),
});

export const paymentRoutes = new Hono<AuthVariables>()
  .get("/balance", async (c) => {
    const balance = await getPaymentsService().getCreditBalance({
      externalCustomerId: c.get("userId"),
    });

    return c.json(balance);
  })
  .get("/usage", async (c) => {
    const balance = await getPaymentsService().getCreditBalance({
      externalCustomerId: c.get("userId"),
    });

    return c.json({ ...balance, balance: balance.remaining });
  })
  .post("/checkout", zValidator("json", checkoutRequestSchema), async (c) => {
    const { successUrl, cancelUrl } = c.req.valid("json");
    const appUrl = getAppUrl();
    const checkout = await getPaymentsService().createCreditCheckout({
      externalCustomerId: c.get("userId"),
      successUrl: successUrl ?? new URL("/payments/checkout/success", appUrl).toString(),
      cancelUrl: cancelUrl ?? new URL("/payments/checkout/cancel", appUrl).toString(),
    });

    return c.json(checkout);
  });

export const paymentRedirectRoutes = new Hono()
  .get("/checkout/success", (c) => c.text("Payment complete. You can return to the CLI and run /usage."))
  .get("/checkout/cancel", (c) => c.text("Payment cancelled. You can return to the CLI."));

function getAppUrl() {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return new URL(appUrl).toString();
}
