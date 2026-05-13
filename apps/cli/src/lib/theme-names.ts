export const themeNames = [
  "default",
  "dracula",
  "nord",
  "gruvbox",
  "solarizedDark",
  "monokai",
  "catppuccinMocha",
  "tokyoNight",
  "oneDark",
  "everforest",
  "ayuDark",
] as const;

export type ThemeName = (typeof themeNames)[number];
