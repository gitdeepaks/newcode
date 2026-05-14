import { useChat } from "@ai-sdk/react";
import { useTerminalDimensions } from "@opentui/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type ChatAddToolOutputFunction,
} from "ai";
import {
  DEFAULT_MODE,
  getNextMode,
  type Mode,
} from "newcode-ai";
import {
  createOnToolCall,
  validateCodingAgentMessages,
} from "newcode-ai/client";
import type { CodingAgentUIMessage } from "newcode-ai/server";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { ChatMessage } from "../components/chat/chat-message";
import { PromptTextArea } from "../components/prompt-text-area";
import { toast } from "../components/toast";

import { usePromptCommand } from "../hooks/use-prompt-command";
import { client, getAuthHeaders } from "../lib/client";
import { useModelSelection } from "../lib/model-selection";
import { useTheme } from "../lib/theme";
import { type TuiLayerKeyHandler, useTuiLayer } from "../lib/tui-layer-manager";
import { workspaceRoot } from "../lib/workspace-root";
import { chatLocationStateSchema } from "../routes/state";

const MAX_CONTENT_WIDTH = 120;
const MAX_COMPOSER_WIDTH = 120;
const HORIZONTAL_PADDING = 4;

export function ChatScreen() {
  const theme = useTheme();
  const navigate = useNavigate();
  const handleCommand = usePromptCommand();
  const { modelId } = useModelSelection();
  const location = useLocation();
  const { id: sessionId } = useParams<{ id: string }>();
  const { width, height } = useTerminalDimensions();
  const routeState = chatLocationStateSchema.parse(location.state);
  const initialPromptRef = useRef<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<Mode>(routeState.mode);
  const [messageModes, setMessageModes] = useState(
    () => new Map<string, Mode>(),
  );
  const modeRef = useRef(mode);
  const modelIdRef = useRef(modelId);
  const pendingMessageModeRef = useRef<Mode | null>(null);
  const lastToastedErrorRef = useRef<Error | null>(null);

  modeRef.current = mode;
  modelIdRef.current = modelId;

  useEffect(() => {
    setMode(routeState.mode);
  }, [routeState.mode, sessionId]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<CodingAgentUIMessage>({
        api: client.chat[":sessionId"]
          .$url({ param: { sessionId: sessionId ?? "" } })
          .toString(),
        // `useChat` keeps one Chat instance for a stable id, so transport
        // changes alone do not replace the underlying transport. Resolve the
        // body lazily so each request sees the latest mode and model.
        body: () => ({ mode: modeRef.current, modelId: modelIdRef.current }),
        headers: getAuthHeaders,
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
        mode,
        getAddToolOutput: () => {
          const fn = addToolOutputRef.current;
          if (!fn) throw new Error("addToolOutput not bound yet");
          return fn;
        },
      }),
    [mode],
  );

  const { messages, sendMessage, setMessages, status, error, addToolOutput } =
    useChat<CodingAgentUIMessage>({
      id: sessionId,
      transport,
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
      onToolCall,
    });

  addToolOutputRef.current = addToolOutput;

  function submitPrompt(text: string) {
    pendingMessageModeRef.current = modeRef.current;
    void sendMessage({ text });
  }

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
      // `CodingAgentUIMessage[]` through the AI package's client helper.
      const messages = await validateCodingAgentMessages<CodingAgentUIMessage>(
        data.messages.map((message) => message.payload),
      );
      if (cancelled) return;
      setMessages(messages);
      setMessageModes(
        new Map(
          messages.map((message, index) => [
            message.id,
            data.messages[index]?.mode ?? DEFAULT_MODE,
          ]),
        ),
      );
      setHydrated(true);
    }

    void hydrateMessages();

    return () => {
      cancelled = true;
    };
  }, [sessionId, navigate, setMessages]);

  useEffect(() => {
    if (messages.every((message) => messageModes.has(message.id))) {
      return;
    }

    setMessageModes((currentModes) => {
      const nextModes = new Map(currentModes);
      for (const message of messages) {
        if (!nextModes.has(message.id)) {
          nextModes.set(
            message.id,
            pendingMessageModeRef.current ?? modeRef.current,
          );
        }
      }
      pendingMessageModeRef.current = null;
      return nextModes;
    });
  }, [messages, messageModes]);

  useEffect(() => {
    if (
      !hydrated ||
      !routeState.prompt ||
      initialPromptRef.current === routeState.prompt
    ) {
      return;
    }
    if (messages.length > 0) {
      // History exists — don't replay the navigation prompt.
      initialPromptRef.current = routeState.prompt;
      return;
    }

    initialPromptRef.current = routeState.prompt;
    submitPrompt(routeState.prompt);
  }, [hydrated, routeState.prompt, messages.length, submitPrompt]);

  const isBusy = status === "submitted" || status === "streaming";
  const isStreaming = status === "streaming";

  useEffect(() => {
    if (!error || lastToastedErrorRef.current === error) {
      return;
    }

    lastToastedErrorRef.current = error;
    if (isInsufficientCreditsError(error)) {
      toast.error("Insufficient credits", {
        description: "Run /upgrade to buy credits or /usage to view your balance.",
        duration: 9000,
      });
      return;
    }

    toast.error("Message was not sent", {
      description: getChatRequestFailureDescription(error),
      duration: 9000,
    });
  }, [error]);

  useTuiLayer({
    onKey: useCallback(
      ((key) => {
        if (key.name === "escape") {
          navigate("/");
          return true;
        }

        if (
          isBusy ||
          key.name !== "tab" ||
          key.shift ||
          key.ctrl ||
          key.meta ||
          key.option
        ) {
          return false;
        }

        setMode((currentMode) => getNextMode(currentMode));
        return true;
      }) satisfies TuiLayerKeyHandler,
      [isBusy, navigate],
    ),
  });

  const contentWidth = Math.max(
    32,
    Math.min(MAX_CONTENT_WIDTH, width - HORIZONTAL_PADDING),
  );
  const composerWidth = Math.max(
    32,
    Math.min(MAX_COMPOSER_WIDTH, width - HORIZONTAL_PADDING),
  );
  const chatViewportHeight = Math.max(1, height - 8);

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
          backgroundColor: theme.bg,
        },
      },
    }),
    [theme],
  );

  return (
    <box flexDirection="column" flexGrow={1}>
      <scrollbox
        height={chatViewportHeight}
        flexDirection="column"
        stickyScroll
        stickyStart="bottom"
        style={scrollboxStyle}
      >
        <box
          flexDirection="row"
          justifyContent="center"
          paddingX={2}
          paddingY={1}
        >
          <box width={contentWidth} flexDirection="column" gap={2}>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                width={contentWidth}
                mode={messageModes.get(message.id) ?? mode}
                streaming={
                  isStreaming && message === messages[messages.length - 1]
                }
              />
            ))}

            {status === "submitted" ? <ThinkingIndicator /> : null}
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
          placeholder="Send a message…"
          mode={mode}
          modelId={modelId}
          onSubmitPrompt={(text) => {
            submitPrompt(text);
          }}
          onCommand={handleCommand}
        />
      </box>
    </box>
  );
}

function getChatRequestFailureDescription(error: Error) {
  const message = error.message.trim();

  if (!message) {
    return "The chat API failed without returning a reason. Check the server logs and try again.";
  }

  return `The chat API stopped the request: ${message}`;
}

function isInsufficientCreditsError(error: Error) {
  const message = error.message.toLowerCase();
  return (
    message.includes("insufficient credits") ||
    message.includes("insufficient_credits") ||
    message.includes("402")
  );
}

function ThinkingIndicator() {
  const theme = useTheme();

  return (
    <box flexDirection="row" alignItems="center" gap={1} paddingX={1}>
      <text>
        <span fg={theme.accent}>●</span>
        <span fg={theme.textMuted}> thinking…</span>
      </text>
    </box>
  );
}
