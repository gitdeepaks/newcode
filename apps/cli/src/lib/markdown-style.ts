import { SyntaxStyle } from "@opentui/core";
import { theme } from "./theme";

/**
 * Default syntax style used by the chat markdown renderer. Created lazily so
 * we don't pay the cost on import in non-chat code paths.
 */
let cached: SyntaxStyle | null = null;

export function getMarkdownSyntaxStyle(): SyntaxStyle {
  if (cached) {
    return cached;
  }

  cached = SyntaxStyle.fromStyles({
    keyword: { fg: "#ff7b72" },
    string: { fg: "#a5d6ff" },
    number: { fg: "#79c0ff" },
    comment: { fg: theme.textMuted, italic: true },
    function: { fg: "#d2a8ff" },
    type: { fg: "#ffa657" },
    variable: { fg: theme.text },
    property: { fg: "#79c0ff" },
    operator: { fg: theme.textSecondary },
    punctuation: { fg: theme.textSecondary },

    "markup.heading": { fg: theme.accent, bold: true },
    "markup.bold": { fg: theme.text, bold: true },
    "markup.italic": { fg: theme.text, italic: true },
    "markup.link": { fg: theme.accent, underline: true },
    "markup.list": { fg: theme.textSecondary },
    "markup.quote": { fg: theme.textMuted, italic: true },
    "markup.raw": { fg: "#a5d6ff" },
  });

  return cached;
}
