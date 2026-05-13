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

type ThemeBase = {
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

export type ToastTheme = {
  background: string;
  border: string;
  text: string;
  description: string;
  variants: {
    default: string;
    success: string;
    info: string;
    warning: string;
    error: string;
  };
};

export type Theme = ThemeBase & {
  toast: ToastTheme;
};

function createToastTheme(theme: ThemeBase): ToastTheme {
  return {
    background: theme.elevatedSurface,
    border: theme.border,
    text: theme.text,
    description: theme.textSecondary,
    variants: {
      default: theme.accent,
      success: theme.success,
      info: theme.accentSoft,
      warning: theme.warn,
      error: theme.danger,
    },
  };
}

function createTheme(theme: ThemeBase): Theme {
  return {
    ...theme,
    toast: createToastTheme(theme),
  };
}

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
  bg: "#0D1117",
  surface: "#161B22",
  surfaceMuted: "#21262D",
  elevatedSurface: "#1C2128",
  dialogSurface: "#010409",
  overlay: { r: 1, g: 4, b: 9, a: 0.78 },

  border: "#30363D",
  borderSubtle: "#21262D",
  borderAccent: "#58A6FF",

  text: "#E6EDF3",
  textSecondary: "#9198A1",
  textMuted: "#6E7681",

  accent: "#388BFD",
  accentSoft: "#79C0FF",
  success: "#3FB950",
  warn: "#D29922",
  danger: "#F85149",

  cursor: "#58A6FF",
  selection: "#1F6FEB",

  scrollTrackBg: "#161B22",
  scrollTrackFg: "#484F58",

  inverseText: "#0D1117",
  selectedBackground: "#F78166",
  logoMuted: "#7D8590",

  syntax: {
    keyword: "#FF7B72",
    string: "#A5D6FF",
    number: "#79C0FF",
    function: "#D2A8FF",
    type: "#FFA657",
    property: "#79C0FF",
    raw: "#A5D6FF",
  },
} as const satisfies ThemeBase;

export const draculaTheme = {
  bg: "#282A36",
  surface: "#21222C",
  surfaceMuted: "#44475A",
  elevatedSurface: "#343746",
  dialogSurface: "#191A21",
  overlay: { r: 10, g: 11, b: 16, a: 0.78 },
  border: "#6272A4",
  borderSubtle: "#44475A",
  borderAccent: "#BD93F9",
  text: "#F8F8F2",
  textSecondary: "#C5C8D6",
  textMuted: "#6272A4",
  accent: "#BD93F9",
  accentSoft: "#8BE9FD",
  success: "#50FA7B",
  warn: "#F1FA8C",
  danger: "#FF5555",
  cursor: "#F8F8F0",
  selection: "#44475A",
  scrollTrackBg: "#21222C",
  scrollTrackFg: "#6272A4",
  inverseText: "#282A36",
  selectedBackground: "#FFB86C",
  logoMuted: "#6272A4",
  syntax: {
    keyword: "#FF79C6",
    string: "#F1FA8C",
    number: "#BD93F9",
    function: "#50FA7B",
    type: "#8BE9FD",
    property: "#8BE9FD",
    raw: "#F1FA8C",
  },
} as const satisfies ThemeBase;

export const nordTheme = {
  bg: "#2E3440",
  surface: "#3B4252",
  surfaceMuted: "#434C5E",
  elevatedSurface: "#3B4252",
  dialogSurface: "#242933",
  overlay: { r: 12, g: 15, b: 22, a: 0.78 },
  border: "#4C566A",
  borderSubtle: "#3B4252",
  borderAccent: "#88C0D0",
  text: "#ECEFF4",
  textSecondary: "#D8DEE9",
  textMuted: "#7B88A1",
  accent: "#88C0D0",
  accentSoft: "#8FBCBB",
  success: "#A3BE8C",
  warn: "#EBCB8B",
  danger: "#BF616A",
  cursor: "#88C0D0",
  selection: "#434C5E",
  scrollTrackBg: "#3B4252",
  scrollTrackFg: "#4C566A",
  inverseText: "#2E3440",
  selectedBackground: "#D08770",
  logoMuted: "#7B88A1",
  syntax: {
    keyword: "#81A1C1",
    string: "#A3BE8C",
    number: "#B48EAD",
    function: "#88C0D0",
    type: "#8FBCBB",
    property: "#88C0D0",
    raw: "#A3BE8C",
  },
} as const satisfies ThemeBase;

