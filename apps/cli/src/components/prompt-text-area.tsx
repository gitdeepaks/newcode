import type { TextareaRenderable } from "@opentui/core";
import { getModeConfig, type Mode } from "newcode-ai";
import { useRef } from "react";
import { z } from "zod";
import { getModeColor } from "../lib/mode-style";
import { theme } from "../lib/theme";

const promptSchema = z.string().refine((prompt) => prompt.trim().length > 0);

const promptBackground = "#1E1E1E";

type PromptTextAreaProps = {
  onSubmitPrompt?: (prompt: string) => void;
  clearOnSubmit?: boolean;
  disabled?: boolean;
  width?: number;
  placeholder?: string;
  mode?: Mode;
};

export function PromptTextArea({
  onSubmitPrompt,
  clearOnSubmit = false,
  disabled = false,
  width = 82,
  placeholder = "Ask anything…",
  mode,
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

  const modeColor = mode ? getModeColor(mode) : theme.accent;
  const borderColor = disabled ? theme.borderSubtle : modeColor;
  const modeLabel = mode ? getModeConfig(mode).label : undefined;

  return (
    <box width={width} flexDirection="column" flexShrink={0}>
      <box
        border={["left"]}
        borderColor={borderColor}
        backgroundColor={promptBackground}
        paddingX={1}
        paddingY={1}
        flexDirection="column"
        gap={1}
      >
        <textarea
          ref={textareaRef}
          onSubmit={handleSubmit}
          placeholder={placeholder}
          height={2}
          focused
          keyBindings={[
            { name: "return", action: "submit" },
            { name: "return", shift: true, action: "newline" },
          ]}
          wrapMode="word"
          backgroundColor={promptBackground}
          focusedBackgroundColor={promptBackground}
          textColor={theme.text}
          focusedTextColor={theme.text}
          placeholderColor={theme.textMuted}
          cursorColor={theme.cursor}
          selectionBg={theme.selection}
        />

        {modeLabel ? (
          <box paddingX={1}>
            <text>
              <span fg={modeColor}>{modeLabel}</span>
            </text>
          </box>
        ) : null}
      </box>
    </box>
  );
}
