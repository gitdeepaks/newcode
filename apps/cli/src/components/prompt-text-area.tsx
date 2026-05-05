import type { TextareaRenderable } from "@opentui/core";
import { useRef } from "react";

type PromptTextAreaProps = {
  onSubmitRoute: (route: string) => void;
};

export function PromptTextArea({ onSubmitRoute }: PromptTextAreaProps) {
  const textareaRef = useRef<TextareaRenderable>(null);

  return (
    <box width={72}>
      <box border borderColor="#30363d" paddingX={1} paddingY={0}>
        <textarea
          ref={textareaRef}
          onSubmit={() => onSubmitRoute(textareaRef.current?.plainText ?? "")}
          placeholder="Enter /, /about, or /settings and press Enter..."
          width={68}
          height={5}
          focused
          keyBindings={[
            { name: "return", action: "submit" },
            { name: "return", shift: true, action: "newline" },
          ]}
          wrapMode="word"
          backgroundColor="#0d1117"
          focusedBackgroundColor="#0d1117"
          textColor="#e6edf3"
          focusedTextColor="#e6edf3"
          placeholderColor="#6e7681"
          cursorColor="#58a6ff"
          selectionBg="#1f6feb"
        />
      </box>
    </box>
  );
}
