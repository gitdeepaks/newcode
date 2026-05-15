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
import { getCodingModel, type CodingModelId, type Mode } from "newcode-ai";
import { getMarkdownSyntaxStyle } from "../../lib/markdown-style";
import { getModeColor } from "../../lib/mode-style";
import { useTheme } from "../../lib/theme";

type AnyUIMessagePart = UIMessage["parts"][number];

type ChatMessageProps = {
  message: UIMessage;
  width: number;
  mode: Mode;
  modelId?: CodingModelId;
  durationMs?: number;
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

export function ChatMessage({
  message,
  width,
  mode,
  modelId,
  durationMs,
  streaming,
}: ChatMessageProps) {
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
      <box flexDirection="column" width={width} paddingX={2} gap={2}>
        {parts}
        <AssistantMessageMeta
          mode={mode}
          modelId={modelId}
          durationMs={durationMs}
          color={modeColor}
        />
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

function AssistantMessageMeta({
  mode,
  modelId,
  durationMs,
  color,
}: {
  mode: Mode;
  modelId?: CodingModelId;
  durationMs?: number;
  color: string;
}) {
  const theme = useTheme();
  const modelLabel = modelId ? getCodingModel(modelId).label : undefined;
  const durationLabel = formatDuration(durationMs);

  return (
    <text>
      <span fg={color}>▣</span>
      <span fg={theme.text}>  </span>
      <span fg={theme.text}>
        <strong>{formatMode(mode)}</strong>
      </span>
      {modelLabel ? <span fg={theme.textMuted}> · {modelLabel}</span> : null}
      {durationLabel ? <span fg={theme.textMuted}> · {durationLabel}</span> : null}
    </text>
  );
}

function formatMode(mode: Mode) {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

function formatDuration(durationMs?: number) {
  if (durationMs === undefined || !Number.isFinite(durationMs) || durationMs < 0) {
    return undefined;
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
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
    return <ReasoningPart part={part} />;
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

function ReasoningPart({ part }: { part: ReasoningUIPart }) {
  const theme = useTheme();

  return (
    <box border={["left"]} borderColor={theme.textMuted} paddingLeft={1}>
      <text fg={theme.textMuted} selectable>
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
        <ToolLine color={theme.textMuted} name={name} state="running" />
      );
    case "output-available":
      return (
        <ToolLine color={theme.textMuted} name={name} state="done" />
      );
    case "output-error":
      return (
        <box border={["left"]} borderColor={theme.textMuted} paddingLeft={1}>
          <text fg={theme.danger} selectable>
            [tool: {name}] failed: {part.errorText}
          </text>
        </box>
      );
    default:
      return <ToolLine color={theme.textMuted} name={name} state="running" />;
  }
}

function ToolLine({
  color,
  name,
  state,
}: {
  color: string;
  name: string;
  state: "running" | "done";
}) {
  const theme = useTheme();

  return (
    <box border={["left"]} borderColor={theme.textMuted} paddingLeft={1}>
      <text fg={color}>
        [tool: {name}] {state}
      </text>
    </box>
  );
}
