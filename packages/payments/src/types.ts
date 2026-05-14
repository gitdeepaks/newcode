export type PaymentsConfig = {
  accessToken: string;
  server: "sandbox" | "production";
  productId: string;
  creditsMeterId: string;
};

export type CreateCreditCheckoutInput = {
  externalCustomerId: string;
  successUrl: string;
  cancelUrl?: string;
};

export type CreateCreditCheckoutResult = {
  id: string;
  url: string;
};

export type UsageMetadata = Record<string, string | number | boolean>;

export type IngestUsageInput = {
  externalCustomerId: string;
  credits?: number;
  metadata?: UsageMetadata;
};

export type IngestUsageResult = {
  id?: string;
};

export type GetCreditBalanceInput = {
  externalCustomerId: string;
};

export type AssertHasCreditsInput = {
  externalCustomerId: string;
  requiredCredits?: number;
};

export type CanStartGenerationInput = {
  externalCustomerId: string;
};

export type CreditBalance = {
  granted: number;
  used: number;
  remaining: number;
};

export type PaymentsService = {
  createCreditCheckout(input: CreateCreditCheckoutInput): Promise<CreateCreditCheckoutResult>;
  getCreditBalance(input: GetCreditBalanceInput): Promise<CreditBalance>;
  assertHasCredits(input: AssertHasCreditsInput): Promise<CreditBalance>;
  canStartGeneration(input: CanStartGenerationInput): Promise<CreditBalance>;
  ingestUsage(input: IngestUsageInput): Promise<IngestUsageResult>;
};

export class InsufficientCreditsError extends Error {
  readonly code = "INSUFFICIENT_CREDITS";
  readonly balance: CreditBalance;

  constructor(balance: CreditBalance, requiredCredits: number) {
    super(`Insufficient credits: ${requiredCredits} required, ${balance.remaining} remaining`);
    this.name = "InsufficientCreditsError";
    this.balance = balance;
  }
}
