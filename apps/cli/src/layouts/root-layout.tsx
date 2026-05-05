import { Outlet, useLocation, useNavigate } from "react-router";
import { PromptTextArea } from "../components/prompt-text-area";

function normalizeRoute(value: string) {
  const route = value.trim().split(/\s+/)[0] ?? "/";

  if (!route || route === "home") {
    return "/";
  }

  return route.startsWith("/") ? route : `/${route}`;
}

export function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <box flexDirection="column" flexGrow={1}>
      <box
        flexDirection="row"
        justifyContent="space-between"
        paddingLeft={1}
        paddingRight={1}
        borderStyle="single"
        border={["bottom"]}
      >
        <text fg="#e6edf3">
          <strong>newcode</strong>
        </text>
        <text fg="#8b949e">Route: {location.pathname}</text>
      </box>

      <box flexGrow={1} padding={1}>
        <Outlet />
      </box>

      <box
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        gap={2}
        paddingTop={1}
        paddingBottom={1}
        borderStyle="single"
        border={["top"]}
      >
        <PromptTextArea onSubmitRoute={(route) => navigate(normalizeRoute(route))} />
        <text fg="#8b949e">
          Enter navigates. Shift+Enter adds a new line. Try /, /about, or
          /settings.
        </text>
      </box>
    </box>
  );
}
