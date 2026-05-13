import { Outlet } from "react-router";
import { useTheme } from "../lib/theme";

export function RootLayout() {
  const theme = useTheme();

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      backgroundColor={theme.bg}
    >
      <Outlet />
    </box>
  );
}
