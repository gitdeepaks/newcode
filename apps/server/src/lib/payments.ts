import { createPaymentsService } from "@newcode/payments";

let paymentsService: ReturnType<typeof createPaymentsService> | undefined;

export function getPaymentsService() {
  paymentsService ??= createPaymentsService();
  return paymentsService;
}
