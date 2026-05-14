import { useTerminalDimensions } from "@opentui/react";
import {
  DEFAULT_MODE,
  getNextMode,
  type Mode,
} from "newcode-ai";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { PromptTextArea } from "../components/prompt-text-area";
import { toast } from "../components/toast";

import { usePromptCommand } from "../hooks/use-prompt-command";
import { authConfigService, type AuthSession } from "../lib/auth/auth-config";
import { getValidAuthSession } from "../lib/auth/oauth";
import { client } from "../lib/client";
import { useModelSelection } from "../lib/model-selection";
import { useTheme } from "../lib/theme";
import { type TuiLayerKeyHandler, useTuiLayer } from "../lib/tui-layer-manager";
import type { ChatLocationState } from "../routes/state";

const MAX_CONTENT_WIDTH = 94;
const HORIZONTAL_PADDING = 4;
const AUTH_STATUS_POLL_MS = 5_000;

type AuthStatus =
  | { status: "checking" }
  | { status: "signed-out" }
  | { status: "signed-in"; session: AuthSession };

export function HomeScreen() {
  const theme = useTheme();
  const navigate = useNavigate();
  const handleCommand = usePromptCommand();
  const { modelId } = useModelSelection();
  const { width } = useTerminalDimensions();
  const [mode, setMode] = useState<Mode>(DEFAULT_MODE);
  const [pending, setPending] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ status: "checking" });

  useEffect(() => {
    let active = true;

    async function syncAuthStatus() {
      const result = await getValidAuthSession(authConfigService.getSession());

      if (!active) {
        return;
      }

      if (result.status === "authenticated") {
        authConfigService.setSession(result.session);
        setAuthStatus({ status: "signed-in", session: result.session });
        return;
      }

      setAuthStatus({ status: "signed-out" });
    }

    void syncAuthStatus();
    const interval = setInterval(() => {
      void syncAuthStatus();
    }, AUTH_STATUS_POLL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useTuiLayer({
    onKey: useCallback(
      ((key) => {
        if (
          pending ||
          key.name !== "tab" ||
          key.shift ||
          key.ctrl ||
          key.meta ||
          key.option
        ) {
          return false;
        }

        setMode((currentMode) => getNextMode(currentMode));
        return true;
      }) satisfies TuiLayerKeyHandler,
      [pending],
    ),
  });

  const contentWidth = Math.max(
    32,
    Math.min(MAX_CONTENT_WIDTH, width - HORIZONTAL_PADDING),
  );

  const handleSubmitPrompt = async (prompt: string) => {
    setPending(true);
    try {
      const res = await client.sessions.$post();
      if (!res.ok) {
        toast.error("Could not start a chat session", {
          description: getSessionCreateFailureDescription(res.status),
          duration: 8000,
        });
        return;
      }
      const { id } = await res.json();
      const state: ChatLocationState = { prompt, mode };
      navigate(`/sessions/${id}`, { state });
    } catch (err) {
      toast.error("Could not reach the server", {
        description: `No chat session was created because the CLI could not contact the API: ${getErrorMessage(err)}`,
        duration: 9000,
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <box flexDirection="column" flexGrow={1}>
      <box
        flexGrow={1}
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        paddingX={2}
      >
        <box
          flexDirection="column"
          alignItems="center"
          width={contentWidth}
          gap={2}
        >
          <box flexDirection="row" alignItems="flex-end" gap={1}>
            <ascii-font text="new" font="tiny" color={theme.logoMuted} />
            <ascii-font text="code" font="tiny" color={theme.text} />
          </box>

          <text>
            <span fg={authStatus.status === "signed-in" ? theme.success : theme.textMuted}>
              {getAuthStatusLabel(authStatus)}
            </span>
          </text>

          <PromptTextArea
            width={contentWidth}
            disabled={pending}
            placeholder="Press Enter to open chat…"
            mode={mode}
            modelId={modelId}
            onSubmitPrompt={(prompt) => {
              void handleSubmitPrompt(prompt);
            }}
            onCommand={handleCommand}
          />

        </box>
      </box>
    </box>
  );
}

function getSessionCreateFailureDescription(status: number) {
  if (status === 401) {
    return "The server rejected the request because you are not signed in. Run /login and try again.";
  }

  if (status === 403) {
    return "The server rejected the request because your account does not have access to create sessions.";
  }

  if (status >= 500) {
    return `The API returned ${status}, so the server failed while creating the session. Check the server logs and try again.`;
  }

  return `The API returned ${status}, so the session was not created. Check the request details and try again.`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getAuthStatusLabel(authStatus: AuthStatus) {
  switch (authStatus.status) {
    case "checking":
      return "Checking auth...";
    case "signed-out":
      return "Signed out";
    case "signed-in":
      return `Signed in as ${authStatus.session.user?.email ?? authStatus.session.user?.name ?? "user"}`;
  }
}
