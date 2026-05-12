import type { TextareaRenderable } from "@opentui/core";
import { getModeConfig, type Mode } from "newcode-ai";
import { useRef } from "react";
import { z } from "zod";
import { usePromptCommandMenu } from "../hooks/use-prompt-command-menu";
import { getModeColor } from "../lib/mode-style";
import type { PromptCommandInvocation } from "../lib/prompt-commands";
import { theme } from "../lib/theme";
import { PromptCommandPopover } from "./prompt-command-popover";

const promptSchema = z.string().refine((prompt) => prompt.trim().length > 0);

const promptBackground = "#1E1E1E";

type PromptTextAreaProps = {
  onSubmitPrompt?: (prompt: string) => void;
  onCommand?: (command: PromptCommandInvocation) => void;
  clearOnSubmit?: boolean;
  disabled?: boolean;
  width?: number;
  placeholder?: string;
  mode?: Mode;
};

export function PromptTextArea({
  onSubmitPrompt,
  onCommand,
  clearOnSubmit = false,
  disabled = false,
  width = 82,
  placeholder = "Ask anything…",
  mode,
}: PromptTextAreaProps) {
  const textareaRef = useRef<TextareaRenderable>(null);
  const commandMenu = usePromptCommandMenu({ onCommand });

  const clearPrompt = () => {
    commandMenu.clearPrompt();
    textareaRef.current?.clear();
  };

  const handleSubmit = () => {
    if (disabled) {
      return;
    }

    const parsedPrompt = promptSchema.safeParse(commandMenu.prompt);

    if (!parsedPrompt.success) {
      return;
    }

    if (commandMenu.submitCommand(parsedPrompt.data)) {
      clearPrompt();
      return;
    }

    if (clearOnSubmit) {
      clearPrompt();
    }

    onSubmitPrompt?.(parsedPrompt.data);
  };

  const handleCommandSelect = (index: number) => {
    if (disabled) {
      return;
    }

    if (commandMenu.submitCommandAtIndex(index)) {
      clearPrompt();
    }
  };

  const modeColor = mode ? getModeColor(mode) : theme.accent;
  const borderColor = disabled ? theme.borderSubtle : modeColor;
  const modeLabel = mode ? getModeConfig(mode).label : undefined;
  const promptHeight = modeLabel ? 6 : 4;

  return (
    <box width={width} position="relative" flexShrink={0} overflow="visible">
      {commandMenu.isOpen ? (
        <PromptCommandPopover
          commands={commandMenu.commands}
          activeIndex={commandMenu.activeIndex}
          onActiveIndexChange={commandMenu.setActiveIndex}
          onCommandSelect={handleCommandSelect}
          width={width}
          bottom={promptHeight}
        />
      ) : null}

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
          onContentChange={() => {
            commandMenu.updatePrompt(textareaRef.current?.plainText ?? "");
          }}
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
