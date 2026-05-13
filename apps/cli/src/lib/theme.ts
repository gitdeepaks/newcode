import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import { configService } from "./config";
import type { ThemeName } from "./theme-names";

export { themeNames, type ThemeName } from "./theme-names";

export type Theme = {
  bg: string;
  surface: string;
  surfaceMuted: string;
  elevatedSurface: string;
  dialogSurface: string;
  overlay: { r: number; g: number; b: number; a: number };

  border: string;
  borderSubtle: string;
  borderAccent: string;

  text: string;
  textSecondary: string;
  textMuted: string;

  accent: string;
  accentSoft: string;
  success: string;
  warn: string;
  danger: string;

  cursor: string;
  selection: string;

  scrollTrackBg: string;
  scrollTrackFg: string;

  inverseText: string;
  selectedBackground: string;
  logoMuted: string;

  syntax: {
    keyword: string;
    string: string;
    number: string;
    function: string;
    type: string;
    property: string;
    raw: string;
  };
};

type ThemeContextValue = {
  name: ThemeName;
  theme: Theme;
  setThemeName: (name: ThemeName) => void;
  saveThemeName: (name: ThemeName) => void;
};

/**
 * Shared visual tokens for the CLI.
 *
 * Keep one source of truth so screens stay in sync. Colors loosely follow the
 * GitHub Dark palette so terminals with a similar background blend in.
 */
export const defaultTheme = {
  bg: "#0A0A0A",
  surface: "#161b22",
  surfaceMuted: "#1c2128",
  elevatedSurface: "#1E1E1E",
  dialogSurface: "#141414",
  overlay: { r: 0, g: 0, b: 0, a: 0.65 },

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

  inverseText: "#050505",
  selectedBackground: "#FDB082",
  logoMuted: "#808080",

  syntax: {
    keyword: "#ff7b72",
    string: "#a5d6ff",
    number: "#79c0ff",
    function: "#d2a8ff",
    type: "#ffa657",
    property: "#79c0ff",
    raw: "#a5d6ff",
  },
} as const satisfies Theme;

export const alternativeTheme = {
  bg: "#0D1117",
  surface: "#191724",
  surfaceMuted: "#26233a",
  elevatedSurface: "#1f1d2e",
  dialogSurface: "#16141f",
  overlay: { r: 3, g: 2, b: 8, a: 0.72 },

  border: "#403d52",
  borderSubtle: "#2a2738",
  borderAccent: "#c4a7e7",

  text: "#e0def4",
  textSecondary: "#908caa",
  textMuted: "#6e6a86",

  accent: "#c4a7e7",
  accentSoft: "#9ccfd8",
  success: "#31748f",
  warn: "#f6c177",
  danger: "#eb6f92",

  cursor: "#c4a7e7",
  selection: "#393552",

  scrollTrackBg: "#2a2738",
  scrollTrackFg: "#524f67",

  inverseText: "#191724",
  selectedBackground: "#f6c177",
  logoMuted: "#6e6a86",

  syntax: {
    keyword: "#eb6f92",
    string: "#9ccfd8",
    number: "#f6c177",
    function: "#c4a7e7",
    type: "#ea9a97",
    property: "#9ccfd8",
    raw: "#9ccfd8",
  },
} as const satisfies Theme;

export const draculaTheme = {
  bg: "#282a36",
  surface: "#343746",
  surfaceMuted: "#44475a",
  elevatedSurface: "#343746",
  dialogSurface: "#21222c",
  overlay: { r: 20, g: 21, b: 28, a: 0.72 },
  border: "#6272a4",
  borderSubtle: "#44475a",
  borderAccent: "#bd93f9",
  text: "#f8f8f2",
  textSecondary: "#c9c9c2",
  textMuted: "#8f9bb3",
  accent: "#bd93f9",
  accentSoft: "#8be9fd",
  success: "#50fa7b",
  warn: "#f1fa8c",
  danger: "#ff5555",
  cursor: "#bd93f9",
  selection: "#44475a",
  scrollTrackBg: "#343746",
  scrollTrackFg: "#6272a4",
  inverseText: "#282a36",
  selectedBackground: "#ffb86c",
  logoMuted: "#6272a4",
  syntax: {
    keyword: "#ff79c6",
    string: "#f1fa8c",
    number: "#bd93f9",
    function: "#50fa7b",
    type: "#8be9fd",
    property: "#8be9fd",
    raw: "#f1fa8c",
  },
} as const satisfies Theme;

