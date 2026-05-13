import type { ScrollBoxRenderable } from "@opentui/core";
import { useLayoutEffect, useRef } from "react";
import { theme } from "../lib/theme";

export type FileMentionOption = {
  path: string;
  type: "file" | "directory";
};

type FileMentionPopoverProps = {
  options: readonly FileMentionOption[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onOptionSelect: (index: number) => void;
  width: number;
  bottom: number;
};

const popoverBackground = "#1E1E1E";
const activeBackground = "#FDB082";
const activeText = "#050505";
const visibleOptionCount = 10;

function getOptionRowId(index: number) {
  return `file-mention-${index}`;
}

export function FileMentionPopover({
  options,
  activeIndex,
  onActiveIndexChange,
  onOptionSelect,
  width,
  bottom,
}: FileMentionPopoverProps) {
  const scrollboxRef = useRef<ScrollBoxRenderable>(null);

  useLayoutEffect(() => {
    if (options.length === 0 || activeIndex >= options.length) {
      return;
    }

    scrollboxRef.current?.scrollChildIntoView(getOptionRowId(activeIndex));
  }, [activeIndex, options.length]);

  if (options.length === 0) {
    return null;
  }

  const scrollboxWidth = Math.max(1, width - 2);
  const visibleHeight = Math.min(visibleOptionCount, options.length);

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
        {options.map((option, index) => {
          const active = index === activeIndex;
          const textColor = active ? activeText : theme.text;

          return (
            <box
              key={option.path}
              id={getOptionRowId(index)}
              flexDirection="row"
              backgroundColor={active ? activeBackground : popoverBackground}
              onMouseMove={() => {
                if (!active) {
                  onActiveIndexChange(index);
                }
              }}
              onMouseDown={() => onOptionSelect(index)}
              paddingX={1}
            >
              <text>
                <span fg={textColor}>{option.path}</span>
              </text>
            </box>
          );
        })}
      </scrollbox>
    </box>
  );
}