export const gruvboxTheme = {
  bg: "#1D2021",
  surface: "#282828",
  surfaceMuted: "#3C3836",
  elevatedSurface: "#32302F",
  dialogSurface: "#161819",
  overlay: { r: 7, g: 8, b: 8, a: 0.78 },
  border: "#665C54",
  borderSubtle: "#3C3836",
  borderAccent: "#FABD2F",
  text: "#EBDBB2",
  textSecondary: "#D5C4A1",
  textMuted: "#928374",
  accent: "#FABD2F",
  accentSoft: "#8EC07C",
  success: "#B8BB26",
  warn: "#FE8019",
  danger: "#FB4934",
  cursor: "#FABD2F",
  selection: "#504945",
  scrollTrackBg: "#282828",
  scrollTrackFg: "#665C54",
  inverseText: "#1D2021",
  selectedBackground: "#FE8019",
  logoMuted: "#928374",
  syntax: {
    keyword: "#FB4934",
    string: "#B8BB26",
    number: "#D3869B",
    function: "#FABD2F",
    type: "#FE8019",
    property: "#83A598",
    raw: "#B8BB26",
  },
} as const satisfies ThemeBase;

export const solarizedDarkTheme = {
  bg: "#002B36",
  surface: "#073642",
  surfaceMuted: "#0E4754",
  elevatedSurface: "#0B3D49",
  dialogSurface: "#001E26",
  overlay: { r: 0, g: 18, b: 22, a: 0.78 },
  border: "#586E75",
  borderSubtle: "#073642",
  borderAccent: "#268BD2",
  text: "#FDF6E3",
  textSecondary: "#93A1A1",
  textMuted: "#657B83",
  accent: "#268BD2",
  accentSoft: "#2AA198",
  success: "#859900",
  warn: "#B58900",
  danger: "#DC322F",
  cursor: "#268BD2",
  selection: "#0F4858",
  scrollTrackBg: "#073642",
  scrollTrackFg: "#586E75",
  inverseText: "#002B36",
  selectedBackground: "#CB4B16",
  logoMuted: "#657B83",
  syntax: {
    keyword: "#859900",
    string: "#2AA198",
    number: "#D33682",
    function: "#268BD2",
    type: "#B58900",
    property: "#6C71C4",
    raw: "#2AA198",
  },
} as const satisfies ThemeBase;

export const monokaiTheme = {
  bg: "#272822",
  surface: "#2D2E27",
  surfaceMuted: "#3E3D32",
  elevatedSurface: "#383830",
  dialogSurface: "#1E1F1A",
  overlay: { r: 8, g: 8, b: 5, a: 0.78 },
  border: "#75715E",
  borderSubtle: "#49483E",
  borderAccent: "#66D9EF",
  text: "#F8F8F2",
  textSecondary: "#CFCFC2",
  textMuted: "#75715E",
  accent: "#F92672",
  accentSoft: "#66D9EF",
  success: "#A6E22E",
  warn: "#E6DB74",
  danger: "#F92672",
  cursor: "#F8F8F0",
  selection: "#49483E",
  scrollTrackBg: "#2D2E27",
  scrollTrackFg: "#75715E",
  inverseText: "#272822",
  selectedBackground: "#FD971F",
  logoMuted: "#75715E",
  syntax: {
    keyword: "#F92672",
    string: "#E6DB74",
    number: "#AE81FF",
    function: "#A6E22E",
    type: "#66D9EF",
    property: "#66D9EF",
    raw: "#E6DB74",
  },
} as const satisfies ThemeBase;

export const catppuccinMochaTheme = {
  bg: "#1E1E2E",
  surface: "#181825",
  surfaceMuted: "#313244",
  elevatedSurface: "#313244",
  dialogSurface: "#11111B",
  overlay: { r: 7, g: 7, b: 13, a: 0.78 },
  border: "#45475A",
  borderSubtle: "#313244",
  borderAccent: "#CBA6F7",
  text: "#CDD6F4",
  textSecondary: "#BAC2DE",
  textMuted: "#A6ADC8",
  accent: "#CBA6F7",
  accentSoft: "#89DCEB",
  success: "#A6E3A1",
  warn: "#F9E2AF",
  danger: "#F38BA8",
  cursor: "#F5E0DC",
  selection: "#45475A",
  scrollTrackBg: "#181825",
  scrollTrackFg: "#585B70",
  inverseText: "#1E1E2E",
  selectedBackground: "#FAB387",
  logoMuted: "#6C7086",
  syntax: {
    keyword: "#CBA6F7",
    string: "#A6E3A1",
    number: "#FAB387",
    function: "#89B4FA",
    type: "#F9E2AF",
    property: "#94E2D5",
    raw: "#A6E3A1",
  },
} as const satisfies ThemeBase;

export const tokyoNightTheme = {
  bg: "#1A1B26",
  surface: "#16161E",
  surfaceMuted: "#292E42",
  elevatedSurface: "#24283B",
  dialogSurface: "#13131A",
  overlay: { r: 5, g: 6, b: 11, a: 0.78 },
  border: "#414868",
  borderSubtle: "#292E42",
  borderAccent: "#7AA2F7",
  text: "#C0CAF5",
  textSecondary: "#A9B1D6",
  textMuted: "#565F89",
  accent: "#7AA2F7",
  accentSoft: "#7DCFFF",
  success: "#9ECE6A",
  warn: "#E0AF68",
  danger: "#F7768E",
  cursor: "#C0CAF5",
  selection: "#283457",
  scrollTrackBg: "#16161E",
  scrollTrackFg: "#414868",
  inverseText: "#1A1B26",
  selectedBackground: "#FF9E64",
  logoMuted: "#565F89",
  syntax: {
    keyword: "#BB9AF7",
    string: "#9ECE6A",
    number: "#FF9E64",
    function: "#7AA2F7",
    type: "#2AC3DE",
    property: "#7DCFFF",
    raw: "#9ECE6A",
  },
} as const satisfies ThemeBase;

