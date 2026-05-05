import { hc } from "hono/client";
import type { AppType } from "@newcode/server/app";

const BASE_URL = process.env.SERVER_URL ?? "http://localhost:3000";

export const client = hc<AppType>(BASE_URL);
