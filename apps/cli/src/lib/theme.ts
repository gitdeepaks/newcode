/**
 * Shared visual tokens for the CLI.
 *
 * Keep one source of truth so screens stay in sync. Colors loosely follow the
 * GitHub Dark palette so terminals with a similar background blend in.
 */
export const theme = {
  bg: "#0d1117",
  surface: "#161b22",
  surfaceMuted: "#1c2128",

  border: "#30363d",
  borderSubtle: "#21262d",
  borderAccent: "#1f6feb",

  text: "#e6edf3",
  textSecondary: "#8b949e",
  textMuted: "#6e7681",

  accent: "#58a6ff",
  accentSoft: "#388bfd",
  success: "#3fb950",
  warn: "#d29922",
  danger: "#f85149",

  cursor: "#58a6ff",
  selection: "#264f78",

  scrollTrackBg: "#21262d",
  scrollTrackFg: "#484f58",
} as const;

export type Theme = typeof theme;
