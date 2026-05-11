import type { Mode } from "newcode-ai";
import { theme } from "./theme";

export function getModeColor(mode: Mode) {
  switch (mode) {
    case "build":
      return theme.accent;
    case "plan":
      return theme.warn;
  }
}
