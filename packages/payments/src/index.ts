import { createPolarClient } from "./client";
import { createCreditCheckout as createCreditCheckoutWithClient } from "./checkout";
import { loadPaymentsConfig } from "./config";
import {
  assertHasCredits as assertHasCreditsWithClient,
  canStartGeneration as canStartGenerationWithClient,
  getCreditBalance as getCreditBalanceWithClient,
  ingestUsage as ingestUsageWithClient,
} from "./usage";
import type { PaymentsConfig, PaymentsService } from "./types";

export function createPaymentsService(config: PaymentsConfig = loadPaymentsConfig()): PaymentsService {
  const client = createPolarClient(config);

  return {
    createCreditCheckout(input) {
      return createCreditCheckoutWithClient(client, config, input);
    },
    getCreditBalance(input) {
      return getCreditBalanceWithClient(client, config, input);
    },
    assertHasCredits(input) {
      return assertHasCreditsWithClient(client, config, input);
    },
    canStartGeneration(input) {
      return canStartGenerationWithClient(client, config, input);
    },
    ingestUsage(input) {
      return ingestUsageWithClient(client, input);
    },
  };
}

export { createPolarClient } from "./client";
export { createCreditCheckout } from "./checkout";
export { loadPaymentsConfig } from "./config";
export { assertHasCredits, canStartGeneration, getCreditBalance, ingestUsage } from "./usage";
export type {
  AssertHasCreditsInput,
  CanStartGenerationInput,
  CreateCreditCheckoutInput,
  CreateCreditCheckoutResult,
  CreditBalance,
  GetCreditBalanceInput,
  IngestUsageInput,
  IngestUsageResult,
  PaymentsConfig,
  PaymentsService,
  UsageMetadata,
} from "./types";
export { InsufficientCreditsError } from "./types";
