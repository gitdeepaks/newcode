import type { TextareaRenderable } from "@opentui/core";
import { getModeConfig, type Mode } from "newcode-ai";
import { useCallback, useRef } from "react";
import { z } from "zod";
import { useFileMentionMenu } from "../hooks/use-file-mention-menu";
import { usePromptCommandMenu } from "../hooks/use-prompt-command-menu";
import { getModeColor } from "../lib/mode-style";
import type { PromptCommandInvocation } from "../lib/prompt-commands";
import { theme } from "../lib/theme";
import { type TuiLayerKeyHandler, useTuiLayer } from "../lib/tui-layer-manager";
import { FileMentionPopover } from "./file-mention-popover";
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
  const fileMentionMenu = useFileMentionMenu();

  const clearPrompt = useCallback(() => {
    commandMenu.clearPrompt();
    fileMentionMenu.clearPrompt();
    textareaRef.current?.clear();
  }, [commandMenu, fileMentionMenu]);

  const { isActiveLayer } = useTuiLayer({
    onKey: useCallback(
      ((key) => {
        if (disabled) {
          return false;
        }

        if (
          fileMentionMenu.isOpen &&
          (key.name === "return" || key.name === "enter")
        ) {
          handleFileMentionSelect(fileMentionMenu.activeIndex);
          return true;
        }

        if (fileMentionMenu.handleKey(key)) {
          return true;
        }

        if (commandMenu.handleKey(key)) {
          return true;
        }

        if (key.ctrl && key.name === "c") {
          if (commandMenu.prompt.trim().length === 0) {
            return false;
          }

          clearPrompt();
          return true;
        }

        return false;
      }) satisfies TuiLayerKeyHandler,
      [clearPrompt, commandMenu, disabled, fileMentionMenu],
    ),
  });

  function handleSubmit() {
    if (disabled) {
      return;
    }

    if (fileMentionMenu.isOpen) {
      handleFileMentionSelect(fileMentionMenu.activeIndex);
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
  }

  function handleCommandSelect(index: number) {
    if (disabled) {
      return;
    }

    if (commandMenu.submitCommandAtIndex(index)) {
      clearPrompt();
    }
  }

  function handleFileMentionSelect(index: number) {
    if (disabled) {
      return;
    }

    const result = fileMentionMenu.insertOptionAtIndex(index);

    if (result !== undefined) {
      const cursorPosition = getCursorPosition(result.prompt, result.cursorOffset);

      textareaRef.current?.replaceText(result.prompt);
      textareaRef.current?.setCursor(cursorPosition.row, cursorPosition.col);
      commandMenu.updatePrompt(result.prompt);
      fileMentionMenu.updatePrompt(result.prompt);
    }
  }

  function handlePromptChange(prompt: string) {
    commandMenu.updatePrompt(prompt);
    fileMentionMenu.updatePrompt(prompt);
  }

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

      {fileMentionMenu.isOpen ? (
        <FileMentionPopover
          options={fileMentionMenu.options}
          activeIndex={fileMentionMenu.activeIndex}
          onActiveIndexChange={fileMentionMenu.setActiveIndex}
          onOptionSelect={handleFileMentionSelect}
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
          onKeyDown={(key) => {
            if (
              fileMentionMenu.isOpen &&
              (key.name === "return" || key.name === "enter")
            ) {
              key.preventDefault();
              key.stopPropagation();
              handleFileMentionSelect(fileMentionMenu.activeIndex);
            }
          }}
          onContentChange={() => {
            const prompt = textareaRef.current?.plainText;

            if (prompt === undefined) {
              return;
            }

            handlePromptChange(prompt);
          }}
          onSubmit={handleSubmit}
          placeholder={placeholder}
          height={2}
          focused={isActiveLayer && !disabled}
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

function getCursorPosition(prompt: string, offset: number) {
  const linesBeforeCursor = prompt.slice(0, offset).split("\n");
  const lastLine = linesBeforeCursor[linesBeforeCursor.length - 1];

  return {
    row: linesBeforeCursor.length - 1,
    col: lastLine.length,
  };
}
