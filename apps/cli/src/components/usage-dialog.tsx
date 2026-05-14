import { useEffect, useState } from "react";
import { client } from "../lib/client";
import { useTheme } from "../lib/theme";
import { Dialog } from "./dialog";

type UsageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "success";
      usage: {
        granted: number;
        used: number;
        remaining: number;
      };
    };

export function UsageDialog() {
  const theme = useTheme();
  const [state, setState] = useState<UsageState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function loadUsage() {
      try {
        const res = await client.payments.usage.$get();
        if (cancelled) return;

        if (res.status === 401) {
          setState({
            status: "error",
            message: "Sign in with /login before viewing usage.",
          });
          return;
        }

        if (!res.ok) {
          setState({
            status: "error",
            message: getUsageFailureDescription(res.status),
          });
          return;
        }

        const usage = await res.json();
        if (cancelled) return;
        setState({ status: "success", usage });
      } catch (error) {
        if (cancelled) return;
        setState({
          status: "error",
          message: `Could not load usage: ${getErrorMessage(error)}`,
        });
      }
    }

    void loadUsage();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Dialog title="Usage" maxWidth={72}>
      {state.status === "loading" ? (
        <text fg={theme.textMuted}>Loading credits usage...</text>
      ) : null}

      {state.status === "error" ? (
        <box flexDirection="column" gap={1}>
          <text fg={theme.danger}>Could not load credits usage.</text>
          <text fg={theme.textSecondary} wrapMode="word">
            {state.message}
          </text>
          <text fg={theme.textMuted}>Run /upgrade to buy more credits.</text>
        </box>
      ) : null}

      {state.status === "success" ? (
        <box flexDirection="column" gap={1}>
          <UsageLine label="Credits remaining" value={state.usage.remaining} />
          <UsageLine label="Credits used" value={state.usage.used} />
          <UsageLine label="Credits granted" value={state.usage.granted} />

          <box flexDirection="column" paddingTop={1} gap={1}>
            <text fg={theme.textMuted} wrapMode="word">
              Usage can take a moment to update after checkout or generation.
            </text>
            <text fg={theme.textMuted}>Run /upgrade to buy more credits.</text>
          </box>
        </box>
      ) : null}
    </Dialog>
  );
}

function UsageLine({ label, value }: { label: string; value: number }) {
  const theme = useTheme();

  return (
    <box flexDirection="row" gap={1}>
      <box width={19}>
        <text fg={theme.textSecondary}>{label}:</text>
      </box>
      <text fg={theme.text}>{value.toLocaleString()}</text>
    </box>
  );
}

function getUsageFailureDescription(status: number) {
  if (status >= 500) {
    return "Payment service unavailable. Check the server logs and payment environment variables.";
  }

  return `The server returned HTTP ${status}. Try again or check the server logs.`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
