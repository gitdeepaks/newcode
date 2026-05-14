import { z } from "zod";

import type { Polar } from "@polar-sh/sdk";
import type {
  CreateCreditCheckoutInput,
  CreateCreditCheckoutResult,
  PaymentsConfig,
} from "./types";

const createCreditCheckoutSchema = z.object({
  externalCustomerId: z
    .string()
    .trim()
    .min(1, "externalCustomerId is required"),
  successUrl: z.url("successUrl must be a valid URL"),
  cancelUrl: z.url("cancelUrl must be a valid URL").optional(),
});

export async function createCreditCheckout(
  client: Polar,
  config: PaymentsConfig,
  input: CreateCreditCheckoutInput,
): Promise<CreateCreditCheckoutResult> {
  const parsed = createCreditCheckoutSchema.parse(input);
  const checkout = await client.checkouts.create({
    products: [config.productId],
    externalCustomerId: parsed.externalCustomerId,
    successUrl: parsed.successUrl,
    ...(parsed.cancelUrl ? { cancelUrl: parsed.cancelUrl } : {}),
  });

  return {
    id: checkout.id,
    url: checkout.url,
  };
}
