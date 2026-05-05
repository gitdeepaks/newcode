export function AboutScreen() {
  return (
    <box flexDirection="column" flexGrow={1} gap={1}>
      <text fg="#58a6ff">
        <strong>About</strong>
      </text>
      <text fg="#e6edf3">
        newcode is a terminal workspace for building, explaining, debugging, and
        refactoring code.
      </text>
      <text fg="#8b949e">This screen exists to demonstrate CLI routing.</text>
      <text fg="#8b949e">Enter / in the route prompt to return home.</text>
    </box>
  );
}
