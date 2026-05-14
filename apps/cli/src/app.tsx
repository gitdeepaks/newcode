import { RouterProvider } from "react-router";
import { DialogProvider } from "./components/dialog";
import { ToastProvider } from "./components/toast";
import { ModelSelectionProvider } from "./lib/model-selection";
import { ThemeProvider } from "./lib/theme";
import { TuiLayerManagerProvider } from "./lib/tui-layer-manager";
import { router } from "./routes/router";

export function App() {
  return (
    <TuiLayerManagerProvider>
      <ThemeProvider>
        <ToastProvider>
          <ModelSelectionProvider>
            <DialogProvider>
              <RouterProvider router={router} />
            </DialogProvider>
          </ModelSelectionProvider>
        </ToastProvider>
      </ThemeProvider>
    </TuiLayerManagerProvider>
  );
}