export const nordTheme = {
  bg: "#2e3440",
  surface: "#3b4252",
  surfaceMuted: "#434c5e",
  elevatedSurface: "#3b4252",
  dialogSurface: "#242933",
  overlay: { r: 20, g: 24, b: 32, a: 0.72 },
  border: "#4c566a",
  borderSubtle: "#3b4252",
  borderAccent: "#88c0d0",
  text: "#eceff4",
  textSecondary: "#d8dee9",
  textMuted: "#81a1c1",
  accent: "#88c0d0",
  accentSoft: "#8fbcbb",
  success: "#a3be8c",
  warn: "#ebcb8b",
  danger: "#bf616a",
  cursor: "#88c0d0",
  selection: "#434c5e",
  scrollTrackBg: "#3b4252",
  scrollTrackFg: "#4c566a",
  inverseText: "#2e3440",
  selectedBackground: "#88c0d0",
  logoMuted: "#81a1c1",
  syntax: {
    keyword: "#81a1c1",
    string: "#a3be8c",
    number: "#b48ead",
    function: "#88c0d0",
    type: "#8fbcbb",
    property: "#88c0d0",
    raw: "#a3be8c",
  },
} as const satisfies Theme;

export const gruvboxTheme = {
  bg: "#1d2021",
  surface: "#282828",
  surfaceMuted: "#3c3836",
  elevatedSurface: "#32302f",
  dialogSurface: "#1d2021",
  overlay: { r: 10, g: 10, b: 9, a: 0.72 },
  border: "#504945",
  borderSubtle: "#3c3836",
  borderAccent: "#d79921",
  text: "#ebdbb2",
  textSecondary: "#d5c4a1",
  textMuted: "#928374",
  accent: "#fabd2f",
  accentSoft: "#83a598",
  success: "#b8bb26",
  warn: "#fe8019",
  danger: "#fb4934",
  cursor: "#fabd2f",
  selection: "#504945",
  scrollTrackBg: "#282828",
  scrollTrackFg: "#665c54",
  inverseText: "#1d2021",
  selectedBackground: "#fabd2f",
  logoMuted: "#928374",
  syntax: {
    keyword: "#fb4934",
    string: "#b8bb26",
    number: "#d3869b",
    function: "#fabd2f",
    type: "#fe8019",
    property: "#83a598",
    raw: "#b8bb26",
  },
} as const satisfies Theme;

export const solarizedDarkTheme = {
  bg: "#002b36",
  surface: "#073642",
  surfaceMuted: "#0b4450",
  elevatedSurface: "#073642",
  dialogSurface: "#00212a",
  overlay: { r: 0, g: 24, b: 30, a: 0.72 },
  border: "#586e75",
  borderSubtle: "#073642",
  borderAccent: "#268bd2",
  text: "#eee8d5",
  textSecondary: "#93a1a1",
  textMuted: "#839496",
  accent: "#268bd2",
  accentSoft: "#2aa198",
  success: "#859900",
  warn: "#b58900",
  danger: "#dc322f",
  cursor: "#268bd2",
  selection: "#073642",
  scrollTrackBg: "#073642",
  scrollTrackFg: "#586e75",
  inverseText: "#002b36",
  selectedBackground: "#b58900",
  logoMuted: "#586e75",
  syntax: {
    keyword: "#859900",
    string: "#2aa198",
    number: "#d33682",
    function: "#268bd2",
    type: "#b58900",
    property: "#2aa198",
    raw: "#2aa198",
  },
} as const satisfies Theme;

export const monokaiTheme = {
  bg: "#272822",
  surface: "#32342b",
  surfaceMuted: "#3e4036",
  elevatedSurface: "#34352d",
  dialogSurface: "#1f201b",
  overlay: { r: 12, g: 12, b: 10, a: 0.72 },
  border: "#75715e",
  borderSubtle: "#49483e",
  borderAccent: "#66d9ef",
  text: "#f8f8f2",
  textSecondary: "#cfcfc2",
  textMuted: "#909080",
  accent: "#66d9ef",
  accentSoft: "#a6e22e",
  success: "#a6e22e",
  warn: "#e6db74",
  danger: "#f92672",
  cursor: "#66d9ef",
  selection: "#49483e",
  scrollTrackBg: "#32342b",
  scrollTrackFg: "#75715e",
  inverseText: "#272822",
  selectedBackground: "#fd971f",
  logoMuted: "#75715e",
  syntax: {
    keyword: "#f92672",
    string: "#e6db74",
    number: "#ae81ff",
    function: "#a6e22e",
    type: "#66d9ef",
    property: "#66d9ef",
    raw: "#e6db74",
  },
} as const satisfies Theme;

