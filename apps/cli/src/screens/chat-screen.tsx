import { useChat } from "@ai-sdk/react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { z } from "zod";
import { KeyCap } from "../components/key-cap";
import { PromptTextArea } from "../components/prompt-text-area";
import { StatusBar } from "../components/status-bar";
import { client } from "../lib/client";
import { getMarkdownSyntaxStyle } from "../lib/markdown-style";
import { theme } from "../lib/theme";

const chatLocationStateSchema = z.object({
  prompt: z.string().catch(""),
});

const MAX_CONTENT_WIDTH = 96;
const MAX_COMPOSER_WIDTH = 82;
const HORIZONTAL_PADDING = 4;

export function ChatScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { width } = useTerminalDimensions();
  const { prompt } = chatLocationStateSchema
    .catch({ prompt: "" })
    .parse(location.state);
  const initialPromptRef = useRef<string | null>(null);

  useKeyboard((key) => {
    if (key.name === "escape") {
      navigate("/");
    }
  });

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: client.chat.$url().toString(),
    }),
  });

  useEffect(() => {
    if (!prompt || initialPromptRef.current === prompt) {
      return;
    }

    initialPromptRef.current = prompt;
    void sendMessage({ text: prompt });
  }, [prompt, sendMessage]);

  const isBusy = status === "submitted" || status === "streaming";
  const isStreaming = status === "streaming";

  const contentWidth = Math.max(
    32,
    Math.min(MAX_CONTENT_WIDTH, width - HORIZONTAL_PADDING),
  );
  const composerWidth = Math.max(
    32,
    Math.min(MAX_COMPOSER_WIDTH, width - HORIZONTAL_PADDING),
  );

  const scrollboxStyle = useMemo(
    () => ({
      rootOptions: { backgroundColor: theme.bg },
      wrapperOptions: { backgroundColor: theme.bg },
      viewportOptions: { backgroundColor: theme.bg },
      contentOptions: { backgroundColor: theme.bg },
      scrollbarOptions: {
        showArrows: false,
        trackOptions: {
          foregroundColor: theme.scrollTrackFg,
          backgroundColor: theme.scrollTrackBg,
        },
      },
    }),
    [],
  );

  return (
    <box flexDirection="column" flexGrow={1}>
      <ChatHeader messageCount={messages.length} />

      <scrollbox
        flexGrow={1}
        flexDirection="column"
        stickyScroll
        stickyStart="bottom"
        style={scrollboxStyle}
      >
        <box flexDirection="column" flexGrow={1}>
          {/* Pushes content to the bottom when it doesn't overflow. */}
          <box flexGrow={1} />

          <box
            flexDirection="row"
            justifyContent="center"
            paddingX={2}
            paddingY={1}
          >
            <box width={contentWidth} flexDirection="column" gap={1}>
              {messages.length === 0 && !isBusy ? <EmptyState /> : null}

              {messages.map((message) => {
                const text = message.parts
                  .map((part) => (part.type === "text" ? part.text : ""))
                  .join("");

                return (
                  <MessageBubble
                    key={message.id}
                    role={message.role === "user" ? "user" : "assistant"}
                    content={text}
                    width={contentWidth}
                    streaming={
                      isStreaming && message === messages[messages.length - 1]
                    }
                  />
                );
              })}

              {status === "submitted" ? <ThinkingIndicator /> : null}

              {error ? <ErrorPanel message={error.message} /> : null}
            </box>
          </box>
        </box>
      </scrollbox>

      <box
        flexDirection="row"
        justifyContent="center"
        paddingX={2}
        paddingY={1}
        backgroundColor={theme.bg}
      >
        <PromptTextArea
          width={composerWidth}
          clearOnSubmit
          disabled={isBusy}
          onSubmitPrompt={(text) => {
            void sendMessage({ text });
          }}
        />
      </box>

      <StatusBar
        left={
          <>
            <KeyCap label="esc" />
            <text fg={theme.textMuted}>home</text>
          </>
        }
        right={
          <text>
            <span fg={theme.textMuted}>
              {messages.length} message{messages.length === 1 ? "" : "s"}
            </span>
            {isBusy ? (
              <>
                <span fg={theme.borderSubtle}> · </span>
                <span fg={theme.accent}>
                  {status === "submitted" ? "thinking" : "streaming"}
                </span>
              </>
            ) : null}
          </text>
        }
      />
    </box>
  );
}

function ChatHeader({ messageCount }: { messageCount: number }) {
  return (
    <box
      border={["bottom"]}
      borderColor={theme.borderSubtle}
      backgroundColor={theme.surface}
      paddingX={2}
      height={2}
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
    >
      <text>
        <span fg={theme.text}>
          <strong>Chat</strong>
        </span>
        <span fg={theme.textMuted}> · session</span>
      </text>
      <text>
        <span fg={theme.textMuted}>{messageCount} </span>
        <span fg={theme.textMuted}>turns</span>
      </text>
    </box>
  );
}

function EmptyState() {
  return (
    <box
      border
      borderStyle="rounded"
      borderColor={theme.border}
      backgroundColor={theme.surface}
      paddingX={2}
      paddingY={1}
      flexDirection="column"
      gap={1}
    >
      <text>
        <span fg={theme.textSecondary}>No messages yet.</span>
      </text>
      <text>
        <span fg={theme.textMuted}>Type below to start, or press </span>
        <span fg={theme.text} bg={theme.surfaceMuted}>
          {" esc "}
        </span>
        <span fg={theme.textMuted}> to go home.</span>
      </text>
    </box>
  );
}

type MessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
  width: number;
  streaming?: boolean;
};

function MessageBubble({
  role,
  content,
  width,
  streaming,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const stripeColor = isUser ? theme.accent : theme.success;
  const label = isUser ? "You" : "Assistant";
  const labelColor = isUser ? theme.accent : theme.success;
  const bubbleBg = isUser ? theme.surfaceMuted : theme.surface;
  const innerWidth = Math.max(10, width - 3);

  return (
    <box flexDirection="column" gap={0} width={width}>
      <text>
        <span fg={labelColor}>
          <strong>{label}</strong>
        </span>
      </text>
      <box
        border={["left"]}
        borderColor={stripeColor}
        backgroundColor={bubbleBg}
        paddingX={2}
        paddingY={0}
        flexDirection="column"
        width={width}
      >
        {isUser ? (
          <text fg={theme.text} selectable>
            {content || " "}
          </text>
        ) : (
          <markdown
            content={content || " "}
            syntaxStyle={getMarkdownSyntaxStyle()}
            fg={theme.text}
            streaming={streaming}
            width={innerWidth}
            tableOptions={{
              borderStyle: "rounded",
              borderColor: theme.border,
              wrapMode: "word",
            }}
          />
        )}
      </box>
    </box>
  );
}

function ThinkingIndicator() {
  return (
    <box flexDirection="row" alignItems="center" gap={1} paddingX={1}>
      <text>
        <span fg={theme.accent}>●</span>
        <span fg={theme.textMuted}> thinking…</span>
      </text>
    </box>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <box
      border
      borderStyle="rounded"
      borderColor={theme.danger}
      backgroundColor={theme.surface}
      paddingX={2}
      paddingY={1}
      title=" Error "
      titleAlignment="left"
    >
      <text fg={theme.danger} selectable>
        {message}
      </text>
    </box>
  );
}
