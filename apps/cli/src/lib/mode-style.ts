import type { Mode } from "newcode-ai";
import type { Theme } from "./theme";

export function getModeColor(theme: Theme, mode: Mode) {
  switch (mode) {
    case "build":
      return theme.accent;
    case "plan":
      return theme.warn;
  }
}
