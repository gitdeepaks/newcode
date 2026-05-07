import { useTerminalDimensions } from "@opentui/react";
import { useNavigate } from "react-router";
import { KeyCap } from "../components/key-cap";
import { PromptTextArea } from "../components/prompt-text-area";
import { StatusBar } from "../components/status-bar";
import { theme } from "../lib/theme";

const MAX_CONTENT_WIDTH = 82;
const HORIZONTAL_PADDING = 4;

export function HomeScreen() {
  const navigate = useNavigate();
  const { width } = useTerminalDimensions();

  const contentWidth = Math.max(
    32,
    Math.min(MAX_CONTENT_WIDTH, width - HORIZONTAL_PADDING),
  );

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
          gap={1}
        >
          <box flexDirection="row" alignItems="flex-end">
            <ascii-font text="new" font="tiny" color={theme.textMuted} />
            <ascii-font text="code" font="tiny" color={theme.text} />
          </box>

          <text>
            <span fg={theme.textSecondary}>Local </span>
            <span fg={theme.accent}>AI</span>
            <span fg={theme.textSecondary}> coding agent for your terminal</span>
          </text>

          <box height={1} />

          <PromptTextArea
            width={contentWidth}
            onSubmitPrompt={(prompt) =>
              navigate("/chat", { state: { prompt } })
            }
          />

          <box
            width={contentWidth}
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            paddingX={1}
          >
            <text>
              <span fg={theme.textMuted}>Press </span>
            </text>
            <box flexDirection="row" alignItems="center" gap={1}>
              <KeyCap label="tab" />
              <text fg={theme.textMuted}>agents</text>
              <text fg={theme.borderSubtle}>·</text>
              <KeyCap label="^p" />
              <text fg={theme.textMuted}>commands</text>
            </box>
          </box>

          <box height={1} />

          <box
            width={contentWidth}
            border
            borderStyle="rounded"
            borderColor={theme.border}
            title=" Tip "
            titleAlignment="left"
            backgroundColor={theme.surface}
            paddingX={2}
            paddingY={1}
          >
            <text>
              <span fg={theme.textSecondary}>Set </span>
              <span fg={theme.text}>&quot;formatter&quot;: false</span>
              <span fg={theme.textSecondary}>
                {" "}
                in config to disable all auto-formatting.
              </span>
            </text>
          </box>
        </box>
      </box>

      <StatusBar
        left={
          <text>
            <span fg={theme.textMuted}>~/Builds/newcode</span>
            <span fg={theme.borderSubtle}>:</span>
            <span fg={theme.accentSoft}>master</span>
          </text>
        }
        right={
          <text>
            <span fg={theme.textMuted}>v1.14.41</span>
          </text>
        }
      />
    </box>
  );
}
