import {
  getToolName,
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
  type DynamicToolUIPart,
  type ReasoningUIPart,
  type TextUIPart,
  type ToolUIPart,
  type UIMessage,
} from "ai";
import type { Mode } from "newcode-ai";
import { getMarkdownSyntaxStyle } from "../../lib/markdown-style";
import { getModeColor } from "../../lib/mode-style";
import { useTheme } from "../../lib/theme";

type AnyUIMessagePart = UIMessage["parts"][number];

type ChatMessageProps = {
  message: UIMessage;
  width: number;
  mode: Mode;
  streaming?: boolean;
};

export function ChatErrorMessage({
  error,
  width,
}: {
  error: Error;
  width: number;
}) {
  const theme = useTheme();

  return (
    <box flexDirection="column" width={width}>
      <text>
        <span fg={theme.danger}>
          <strong>Error</strong>
        </span>
      </text>
      <box
        border={["left"]}
        borderColor={theme.danger}
        backgroundColor={theme.surface}
        paddingX={2}
        paddingY={0}
        flexDirection="column"
        width={width}
      >
        <text fg={theme.danger} selectable>
          {error.message || "Something went wrong."}
        </text>
      </box>
    </box>
  );
}

export function ChatMessage({ message, width, mode, streaming }: ChatMessageProps) {
  const theme = useTheme();
  const isUser = message.role === "user";
  const modeColor = getModeColor(theme, mode);
  const parts = message.parts.map((part, index) => (
    <MessagePart
      // Parts have no stable id; index is fine because order is append-only.
      key={index}
      part={part}
      role={message.role}
      streaming={streaming === true}
    />
  ));

  if (!isUser) {
    return (
      <box flexDirection="column" width={width} paddingX={2} gap={1}>
        {parts}
      </box>
    );
  }

  return (
    <box flexDirection="column" width={width}>
      <box
        border={["left"]}
        borderColor={modeColor}
        backgroundColor={theme.elevatedSurface}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
      >
        {parts}
      </box>
    </box>
  );
}

type MessagePartProps = {
  part: AnyUIMessagePart;
  role: UIMessage["role"];
  streaming: boolean;
};

function MessagePart({ part, role, streaming }: MessagePartProps) {
  if (isTextUIPart(part)) {
    return <TextPart part={part} role={role} streaming={streaming} />;
  }
  if (isReasoningUIPart(part)) {
    return <ReasoningPart part={part} streaming={streaming} />;
  }
  if (isToolUIPart(part)) {
    return <ToolPart part={part} />;
  }
  return null;
}

type TextPartProps = {
  part: TextUIPart;
  role: UIMessage["role"];
  streaming: boolean;
};

function TextPart({ part, role, streaming }: TextPartProps) {
  const theme = useTheme();
  const content = part.text || " ";
  const isStreaming = streaming && part.state === "streaming";

  if (role === "user") {
    return (
      <text fg={theme.text} selectable>
        {content}
      </text>
    );
  }

  return (
    <markdown
      content={content}
      syntaxStyle={getMarkdownSyntaxStyle(theme)}
      fg={theme.text}
      streaming={isStreaming}
      tableOptions={{
        borderStyle: "rounded",
        borderColor: theme.border,
        wrapMode: "word",
      }}
    />
  );
}

function ReasoningPart({
  part,
  streaming,
}: {
  part: ReasoningUIPart;
  streaming: boolean;
}) {
  const theme = useTheme();
  const isStreaming = streaming && part.state === "streaming";

  return (
    <box flexDirection="column" gap={0}>
      <text>
        <span fg={theme.textMuted}>
          <strong>Reasoning</strong>
        </span>
        {isStreaming ? <span fg={theme.textMuted}> · thinking…</span> : null}
      </text>
      <text fg={theme.textSecondary} selectable>
        {part.text || " "}
      </text>
    </box>
  );
}

function ToolPart({ part }: { part: ToolUIPart | DynamicToolUIPart }) {
  const theme = useTheme();
  const name = getToolName(part);

  switch (part.state) {
    case "input-available":
      return (
        <ToolHeader glyph="▶" color={theme.accent} name={name}>
          <PreviewLine label="input" value={part.input} />
        </ToolHeader>
      );
    case "output-available":
      return (
        <ToolHeader glyph="✓" color={theme.success} name={name}>
          <PreviewLine label="output" value={part.output} />
        </ToolHeader>
      );
    case "output-error":
      return (
        <ToolHeader glyph="✗" color={theme.danger} name={name}>
          <text fg={theme.danger} selectable>
            {part.errorText}
          </text>
        </ToolHeader>
      );
    default:
      return <ToolHeader glyph="·" color={theme.textMuted} name={name} />;
  }
}

function ToolHeader({
  glyph,
  color,
  name,
  children,
}: {
  glyph: string;
  color: string;
  name: string;
  children?: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <box flexDirection="column" gap={0}>
      <text>
        <span fg={color}>
          <strong>{glyph} </strong>
        </span>
        <span fg={theme.text}>{name}</span>
      </text>
      {children ? <box paddingLeft={2}>{children}</box> : null}
    </box>
  );
}

function PreviewLine({ label, value }: { label: string; value: unknown }) {
  const theme = useTheme();

  return (
    <text>
      <span fg={theme.textMuted}>{label}: </span>
      <span fg={theme.textSecondary}>{previewValue(value)}</span>
    </text>
  );
}

function previewValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "—";
  }
  if (typeof value === "string") {
    return truncate(value, 200);
  }
  try {
    return truncate(JSON.stringify(value), 200);
  } catch {
    return "[unserializable]";
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1)}…`;
}
