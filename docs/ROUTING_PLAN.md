# CLI Routing Plan

## Goal

Add lightweight React Router support to the OpenTUI CLI app while keeping the code easy to understand, app-local, and simple to extend.

## Recommended Approach

Use `createMemoryRouter` from `react-router` because the CLI does not need browser history or URL integration. The router should manage screen-level navigation only, while OpenTUI remains responsible for rendering and keyboard input.

## Target Structure

```txt
apps/cli/src/
  index.tsx
  app.tsx
  router.tsx

  layouts/
    root-layout.tsx

  screens/
    home-screen.tsx
    about-screen.tsx
    settings-screen.tsx
    not-found-screen.tsx

  components/
    ascii-art.tsx
    prompt-text-area.tsx
```

## File Responsibilities

| File | Responsibility |
| --- | --- |
| `src/index.tsx` | Create the OpenTUI renderer and mount the React app. |
| `src/app.tsx` | Provide the React Router provider. |
| `src/router.tsx` | Define the memory router and route tree. |
| `src/layouts/root-layout.tsx` | Render the shared terminal shell, route outlet, and route prompt. |
| `src/screens/home-screen.tsx` | Render the home screen content. |
| `src/screens/about-screen.tsx` | Minimal placeholder screen for route demonstration. |
| `src/screens/settings-screen.tsx` | Minimal placeholder screen for route demonstration. |
| `src/screens/not-found-screen.tsx` | Fallback screen for unknown routes. |

## Route Shape

```tsx
createMemoryRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: "about", element: <AboutScreen /> },
      { path: "settings", element: <SettingsScreen /> },
      { path: "*", element: <NotFoundScreen /> },
    ],
  },
]);
```

## Notes

This scaffold intentionally avoids deciding the final navigation UX. For demonstration, the shared route textarea accepts route-like input such as `/`, `/about`, or `/settings` and navigates when Enter is pressed.

The route prompt is part of the root layout so every screen can navigate back to `/` by entering `/`. The textarea keybindings keep routing simple: Enter submits the route, while Shift+Enter inserts a newline.

For future OpenTUI work, invoke the `opentui` skill first and use its React, component, keyboard, and layout references before reading package internals. Fall back to `node_modules` types or source only when the skill docs do not answer the question or when exact runtime/type details are needed.

Before adding more screens, keep the same pattern: add a screen under `src/screens`, import it into `src/router.tsx`, and add a route under the root layout.

## Verification

Run these commands from the repository root after routing changes:

```sh
bun run check:cli
bun run build:cli
```
