import { theme } from "../lib/theme";

type KeyCapProps = {
  label: string;
};

/** Renders a small inline keyboard hint like ⌫ esc or ⏎ enter. */
export function KeyCap({ label }: KeyCapProps) {
  return (
    <text>
      <span fg={theme.text} bg={theme.surfaceMuted}>
        {` ${label} `}
      </span>
    </text>
  );
}
