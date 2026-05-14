import { z } from "zod";

import type { Polar } from "@polar-sh/sdk";
import type {
  AssertHasCreditsInput,
  CanStartGenerationInput,
  CreditBalance,
  GetCreditBalanceInput,
  IngestUsageInput,
  IngestUsageResult,
  PaymentsConfig,
} from "./types";
import { InsufficientCreditsError } from "./types";

const metadataSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));

const ingestUsageSchema = z.object({
  externalCustomerId: z.string().trim().min(1, "externalCustomerId is required"),
  credits: z.number().int().positive().default(1),
  metadata: metadataSchema.optional(),
});

const getCreditBalanceSchema = z.object({
  externalCustomerId: z.string().trim().min(1, "externalCustomerId is required"),
});

const assertHasCreditsSchema = z.object({
  externalCustomerId: z.string().trim().min(1, "externalCustomerId is required"),
  requiredCredits: z.number().int().positive().default(1),
});

export async function ingestUsage(
  client: Polar,
  input: IngestUsageInput,
): Promise<IngestUsageResult> {
  const parsed = ingestUsageSchema.parse(input);
  const event = await client.events.ingest({
    events: [
      {
        name: "newcode_usage",
        externalCustomerId: parsed.externalCustomerId,
        metadata: {
          ...parsed.metadata,
          credits: parsed.credits,
        },
      },
    ],
  });

  return {
    id: "id" in event && typeof event.id === "string" ? event.id : undefined,
  };
}

export async function getCreditBalance(
  client: Polar,
  config: PaymentsConfig,
  input: GetCreditBalanceInput,
): Promise<CreditBalance> {
  const parsed = getCreditBalanceSchema.parse(input);
  const meters = await client.customerMeters.list({
    externalCustomerId: parsed.externalCustomerId,
    meterId: config.creditsMeterId,
    limit: 1,
  });
  const meter = meters.result.items[0];

  if (!meter) {
    return { granted: 0, used: 0, remaining: 0 };
  }

  return {
    granted: meter.creditedUnits,
    used: meter.consumedUnits,
    remaining: meter.balance,
  };
}

export async function assertHasCredits(
  client: Polar,
  config: PaymentsConfig,
  input: AssertHasCreditsInput,
): Promise<CreditBalance> {
  const parsed = assertHasCreditsSchema.parse(input);
  const balance = await getCreditBalance(client, config, {
    externalCustomerId: parsed.externalCustomerId,
  });

  if (balance.remaining < parsed.requiredCredits) {
    throw new InsufficientCreditsError(balance, parsed.requiredCredits);
  }

  return balance;
}

export async function canStartGeneration(
  client: Polar,
  config: PaymentsConfig,
  input: CanStartGenerationInput,
): Promise<CreditBalance> {
  return assertHasCredits(client, config, {
    externalCustomerId: input.externalCustomerId,
    requiredCredits: 1,
  });
}
