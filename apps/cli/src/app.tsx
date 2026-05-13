import { RouterProvider } from "react-router";
import { DialogProvider } from "./components/dialog";
import { TuiLayerManagerProvider } from "./lib/tui-layer-manager";
import { router } from "./routes/router";

export function App() {
  return (
    <TuiLayerManagerProvider>
      <DialogProvider>
        <RouterProvider router={router} />
      </DialogProvider>
    </TuiLayerManagerProvider>
  );
}
