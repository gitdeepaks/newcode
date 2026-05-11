import { Mode as DbMode } from "@newcode/db";
import type { Mode } from "newcode-ai";

const dbModeByAiMode = {
  build: DbMode.build,
  plan: DbMode.plan,
} satisfies Record<Mode, DbMode>;

const aiModeByDbMode = {
  [DbMode.build]: "build",
  [DbMode.plan]: "plan",
} satisfies Record<DbMode, Mode>;

export function toDbMode(mode: Mode): DbMode {
  return dbModeByAiMode[mode];
}

export function fromDbMode(mode: DbMode): Mode {
  return aiModeByDbMode[mode];
}
