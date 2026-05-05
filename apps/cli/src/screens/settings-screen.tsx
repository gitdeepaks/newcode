export function SettingsScreen() {
  return (
    <box flexDirection="column" flexGrow={1} gap={1}>
      <text fg="#58a6ff">
        <strong>Settings</strong>
      </text>
      <text fg="#e6edf3">Theme: Dark</text>
      <text fg="#e6edf3">Mode: Demo</text>
      <text fg="#8b949e">Settings are placeholders for now.</text>
      <text fg="#8b949e">Enter / in the route prompt to return home.</text>
    </box>
  );
}
