import type { InputRenderable, ScrollBoxRenderable } from "@opentui/core";
import {
  Fragment,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { type TuiLayerKeyHandler, useTuiLayer } from "../lib/tui-layer-manager";
import { useTheme } from "../lib/theme";
import { Dialog, getDialogColors } from "./dialog";

export type SearchListDialogOption<TId extends string = string> = {
  id: TId;
  label: string;
  description?: string;
  metadata?: string;
  group?: string;
};

type SearchListDialogProps<TId extends string = string> = {
  title: string;
  options: readonly SearchListDialogOption<TId>[];
  maxWidth?: number | `${number}%` | "auto";
  height?: number;
  rowLayout?: "columns" | "title-metadata";
  groupColor?: string;
  footer?: ReactNode;
  activeOptionId?: TId;
  initialActiveIndex?: number;
  placeholder?: string;
  emptyMessage?: string;
  onActiveOptionChange?: (option: SearchListDialogOption<TId>) => void;
  onOptionSelect?: (option: SearchListDialogOption<TId>) => void;
};

export function SearchListDialog<TId extends string = string>({
  title,
  options,
  maxWidth,
  height = 14,
  rowLayout = "columns",
  groupColor,
  footer,
  activeOptionId,
  initialActiveIndex = 0,
  placeholder = "Search",
  emptyMessage = "No options found",
  onActiveOptionChange,
  onOptionSelect,
}: SearchListDialogProps<TId>) {
  const theme = useTheme();
  const inputRef = useRef<InputRenderable>(null);
  const scrollboxRef = useRef<ScrollBoxRenderable>(null);
  const queryRef = useRef("");
  const optionsRef = useRef(options);
  const visibleOptionsRef = useRef<readonly SearchListDialogOption<TId>[]>(options);
  const [, rerender] = useState(0);
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);

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
  const dialogColors = getDialogColors(theme);

  useLayoutEffect(() => {
    const option = visibleOptions[activeOptionIndex];

    if (!option) {
      return;
    }

    scrollboxRef.current?.scrollChildIntoView(getOptionRowId(option.id));
    onActiveOptionChange?.(option);
  }, [activeOptionIndex, onActiveOptionChange, visibleOptions]);

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
              const selected = option.id === activeOptionId;
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
                          <span fg={groupColor ?? theme.accent}>{option.group}</span>
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
                    {rowLayout === "title-metadata" ? (
                      <>
                        <box flexGrow={1}>
                          <text>
                            <span fg={textColor}>{selected ? `• ${option.label}` : `  ${option.label}`}</span>
                          </text>
                        </box>
                        <box width={12} justifyContent="flex-end">
                          <text>
                            {option.metadata ? (
                              <span fg={descriptionColor}>{option.metadata}</span>
                            ) : null}
                          </text>
                        </box>
                      </>
                    ) : (
                      <>
                        <box width={16}>
                          <text>
                            <span fg={textColor}>{selected ? `• ${option.label}` : `  ${option.label}`}</span>
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
                      </>
                    )}
                  </box>
                </Fragment>
              );
            })
          )}
        </scrollbox>
        {footer ? <box paddingX={1}>{footer}</box> : null}
      </box>
    </Dialog>
  );
}

function getOptionRowId(id: string) {
  return `search-list-option-${id}`;
}

function filterOptions<TId extends string>(
  options: readonly SearchListDialogOption<TId>[],
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
