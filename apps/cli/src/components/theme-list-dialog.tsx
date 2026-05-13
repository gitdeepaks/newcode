import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  themeDetails,
  themeNames,
  type ThemeName,
  useThemeService,
} from "../lib/theme";
import {
  SearchListDialog,
  type SearchListDialogOption,
} from "./search-list-dialog";

type ThemeListDialogProps = {
  onThemeSelect?: (themeName: ThemeName) => void;
};

type ThemeListDialogOption = SearchListDialogOption<ThemeName>;

export function ThemeListDialog({ onThemeSelect }: ThemeListDialogProps) {
  const { name: activeThemeName, setThemeName } = useThemeService();
  const initialThemeNameRef = useRef(activeThemeName);
  const selectedThemeNameRef = useRef<ThemeName | null>(null);
  const options = useMemo<ThemeListDialogOption[]>(
    () =>
      themeNames.map((name) => {
        const details = themeDetails[name];

        return {
          id: name,
          label: details.label,
          description: details.description,
          metadata: name === activeThemeName ? "active" : "",
          group: "Themes",
        };
      }),
    [activeThemeName],
  );
  const initialActiveIndex = Math.max(
    0,
    options.findIndex((option) => option.id === activeThemeName),
  );
  const previewTheme = useCallback(
    (option: ThemeListDialogOption) => {
      setThemeName(option.id);
    },
    [setThemeName],
  );

  useEffect(() => {
    return () => {
      if (selectedThemeNameRef.current === null) {
        setThemeName(initialThemeNameRef.current);
      }
    };
  }, [setThemeName]);

  return (
    <SearchListDialog<ThemeName>
      title="Theme"
      options={options}
      maxWidth={80}
      height={Math.max(4, options.length)}
      initialActiveIndex={initialActiveIndex}
      placeholder="Search themes"
      emptyMessage="No themes found"
      onActiveOptionChange={previewTheme}
      onOptionSelect={(option) => {
        selectedThemeNameRef.current = option.id;
        setThemeName(option.id);
        onThemeSelect?.(option.id);
      }}
    />
  );
}
