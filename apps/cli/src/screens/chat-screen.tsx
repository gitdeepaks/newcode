import { useChat } from "@ai-sdk/react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  validateUIMessages,
  type ChatAddToolOutputFunction,
} from "ai";
import { tools } from "newcode-ai";
import { createOnToolCall } from "newcode-ai/client";
import type { CodingAgentUIMessage } from "newcode-ai/server";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import {
  ChatErrorMessage,
  ChatMessage,
} from "../components/chat/chat-message";
import { KeyCap } from "../components/key-cap";
import { PromptTextArea } from "../components/prompt-text-area";
import { StatusBar } from "../components/status-bar";
import { client } from "../lib/client";
import { theme } from "../lib/theme";
import { workspaceRoot } from "../lib/workspace-root";
import { chatLocationStateSchema } from "../routes/state";

const MAX_CONTENT_WIDTH = 96;
const MAX_COMPOSER_WIDTH = 82;
const HORIZONTAL_PADDING = 4;

export function ChatScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: sessionId } = useParams<{ id: string }>();
  const { width } = useTerminalDimensions();
  const { prompt } = chatLocationStateSchema
    .catch({ prompt: "" })
    .parse(location.state);
  const initialPromptRef = useRef<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useKeyboard((key) => {
    if (key.name === "escape") {
      navigate("/");
    }
  });

  const transport = useMemo(
    () =>
      new DefaultChatTransport<CodingAgentUIMessage>({
        api: client.chat[":sessionId"]
          .$url({ param: { sessionId: sessionId ?? "" } })
          .toString(),
      }),
    [sessionId],
  );

  // `onToolCall` runs every time the agent calls a tool, but `addToolOutput`
  // is returned by the same `useChat` we're configuring — so we wire them
  // through a ref. The factory captures the ref's getter; the assignment
  // below keeps the ref pointed at the latest `addToolOutput`.
  const addToolOutputRef =
    useRef<ChatAddToolOutputFunction<CodingAgentUIMessage> | null>(null);
  const onToolCall = useMemo(
    () =>
      createOnToolCall<CodingAgentUIMessage>({
        workspaceRoot,
        getAddToolOutput: () => {
          const fn = addToolOutputRef.current;
          if (!fn) throw new Error("addToolOutput not bound yet");
          return fn;
        },
      }),
    [],
  );

  const { messages, sendMessage, setMessages, status, error, addToolOutput } =
    useChat<CodingAgentUIMessage>({
      id: sessionId,
      transport,
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
      onToolCall,
    });

  addToolOutputRef.current = addToolOutput;

  useEffect(() => {
    if (!sessionId) {
      navigate("/", { replace: true });
      return;
    }

    const id = sessionId;
    let cancelled = false;
    setHydrated(false);

    async function hydrateMessages() {
      const res = await client.sessions[":id"].messages.$get({
        param: { id },
      });
      if (cancelled) return;

      if (res.status === 404) {
        navigate("/", { replace: true });
        return;
      }
      if (!res.ok) {
        setHydrated(true);
        return;
      }

      const data = await res.json();
      if (cancelled) return;
      // Hono RPC widens the message union over JSON, so we narrow back to
      // `CodingAgentUIMessage[]` by re-validating with the same tool schemas
      // the server used on write. No casts needed — the validator's return
      // type carries the right shape.
      const messages = await validateUIMessages<CodingAgentUIMessage>({
        messages: data.messages,
        tools,
      });
      if (cancelled) return;
      setMessages(messages);
      setHydrated(true);
    }

    void hydrateMessages();

    return () => {
      cancelled = true;
    };
  }, [sessionId, navigate, setMessages]);

  useEffect(() => {
    if (!hydrated || !prompt || initialPromptRef.current === prompt) {
      return;
    }
    if (messages.length > 0) {
      // History exists — don't replay the navigation prompt.
      initialPromptRef.current = prompt;
      return;
    }

    initialPromptRef.current = prompt;
    void sendMessage({ text: prompt });
  }, [hydrated, prompt, messages.length, sendMessage]);

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
      <ChatHeader messageCount={messages.length} sessionId={sessionId} />

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

              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  width={contentWidth}
                  streaming={
                    isStreaming && message === messages[messages.length - 1]
                  }
                />
              ))}

              {error ? (
                <ChatErrorMessage error={error} width={contentWidth} />
              ) : null}

              {status === "submitted" ? <ThinkingIndicator /> : null}
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
        flexShrink={0}
      >
        <PromptTextArea
          width={composerWidth}
          clearOnSubmit
          disabled={isBusy || !hydrated}
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

function ChatHeader({
  messageCount,
  sessionId,
}: {
  messageCount: number;
  sessionId: string | undefined;
}) {
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
        <span fg={theme.textMuted}>
          {sessionId ? ` · ${sessionId.slice(0, 8)}` : " · session"}
        </span>
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