export const catppuccinMochaTheme = {
  bg: "#1e1e2e",
  surface: "#313244",
  surfaceMuted: "#45475a",
  elevatedSurface: "#313244",
  dialogSurface: "#181825",
  overlay: { r: 17, g: 17, b: 27, a: 0.72 },
  border: "#585b70",
  borderSubtle: "#45475a",
  borderAccent: "#89b4fa",
  text: "#cdd6f4",
  textSecondary: "#bac2de",
  textMuted: "#7f849c",
  accent: "#89b4fa",
  accentSoft: "#94e2d5",
  success: "#a6e3a1",
  warn: "#f9e2af",
  danger: "#f38ba8",
  cursor: "#89b4fa",
  selection: "#45475a",
  scrollTrackBg: "#313244",
  scrollTrackFg: "#585b70",
  inverseText: "#1e1e2e",
  selectedBackground: "#f9e2af",
  logoMuted: "#7f849c",
  syntax: {
    keyword: "#cba6f7",
    string: "#a6e3a1",
    number: "#fab387",
    function: "#89b4fa",
    type: "#f9e2af",
    property: "#94e2d5",
    raw: "#a6e3a1",
  },
} as const satisfies Theme;

export const tokyoNightTheme = {
  bg: "#1a1b26",
  surface: "#24283b",
  surfaceMuted: "#292e42",
  elevatedSurface: "#24283b",
  dialogSurface: "#16161e",
  overlay: { r: 10, g: 10, b: 16, a: 0.72 },
  border: "#414868",
  borderSubtle: "#292e42",
  borderAccent: "#7aa2f7",
  text: "#c0caf5",
  textSecondary: "#a9b1d6",
  textMuted: "#565f89",
  accent: "#7aa2f7",
  accentSoft: "#7dcfff",
  success: "#9ece6a",
  warn: "#e0af68",
  danger: "#f7768e",
  cursor: "#7aa2f7",
  selection: "#33467c",
  scrollTrackBg: "#24283b",
  scrollTrackFg: "#414868",
  inverseText: "#1a1b26",
  selectedBackground: "#e0af68",
  logoMuted: "#565f89",
  syntax: {
    keyword: "#bb9af7",
    string: "#9ece6a",
    number: "#ff9e64",
    function: "#7aa2f7",
    type: "#2ac3de",
    property: "#7dcfff",
    raw: "#9ece6a",
  },
} as const satisfies Theme;

export const oneDarkTheme = {
  bg: "#282c34",
  surface: "#313640",
  surfaceMuted: "#3e4451",
  elevatedSurface: "#313640",
  dialogSurface: "#21252b",
  overlay: { r: 18, g: 20, b: 24, a: 0.72 },
  border: "#5c6370",
  borderSubtle: "#3e4451",
  borderAccent: "#61afef",
  text: "#abb2bf",
  textSecondary: "#9da5b4",
  textMuted: "#6b717d",
  accent: "#61afef",
  accentSoft: "#56b6c2",
  success: "#98c379",
  warn: "#e5c07b",
  danger: "#e06c75",
  cursor: "#61afef",
  selection: "#3e4451",
  scrollTrackBg: "#313640",
  scrollTrackFg: "#5c6370",
  inverseText: "#282c34",
  selectedBackground: "#e5c07b",
  logoMuted: "#5c6370",
  syntax: {
    keyword: "#c678dd",
    string: "#98c379",
    number: "#d19a66",
    function: "#61afef",
    type: "#e5c07b",
    property: "#56b6c2",
    raw: "#98c379",
  },
} as const satisfies Theme;

export const everforestTheme = {
  bg: "#2d353b",
  surface: "#343f44",
  surfaceMuted: "#3d484d",
  elevatedSurface: "#343f44",
  dialogSurface: "#232a2e",
  overlay: { r: 20, g: 25, b: 27, a: 0.72 },
  border: "#56635f",
  borderSubtle: "#3d484d",
  borderAccent: "#7fbbb3",
  text: "#d3c6aa",
  textSecondary: "#b9a990",
  textMuted: "#859289",
  accent: "#7fbbb3",
  accentSoft: "#83c092",
  success: "#a7c080",
  warn: "#dbbc7f",
  danger: "#e67e80",
  cursor: "#7fbbb3",
  selection: "#3d484d",
  scrollTrackBg: "#343f44",
  scrollTrackFg: "#56635f",
  inverseText: "#2d353b",
  selectedBackground: "#dbbc7f",
  logoMuted: "#859289",
  syntax: {
    keyword: "#e67e80",
    string: "#a7c080",
    number: "#d699b6",
    function: "#7fbbb3",
    type: "#dbbc7f",
    property: "#83c092",
    raw: "#a7c080",
  },
} as const satisfies Theme;

