import { Outlet } from "react-router";
import { theme } from "../lib/theme";

export function RootLayout() {
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
