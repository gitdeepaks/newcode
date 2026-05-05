import { HomeAsciiArt } from "../components/ascii-art";

export function HomeScreen() {
  return (
    <box alignItems="center" justifyContent="center" flexGrow={1}>
      <box flexDirection="column" alignItems="center" gap={2}>
        <HomeAsciiArt />
      </box>
    </box>
  );
}
