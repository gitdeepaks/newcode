import type { ScrollBoxRenderable } from "@opentui/core";
import { useLayoutEffect, useRef } from "react";
import type { PromptCommandName } from "../lib/prompt-commands";
import { useTheme } from "../lib/theme";

type PromptCommandSuggestion = {
  name: PromptCommandName;
  description: string;
};

type PromptCommandPopoverProps = {
  commands: readonly PromptCommandSuggestion[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onCommandSelect: (index: number) => void;
  width: number;
  bottom: number;
};

const visibleCommandCount = 10;

function getCommandRowId(index: number) {
  return `prompt-command-${index}`;
}

export function PromptCommandPopover({
  commands,
  activeIndex,
  onActiveIndexChange,
  onCommandSelect,
  width,
  bottom,
}: PromptCommandPopoverProps) {
  const theme = useTheme();
  const scrollboxRef = useRef<ScrollBoxRenderable>(null);

  useLayoutEffect(() => {
    if (commands.length === 0 || activeIndex >= commands.length) {
      return;
    }

    scrollboxRef.current?.scrollChildIntoView(getCommandRowId(activeIndex));
  }, [activeIndex, commands.length]);

  if (commands.length === 0) {
    return null;
  }

  const scrollboxWidth = Math.max(1, width - 2);
  const commandColumnWidth = Math.min(22, Math.max(10, scrollboxWidth - 24));
  const visibleHeight = Math.min(visibleCommandCount, commands.length);
  const popoverBackground = theme.elevatedSurface;
  const activeBackground = theme.selectedBackground;
  const activeText = theme.inverseText;

  return (
    <box
      position="absolute"
      left={0}
      bottom={bottom}
      zIndex={10}
      width={width}
      flexDirection="column"
      backgroundColor={popoverBackground}
      border={["left", "right"]}
      borderColor={theme.border}
      paddingY={1}
    >
      <scrollbox
        ref={scrollboxRef}
        width={scrollboxWidth}
        height={visibleHeight}
        scrollY
        scrollX={false}
        viewportCulling
        style={{
          rootOptions: { backgroundColor: popoverBackground },
          wrapperOptions: { backgroundColor: popoverBackground },
          viewportOptions: { backgroundColor: popoverBackground },
          contentOptions: { backgroundColor: popoverBackground },
          verticalScrollbarOptions: {
            showArrows: false,
            trackOptions: {
              foregroundColor: theme.border,
              backgroundColor: popoverBackground,
            },
          },
        }}
      >
        {commands.map((command, index) => {
          const active = index === activeIndex;
          const textColor = active ? activeText : theme.text;
          const descriptionColor = active ? activeText : theme.textMuted;

          return (
            <box
              key={command.name}
              id={getCommandRowId(index)}
              flexDirection="row"
              backgroundColor={active ? activeBackground : popoverBackground}
              onMouseMove={() => {
                if (!active) {
                  onActiveIndexChange(index);
                }
              }}
              onMouseDown={() => onCommandSelect(index)}
              paddingX={1}
            >
              <box width={commandColumnWidth}>
                <text>
                  <span fg={textColor}>{command.name}</span>
                </text>
              </box>
              <text>
                <span fg={descriptionColor}>{command.description}</span>
              </text>
            </box>
          );
        })}
      </scrollbox>
    </box>
  );
}
