import { useEffect, useState } from "react";
import { HomeAsciiArt } from "../components/ascii-art";
import { client } from "../lib/client";

export function HomeScreen() {
  const [serverStatus, setServerStatus] = useState("checking");

  useEffect(() => {
    let cancelled = false;

    async function checkServer() {
      try {
        const response = await client.health.$get();
        const data = await response.json();

        if (!cancelled) {
          setServerStatus(data.status);
        }
      } catch {
        if (!cancelled) {
          setServerStatus("unavailable");
        }
      }
    }

    void checkServer();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <box alignItems="center" justifyContent="center" flexGrow={1}>
      <box flexDirection="column" alignItems="center" gap={2}>
        <HomeAsciiArt />
        <text fg="#8b949e">Server health: {serverStatus}</text>
      </box>
    </box>
  );
}
