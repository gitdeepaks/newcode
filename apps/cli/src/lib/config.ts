import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { z } from "zod";
import { themeNames, type ThemeName } from "./theme-names";

const configSchema = z.object({
  themeName: z.enum(themeNames).optional(),
});

type NewcodeConfig = z.infer<typeof configSchema>;

const configDirectory = process.env.XDG_CONFIG_HOME
  ? join(process.env.XDG_CONFIG_HOME, "newcode")
  : join(homedir(), ".config", "newcode");
const configPath = join(configDirectory, "config.json");

export const configService = {
  getThemeName() {
    return readConfig().themeName;
  },

  setThemeName(themeName: ThemeName) {
    try {
      writeConfig({ ...readConfig(), themeName });
    } catch {
      // Theme selection should still work for the current session if config is not writable.
    }
  },
};

function readConfig(): NewcodeConfig {
  if (!existsSync(configPath)) {
    return {};
  }

  try {
    return configSchema.parse(JSON.parse(readFileSync(configPath, "utf8")));
  } catch {
    return {};
  }
}

function writeConfig(config: NewcodeConfig) {
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}
