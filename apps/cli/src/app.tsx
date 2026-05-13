import { RouterProvider } from "react-router";
import { DialogProvider } from "./components/dialog";
import { router } from "./routes/router";

export function App() {
  return (
    <DialogProvider>
      <RouterProvider router={router} />
    </DialogProvider>
  );
}
