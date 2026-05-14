import { Polar } from "@polar-sh/sdk";

import type { PaymentsConfig } from "./types";

export function createPolarClient(config: PaymentsConfig): Polar {
  return new Polar({
    accessToken: config.accessToken,
    server: config.server,
  });
}
