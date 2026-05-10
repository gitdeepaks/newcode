import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../generated/client";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
export * from "../generated/client";

// Coerce a typed object into a value Prisma's `Json` columns accept. TS
// shapes can carry `| undefined` on optional fields; `Prisma.InputJsonValue`
// rejects undefined. JSON.stringify strips it, and the parsed result is
// structurally JSON — so call sites never need an `as` cast.
export function toJsonPayload(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}