export const ayuDarkTheme = {
  bg: "#0f1419",
  surface: "#1f2430",
  surfaceMuted: "#2d3640",
  elevatedSurface: "#1f2430",
  dialogSurface: "#0b0f14",
  overlay: { r: 4, g: 7, b: 10, a: 0.72 },
  border: "#3e4b59",
  borderSubtle: "#2d3640",
  borderAccent: "#39bae6",
  text: "#bfbdb6",
  textSecondary: "#acb6bf",
  textMuted: "#5c6773",
  accent: "#39bae6",
  accentSoft: "#59c2ff",
  success: "#aad94c",
  warn: "#ffb454",
  danger: "#f07178",
  cursor: "#39bae6",
  selection: "#253340",
  scrollTrackBg: "#1f2430",
  scrollTrackFg: "#3e4b59",
  inverseText: "#0f1419",
  selectedBackground: "#ffb454",
  logoMuted: "#5c6773",
  syntax: {
    keyword: "#ff8f40",
    string: "#aad94c",
    number: "#d2a6ff",
    function: "#ffb454",
    type: "#39bae6",
    property: "#59c2ff",
    raw: "#aad94c",
  },
} as const satisfies Theme;

export const themes = {
  default: defaultTheme,
  alternative: alternativeTheme,
  dracula: draculaTheme,
  nord: nordTheme,
  gruvbox: gruvboxTheme,
  solarizedDark: solarizedDarkTheme,
  monokai: monokaiTheme,
  catppuccinMocha: catppuccinMochaTheme,
  tokyoNight: tokyoNightTheme,
  oneDark: oneDarkTheme,
  everforest: everforestTheme,
  ayuDark: ayuDarkTheme,
} as const satisfies Record<ThemeName, Theme>;

export const themeDetails = {
  default: {
    label: "Default",
    description: "GitHub-inspired dark palette",
  },
  alternative: {
    label: "Alternative",
    description: "Purple and rose dark palette",
  },
  dracula: {
    label: "Dracula",
    description: "High-contrast purple classic",
  },
  nord: {
    label: "Nord",
    description: "Arctic blue-gray palette",
  },
  gruvbox: {
    label: "Gruvbox",
    description: "Warm retro earthy palette",
  },
  solarizedDark: {
    label: "Solarized Dark",
    description: "Balanced cyan and yellow palette",
  },
  monokai: {
    label: "Monokai",
    description: "Saturated editor classic",
  },
  catppuccinMocha: {
    label: "Catppuccin Mocha",
    description: "Soft pastel dark palette",
  },
  tokyoNight: {
    label: "Tokyo Night",
    description: "Deep blue neon palette",
  },
  oneDark: {
    label: "One Dark",
    description: "Atom-inspired dark palette",
  },
  everforest: {
    label: "Everforest",
    description: "Muted green forest palette",
  },
  ayuDark: {
    label: "Ayu Dark",
    description: "Clean amber-blue palette",
  },
} as const satisfies Record<ThemeName, { label: string; description: string }>;

type ThemeProviderProps = {
  children: ReactNode;
  themeName?: ThemeName;
};

export const themeService = {
  getTheme(themeName: ThemeName = "default") {
    return themes[themeName];
  },
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children, themeName }: ThemeProviderProps) {
  const [activeThemeName, setActiveThemeName] = useState<ThemeName>(
    themeName ?? configService.getThemeName() ?? "default",
  );
  const currentThemeName = themeName ?? activeThemeName;
  const value = useMemo<ThemeContextValue>(
    () => ({
      name: currentThemeName,
      theme: themeService.getTheme(currentThemeName),
      setThemeName: setActiveThemeName,
      saveThemeName: (name) => {
        configService.setThemeName(name);
        setActiveThemeName(name);
      },
    }),
    [currentThemeName],
  );

  return createElement(
    ThemeContext.Provider,
    { value },
    children,
  );
}

export function useTheme() {
  return useThemeService().theme;
}

export function useThemeService() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useThemeService must be used within ThemeProvider");
  }

  return context;
}
