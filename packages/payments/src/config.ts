import { z } from "zod";

import type { PaymentsConfig } from "./types";

const paymentsConfigSchema = z.object({
  POLAR_ACCESS_TOKEN: z.string().trim().min(1, "POLAR_ACCESS_TOKEN is required"),
  POLAR_PRODUCT_ID: z.string().trim().min(1, "POLAR_PRODUCT_ID is required"),
  POLAR_CREDITS_METER_ID: z.string().trim().min(1, "POLAR_CREDITS_METER_ID is required"),
  POLAR_SERVER: z.enum(["sandbox", "production"]).default("sandbox"),
});

export function loadPaymentsConfig(env: NodeJS.ProcessEnv = process.env): PaymentsConfig {
  const parsed = paymentsConfigSchema.parse(env);

  return {
    accessToken: parsed.POLAR_ACCESS_TOKEN,
    server: parsed.POLAR_SERVER,
    productId: parsed.POLAR_PRODUCT_ID,
    creditsMeterId: parsed.POLAR_CREDITS_METER_ID,
  };
}
