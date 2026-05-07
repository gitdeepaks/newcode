import type { TextareaRenderable } from "@opentui/core";
import { useRef } from "react";
import { z } from "zod";
import { theme } from "../lib/theme";

const promptSchema = z.string().refine((prompt) => prompt.trim().length > 0);

type PromptTextAreaProps = {
  onSubmitPrompt?: (prompt: string) => void;
  clearOnSubmit?: boolean;
  disabled?: boolean;
  width?: number;
  agent?: string;
  model?: string;
  reasoning?: "low" | "med" | "high";
};

/**
 * Composer styled after the OpenCode TUI input. Instead of a full rectangle,
 * we draw a "C-shape" — corners (┌ / └) and a vertical bar (│) on the left
 * only — with inline metadata sitting at the corners (agent, model, hints).
 *
 * Layout:
 *   ┌ Build                               GPT-5 · high
 *   │
 *   │  Ask anything...
 *   │
 *   └ ↵ send · ⇧↵ newline             @ files · / commands
 */
export function PromptTextArea({
  onSubmitPrompt,
  clearOnSubmit = false,
  disabled = false,
  width = 82,
  agent = "Build",
  model = "GPT-5",
  reasoning = "high",
}: PromptTextAreaProps) {
  const textareaRef = useRef<TextareaRenderable>(null);

  const handleSubmit = () => {
    if (disabled) {
      return;
    }

    const parsedPrompt = promptSchema.safeParse(textareaRef.current?.plainText);

    if (!parsedPrompt.success) {
      return;
    }

    if (clearOnSubmit) {
      textareaRef.current?.clear();
    }

    onSubmitPrompt?.(parsedPrompt.data);
  };

  // 1 col for the left bar (│) + 2 cols for the inner padding.
  const innerWidth = Math.max(20, width - 3);
  const accentColor = disabled ? theme.borderSubtle : theme.accent;

  return (
    <box width={width} flexDirection="column">
      <CornerRow
        corner="┌"
        accentColor={accentColor}
        left={
          <text>
            <span fg={accentColor}>
              <strong>{agent}</strong>
            </span>
          </text>
        }
        right={
          <text>
            <span fg={theme.text}>{model}</span>
            <span fg={theme.textMuted}> · </span>
            <span fg={theme.warn}>{reasoning}</span>
          </text>
        }
      />

      <box
        border={["left"]}
        borderColor={accentColor}
        backgroundColor={theme.bg}
        paddingX={1}
        paddingY={0}
        flexDirection="column"
      >
        <textarea
          ref={textareaRef}
          onSubmit={handleSubmit}
          placeholder='Ask anything — e.g. "Summarize the tech stack of this project"'
          width={innerWidth}
          height={2}
          focused
          keyBindings={[
            { name: "return", action: "submit" },
            { name: "return", shift: true, action: "newline" },
          ]}
          wrapMode="word"
          backgroundColor={theme.bg}
          focusedBackgroundColor={theme.bg}
          textColor={theme.text}
          focusedTextColor={theme.text}
          placeholderColor={theme.textMuted}
          cursorColor={theme.cursor}
          selectionBg={theme.selection}
        />
      </box>

      <CornerRow
        corner="└"
        accentColor={accentColor}
        left={
          <text>
            <span fg={theme.textMuted}>↵ send</span>
            <span fg={theme.borderSubtle}> · </span>
            <span fg={theme.textMuted}>⇧↵ newline</span>
          </text>
        }
        right={
          <text>
            <span fg={theme.textMuted}>@ files</span>
            <span fg={theme.borderSubtle}> · </span>
            <span fg={theme.textMuted}>/ commands</span>
          </text>
        }
      />
    </box>
  );
}

type CornerRowProps = {
  corner: string;
  accentColor: string;
  left: React.ReactNode;
  right: React.ReactNode;
};

/**
 * Renders one of the bracket corners with inline metadata.
 * The corner glyph occupies column 0 so it lines up with the left border bar.
 */
function CornerRow({ corner, accentColor, left, right }: CornerRowProps) {
  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      paddingX={0}
    >
      <box flexDirection="row" alignItems="center" gap={1}>
        <text fg={accentColor}>{corner}</text>
        {left}
      </box>
      {right}
    </box>
  );
}
