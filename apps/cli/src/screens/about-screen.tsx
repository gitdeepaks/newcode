import { useEffect, useState } from "react";
import type { InferResponseType } from "hono/client";
import { client } from "../lib/client";

type ServerResponse = InferResponseType<typeof client.index.$get>;

export function AboutScreen() {
  const [serverStatus, setServerStatus] = useState("checking");
  const [serverResponse, setServerResponse] = useState<ServerResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkServer() {
      try {
        const response = await client.index.$get();
        const data = await response.json();

        if (!cancelled) {
          setServerStatus(data.status === "ok" ? "connected" : data.status);
          setServerResponse(data);
        }
      } catch {
        if (!cancelled) {
          setServerStatus("unavailable");
          setServerResponse(null);
        }
      }
    }

    void checkServer();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <box flexDirection="column" flexGrow={1} gap={1}>
      <text fg="#58a6ff">
        <strong>About</strong>
      </text>
      <text fg="#e6edf3">
        newcode is a terminal workspace for building, explaining, debugging, and
        refactoring code.
      </text>
      <text fg={serverStatus === "connected" ? "#3fb950" : "#f85149"}>
        Server connection: {serverStatus}
      </text>
      {serverResponse ? (
        <box flexDirection="column" gap={1}>
          <text fg="#8b949e">Server response:</text>
          {Object.entries(serverResponse).map(([key, value]) => (
            <text key={key} fg="#e6edf3">
              {key}: {String(value)}
            </text>
          ))}
        </box>
      ) : null}
      <text fg="#8b949e">This screen exists to demonstrate CLI routing.</text>
      <text fg="#8b949e">Enter / in the route prompt to return home.</text>
    </box>
  );
}
