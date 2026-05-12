import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { DEFAULT_MODE, getNextMode, type Mode } from "newcode-ai";
import { useState } from "react";
import { useNavigate } from "react-router";
import { PromptTextArea } from "../components/prompt-text-area";

import { usePromptCommand } from "../hooks/use-prompt-command";
import { client } from "../lib/client";
import { theme } from "../lib/theme";
import type { ChatLocationState } from "../routes/state";

const MAX_CONTENT_WIDTH = 94;
const HORIZONTAL_PADDING = 4;

export function HomeScreen() {
  const navigate = useNavigate();
  const handleCommand = usePromptCommand();
  const { width } = useTerminalDimensions();
  const [mode, setMode] = useState<Mode>(DEFAULT_MODE);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useKeyboard((key) => {
    if (
      pending ||
      key.name !== "tab" ||
      key.shift ||
      key.ctrl ||
      key.meta ||
      key.option
    ) {
      return;
    }

    setMode((currentMode) => getNextMode(currentMode));
  });

  const contentWidth = Math.max(
    32,
    Math.min(MAX_CONTENT_WIDTH, width - HORIZONTAL_PADDING),
  );

  const handleSubmitPrompt = async (prompt: string) => {
    setPending(true);
    setError(null);
    try {
      const res = await client.sessions.$post();
      if (!res.ok) {
        setError(`Failed to create session (${res.status})`);
        return;
      }
      const { id } = await res.json();
      const state: ChatLocationState = { prompt, mode };
      navigate(`/sessions/${id}`, { state });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
            <ascii-font text="new" font="tiny" color="#808080" />
            <ascii-font text="code" font="tiny" color={theme.text} />
          </box>

          <PromptTextArea
            width={contentWidth}
            disabled={pending}
            placeholder="Press Enter to open chat…"
            mode={mode}
            onSubmitPrompt={(prompt) => {
              void handleSubmitPrompt(prompt);
            }}
            onCommand={handleCommand}
          />

          {error ? (
            <text>
              <span fg={theme.danger}>{error}</span>
            </text>
          ) : null}
        </box>
      </box>
    </box>
  );
}
