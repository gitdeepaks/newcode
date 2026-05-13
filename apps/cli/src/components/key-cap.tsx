import { useTheme } from "../lib/theme";

type KeyCapProps = {
  label: string;
};

/** Renders a small inline keyboard hint like ⌫ esc or ⏎ enter. */
export function KeyCap({ label }: KeyCapProps) {
  const theme = useTheme();

  return (
    <text>
      <span fg={theme.text} bg={theme.surfaceMuted}>
        {` ${label} `}
      </span>
    </text>
  );
}
