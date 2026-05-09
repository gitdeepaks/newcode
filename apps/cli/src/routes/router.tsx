import { createMemoryRouter } from "react-router";
import { RootLayout } from "../layouts/root-layout";
import { ChatScreen } from "../screens/chat-screen";
import { HomeScreen } from "../screens/home-screen";

export const router = createMemoryRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: "sessions/:id", element: <ChatScreen /> },
    ],
  },
]);
