import { InsufficientCreditsError, type CreditBalance } from "@newcode/payments";
import { createMiddleware } from "hono/factory";
import { getPaymentsService } from "../lib/payments";
import type { AuthVariables } from "./auth";

export type CreditVariables = {
  Variables: {
    creditBalance: CreditBalance;
  };
};

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
