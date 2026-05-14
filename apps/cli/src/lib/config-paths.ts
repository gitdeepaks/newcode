import { homedir } from "node:os";
import { join } from "node:path";

export function getConfigRoot() {
  return process.env.XDG_CONFIG_HOME
    ? join(process.env.XDG_CONFIG_HOME, "newcode")
    : join(homedir(), ".config", "newcode");
}
