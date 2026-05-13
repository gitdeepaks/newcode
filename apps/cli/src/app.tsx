import { RouterProvider } from "react-router";
import { DialogProvider } from "./components/dialog";
import { ThemeProvider } from "./lib/theme";
import { TuiLayerManagerProvider } from "./lib/tui-layer-manager";
import { router } from "./routes/router";

export function App() {
  return (
    <TuiLayerManagerProvider>
      <ThemeProvider>
        <DialogProvider>
          <RouterProvider router={router} />
        </DialogProvider>
      </ThemeProvider>
    </TuiLayerManagerProvider>
  );
}
