export function NotFoundScreen() {
  return (
    <box alignItems="center" justifyContent="center" flexGrow={1}>
      <box flexDirection="column" alignItems="center" gap={1}>
        <text fg="#f85149">
          <strong>Screen Not Found</strong>
        </text>
        <text fg="#8b949e">Enter / in the route prompt to return home.</text>
      </box>
    </box>
  );
}
