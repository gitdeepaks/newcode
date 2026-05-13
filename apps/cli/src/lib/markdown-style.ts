import { SyntaxStyle } from "@opentui/core";
import type { Theme } from "./theme";

/**
 * Default syntax style used by the chat markdown renderer. Created lazily so
 * we don't pay the cost on import in non-chat code paths.
 */
let cachedTheme: Theme | null = null;
let cached: SyntaxStyle | null = null;

export function getMarkdownSyntaxStyle(theme: Theme): SyntaxStyle {
  if (cached && cachedTheme === theme) {
    return cached;
  }

  cachedTheme = theme;

  cached = SyntaxStyle.fromStyles({
    keyword: { fg: theme.syntax.keyword },
    string: { fg: theme.syntax.string },
    number: { fg: theme.syntax.number },
    comment: { fg: theme.textMuted, italic: true },
    function: { fg: theme.syntax.function },
    type: { fg: theme.syntax.type },
    variable: { fg: theme.text },
    property: { fg: theme.syntax.property },
    operator: { fg: theme.textSecondary },
    punctuation: { fg: theme.textSecondary },

    "markup.heading": { fg: theme.accent, bold: true },
    "markup.bold": { fg: theme.text, bold: true },
    "markup.italic": { fg: theme.text, italic: true },
    "markup.link": { fg: theme.accent, underline: true },
    "markup.list": { fg: theme.textSecondary },
    "markup.quote": { fg: theme.textMuted, italic: true },
    "markup.raw": { fg: theme.syntax.raw },
  });

  return cached;
}
