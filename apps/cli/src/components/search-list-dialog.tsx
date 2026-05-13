import type { InputRenderable, ScrollBoxRenderable } from "@opentui/core";
import { Fragment, useCallback, useLayoutEffect, useRef, useState } from "react";
import { type TuiLayerKeyHandler, useTuiLayer } from "../lib/tui-layer-manager";
import { theme } from "../lib/theme";
import { Dialog, dialogColors } from "./dialog";

export type SearchListDialogOption = {
  id: string;
  label: string;
  description?: string;
  metadata?: string;
  group?: string;
};

type SearchListDialogProps = {
  title: string;
  options: readonly SearchListDialogOption[];
  maxWidth?: number | `${number}%` | "auto";
  height?: number;
  placeholder?: string;
  emptyMessage?: string;
  onOptionSelect?: (option: SearchListDialogOption) => void;
};

export function SearchListDialog({
  title,
  options,
  maxWidth,
  height = 14,
  placeholder = "Search",
  emptyMessage = "No options found",
  onOptionSelect,
}: SearchListDialogProps) {
  const inputRef = useRef<InputRenderable>(null);
  const scrollboxRef = useRef<ScrollBoxRenderable>(null);
  const queryRef = useRef("");
  const optionsRef = useRef(options);
  const visibleOptionsRef = useRef<readonly SearchListDialogOption[]>(options);
  const [, rerender] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  if (optionsRef.current !== options) {
    optionsRef.current = options;
    visibleOptionsRef.current = filterOptions(options, queryRef.current);
  }

  const updateSearch = (value?: string) => {
    const query = value ?? inputRef.current?.value ?? "";

    queryRef.current = query;
    visibleOptionsRef.current = filterOptions(options, query);
    setActiveIndex(0);
    rerender((version) => version + 1);
  };

  const visibleOptions = visibleOptionsRef.current;
  const activeOptionIndex = Math.min(activeIndex, visibleOptions.length - 1);

  useLayoutEffect(() => {
    const option = visibleOptions[activeOptionIndex];

    if (!option) {
      return;
    }

    scrollboxRef.current?.scrollChildIntoView(getOptionRowId(option.id));
  }, [activeOptionIndex, visibleOptions]);

  const { isActiveLayer } = useTuiLayer({
    onKey: useCallback(
      ((key) => {
        if (visibleOptions.length === 0) {
          return false;
        }

        if (key.name === "up") {
          setActiveIndex((index) =>
            index === 0 ? visibleOptions.length - 1 : index - 1,
          );
          return true;
        }

        if (key.name === "down") {
          setActiveIndex((index) => (index + 1) % visibleOptions.length);
          return true;
        }

        if (key.name === "return" || key.name === "enter") {
          const option = visibleOptions[activeOptionIndex];

          if (option) {
            onOptionSelect?.(option);
          }

          return true;
        }

        return false;
      }) satisfies TuiLayerKeyHandler,
      [activeOptionIndex, onOptionSelect, visibleOptions],
    ),
  });

  return (
    <Dialog title={title} maxWidth={maxWidth}>
      <box flexDirection="column" gap={1}>
        <input
          ref={inputRef}
          onInput={(value) => updateSearch(value)}
          placeholder={placeholder}
          focused={isActiveLayer}
          backgroundColor={dialogColors.background}
          focusedBackgroundColor={dialogColors.background}
          textColor={theme.text}
          focusedTextColor={theme.text}
          placeholderColor={theme.textMuted}
          cursorColor={theme.cursor}
        />

        <scrollbox
          ref={scrollboxRef}
          height={height}
          scrollY
          scrollX={false}
          viewportCulling
          style={{
            rootOptions: { backgroundColor: dialogColors.background },
            wrapperOptions: { backgroundColor: dialogColors.background },
            viewportOptions: { backgroundColor: dialogColors.background },
            contentOptions: { backgroundColor: dialogColors.background },
            verticalScrollbarOptions: {
              showArrows: false,
              trackOptions: {
                foregroundColor: theme.border,
                backgroundColor: dialogColors.background,
              },
            },
          }}
        >
          {visibleOptions.length === 0 ? (
            <box paddingX={1}>
              <text>
                <span fg={theme.textMuted}>{emptyMessage}</span>
              </text>
            </box>
          ) : (
            visibleOptions.map((option, index) => {
              const active = index === activeOptionIndex;
              const textColor = active ? dialogColors.activeOptionText : theme.text;
              const descriptionColor = active
                ? dialogColors.activeOptionText
                : theme.textMuted;
              const previousOption = visibleOptions[index - 1];
              const showGroup = option.group && option.group !== previousOption?.group;

              return (
                <Fragment key={option.id}>
                  {showGroup ? (
                    <box paddingX={1} paddingTop={index === 0 ? 0 : 1}>
                      <text>
                        <strong>
                          <span fg={theme.accent}>{option.group}</span>
                        </strong>
                      </text>
                    </box>
                  ) : null}
                  <box
                    id={getOptionRowId(option.id)}
                    flexDirection="row"
                    backgroundColor={
                      active ? dialogColors.activeOptionBackground : dialogColors.background
                    }
                    paddingX={1}
                    onMouseMove={() => {
                      if (!active) {
                        setActiveIndex(index);
                      }
                    }}
                    onMouseDown={() => onOptionSelect?.(option)}
                  >
                    <box width={16}>
                      <text>
                        <span fg={textColor}>{option.label}</span>
                      </text>
                    </box>
                    <box width={24}>
                      <text>
                        {option.description ? (
                          <span fg={descriptionColor}>{option.description}</span>
                        ) : null}
                      </text>
                    </box>
                    <text>
                      {option.metadata ? (
                        <span fg={descriptionColor}>{option.metadata}</span>
                      ) : null}
                    </text>
                  </box>
                </Fragment>
              );
            })
          )}
        </scrollbox>
      </box>
    </Dialog>
  );
}

function getOptionRowId(id: string) {
  return `search-list-option-${id}`;
}

function filterOptions(
  options: readonly SearchListDialogOption[],
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return options;
  }

  return options.filter((option) => {
    const label = option.label.toLowerCase();
    const description = option.description?.toLowerCase() ?? "";
    const metadata = option.metadata?.toLowerCase() ?? "";

    return (
      label.includes(normalizedQuery) ||
      description.includes(normalizedQuery) ||
      metadata.includes(normalizedQuery)
    );
  });
}
