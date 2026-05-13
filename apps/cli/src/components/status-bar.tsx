import type { ReactNode } from "react";
import { useTheme } from "../lib/theme";

type StatusBarProps = {
  left?: ReactNode;
  right?: ReactNode;
};

/**
 * Single-row bar with a top border, used as a footer/header on each screen for
 * consistent chrome. Children render inside <text> nodes so callers should pass
 * <text> or <span> already, OR plain strings.
 */
export function StatusBar({ left, right }: StatusBarProps) {
  const theme = useTheme();

  return (
    <box
      border={["top"]}
      borderColor={theme.borderSubtle}
      backgroundColor={theme.surface}
      paddingX={2}
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      height={2}
    >
      <box flexDirection="row" alignItems="center" gap={1}>
        {left}
      </box>
      <box flexDirection="row" alignItems="center" gap={1}>
        {right}
      </box>
    </box>
  );
}