export const oneDarkTheme = {
  bg: "#282C34",
  surface: "#21252B",
  surfaceMuted: "#3E4451",
  elevatedSurface: "#2C313A",
  dialogSurface: "#1B1F23",
  overlay: { r: 9, g: 11, b: 13, a: 0.78 },
  border: "#4B5263",
  borderSubtle: "#3E4451",
  borderAccent: "#61AFEF",
  text: "#ABB2BF",
  textSecondary: "#9DA5B4",
  textMuted: "#5C6370",
  accent: "#61AFEF",
  accentSoft: "#56B6C2",
  success: "#98C379",
  warn: "#E5C07B",
  danger: "#E06C75",
  cursor: "#528BFF",
  selection: "#3E4451",
  scrollTrackBg: "#21252B",
  scrollTrackFg: "#4B5263",
  inverseText: "#282C34",
  selectedBackground: "#D19A66",
  logoMuted: "#5C6370",
  syntax: {
    keyword: "#C678DD",
    string: "#98C379",
    number: "#D19A66",
    function: "#61AFEF",
    type: "#E5C07B",
    property: "#56B6C2",
    raw: "#98C379",
  },
} as const satisfies ThemeBase;

export const everforestTheme = {
  bg: "#2D353B",
  surface: "#343F44",
  surfaceMuted: "#3D484D",
  elevatedSurface: "#3D484D",
  dialogSurface: "#1E2326",
  overlay: { r: 12, g: 15, b: 17, a: 0.78 },
  border: "#475258",
  borderSubtle: "#3D484D",
  borderAccent: "#7FBBB3",
  text: "#D3C6AA",
  textSecondary: "#9DA9A0",
  textMuted: "#7A8478",
  accent: "#A7C080",
  accentSoft: "#83C092",
  success: "#A7C080",
  warn: "#DBBC7F",
  danger: "#E67E80",
  cursor: "#A7C080",
  selection: "#3D484D",
  scrollTrackBg: "#343F44",
  scrollTrackFg: "#475258",
  inverseText: "#2D353B",
  selectedBackground: "#E69875",
  logoMuted: "#859289",
  syntax: {
    keyword: "#E67E80",
    string: "#A7C080",
    number: "#D699B6",
    function: "#7FBBB3",
    type: "#DBBC7F",
    property: "#83C092",
    raw: "#A7C080",
  },
} as const satisfies ThemeBase;

export const ayuDarkTheme = {
  bg: "#0B0E14",
  surface: "#131721",
  surfaceMuted: "#1F2430",
  elevatedSurface: "#1A1F29",
  dialogSurface: "#0A0E13",
  overlay: { r: 3, g: 5, b: 7, a: 0.78 },
  border: "#3D4A5C",
  borderSubtle: "#1F2430",
  borderAccent: "#39BAE6",
  text: "#BFBDB6",
  textSecondary: "#ACAAA3",
  textMuted: "#565B66",
  accent: "#39BAE6",
  accentSoft: "#95E6CB",
  success: "#7FD962",
  warn: "#FFB454",
  danger: "#F26D78",
  cursor: "#E6B450",
  selection: "#253340",
  scrollTrackBg: "#131721",
  scrollTrackFg: "#3D4A5C",
  inverseText: "#0B0E14",
  selectedBackground: "#FF8F40",
  logoMuted: "#565B66",
  syntax: {
    keyword: "#FF8F40",
    string: "#AAD94C",
    number: "#D2A6FF",
    function: "#FFB454",
    type: "#39BAE6",
    property: "#59C2FF",
    raw: "#AAD94C",
  },
} as const satisfies ThemeBase;

export const themes = {
  default: createTheme(defaultTheme),
  dracula: createTheme(draculaTheme),
  nord: createTheme(nordTheme),
  gruvbox: createTheme(gruvboxTheme),
  solarizedDark: createTheme(solarizedDarkTheme),
  monokai: createTheme(monokaiTheme),
  catppuccinMocha: createTheme(catppuccinMochaTheme),
  tokyoNight: createTheme(tokyoNightTheme),
  oneDark: createTheme(oneDarkTheme),
  everforest: createTheme(everforestTheme),
  ayuDark: createTheme(ayuDarkTheme),
} as const satisfies Record<ThemeName, Theme>;

export const themeDetails = {
  default: {
    label: "Default",
    description: "GitHub-inspired dark palette",
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
