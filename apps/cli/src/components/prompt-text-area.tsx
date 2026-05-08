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
  placeholder?: string;
};

export function PromptTextArea({
  onSubmitPrompt,
  clearOnSubmit = false,
  disabled = false,
  width = 82,
  placeholder = "Ask anything…",
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

  const borderColor = disabled ? theme.borderSubtle : theme.border;

  return (
    <box width={width} flexDirection="column" flexShrink={0}>
      <box
        border
        borderStyle="rounded"
        borderColor={borderColor}
        backgroundColor={theme.bg}
        paddingX={1}
        paddingY={0}
        flexDirection="column"
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
          backgroundColor={theme.bg}
          focusedBackgroundColor={theme.bg}
          textColor={theme.text}
          focusedTextColor={theme.text}
          placeholderColor={theme.textMuted}
          cursorColor={theme.cursor}
          selectionBg={theme.selection}
        />
      </box>

      <box paddingX={1}>
        <text>
          <span fg={theme.textMuted}>↵ send</span>
          <span fg={theme.borderSubtle}> · </span>
          <span fg={theme.textMuted}>⇧↵ newline</span>
        </text>
      </box>
    </box>
  );
}
