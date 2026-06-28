import { useChat } from "@ai-sdk/react";
import { useTerminalDimensions } from "@opentui/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type ChatAddToolOutputFunction,
} from "ai";
import {
  codingModelIdSchema,
  DEFAULT_MODE,
  getNextMode,
  type CodingModelId,
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
const COMPOSER_HEIGHT = 6;
const COMPOSER_VERTICAL_PADDING = 1;
const CHAT_COMPOSER_GAP = 1;
const COMPOSER_SHELL_HEIGHT = COMPOSER_HEIGHT + COMPOSER_VERTICAL_PADDING * 2;

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
  const [messageModels, setMessageModels] = useState(
    () => new Map<string, CodingModelId>(),
  );
  const [messageDurations, setMessageDurations] = useState(
    () => new Map<string, number>(),
  );
  const [recommendedPrompt, setRecommendedPrompt] = useState("");
  const modeRef = useRef(mode);
  const modelIdRef = useRef(modelId);
  const pendingMessageModeRef = useRef<Mode | null>(null);
  const pendingMessageModelRef = useRef<CodingModelId | null>(null);
  const pendingMessageStartedAtRef = useRef<number | null>(null);
  const lastToastedErrorRef = useRef<Error | null>(null);
  const messagesRef = useRef<CodingAgentUIMessage[]>([]);
  const currentPromptRef = useRef("");
  const placeholderRequestIdRef = useRef(0);
  const awaitingRecommendedPromptRef = useRef(false);
  const suggestionBaselineMessageIdRef = useRef<string | null>(null);
  const lastSuggestedAssistantMessageIdRef = useRef<string | null>(null);

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

  const loadRecommendedNextPrompt = useCallback(async (finishedMessages?: CodingAgentUIMessage[]) => {
    if (!sessionId) {
      return;
    }

    const requestId = placeholderRequestIdRef.current + 1;
    placeholderRequestIdRef.current = requestId;

    try {
      const res = await client.chat[":sessionId"].placeholder.$post({
        param: { sessionId },
        json: {
          messages: finishedMessages ?? messagesRef.current,
          mode: modeRef.current,
          modelId: modelIdRef.current,
        },
      });

      if (!res.ok || placeholderRequestIdRef.current !== requestId) {
        return;
      }

      const data = await res.json();
      const placeholder = data.placeholder.trim();
      if (!placeholder) {
        return;
      }

      if (currentPromptRef.current.trim().length > 0) {
        return;
      }

      setRecommendedPrompt(placeholder);
    } catch {
      // Suggestions are optional UX; chat completion should remain quiet.
    }
  }, [sessionId]);

  const { messages, sendMessage, setMessages, status, error, addToolOutput, stop } =
    useChat<CodingAgentUIMessage>({
      id: sessionId,
      transport,
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
      onToolCall,
    });

  addToolOutputRef.current = addToolOutput;
  messagesRef.current = messages;

  const submitPrompt = useCallback((text: string) => {
    placeholderRequestIdRef.current += 1;
    setRecommendedPrompt("");
    currentPromptRef.current = "";
    awaitingRecommendedPromptRef.current = true;
    suggestionBaselineMessageIdRef.current = messagesRef.current.at(-1)?.id ?? null;
    pendingMessageModeRef.current = modeRef.current;
    pendingMessageModelRef.current = modelIdRef.current;
    pendingMessageStartedAtRef.current = Date.now();
    void sendMessage({ text });
  }, [sendMessage]);

  useEffect(() => {
    placeholderRequestIdRef.current += 1;
    setRecommendedPrompt("");
    awaitingRecommendedPromptRef.current = false;
    suggestionBaselineMessageIdRef.current = null;
    lastSuggestedAssistantMessageIdRef.current = null;
  }, [sessionId]);

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
      const messages = await validateCodingAgentMessages(
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
      setMessageModels(
        new Map(
          messages.flatMap((message, index) => {
            const parsedModel = codingModelIdSchema.safeParse(
              data.messages[index]?.model,
            );
            return parsedModel.success ? [[message.id, parsedModel.data]] : [];
          }),
        ),
      );
      setMessageDurations(getResponseDurations(data.messages, messages));
      lastSuggestedAssistantMessageIdRef.current =
        messages.findLast((message) => message.role === "assistant")?.id ?? null;
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
    if (messages.every((message) => messageModels.has(message.id))) {
      return;
    }

    setMessageModels((currentModels) => {
      const nextModels = new Map(currentModels);
      for (const message of messages) {
        if (!nextModels.has(message.id)) {
          nextModels.set(
            message.id,
            pendingMessageModelRef.current ?? modelIdRef.current,
          );
        }
      }
      pendingMessageModelRef.current = null;
      return nextModels;
    });
  }, [messages, messageModels]);

  useEffect(() => {
    if (status === "submitted" || status === "streaming") {
      return;
    }

    const lastMessage = messages.at(-1);
    const startedAt = pendingMessageStartedAtRef.current;
    if (!lastMessage || lastMessage.role !== "assistant" || startedAt === null) {
      return;
    }

    setMessageDurations((currentDurations) => {
      if (currentDurations.has(lastMessage.id)) {
        return currentDurations;
      }

      const nextDurations = new Map(currentDurations);
      nextDurations.set(lastMessage.id, Date.now() - startedAt);
      return nextDurations;
    });
    pendingMessageStartedAtRef.current = null;
  }, [messages, status]);

  useEffect(() => {
    if (
      !hydrated ||
      status !== "ready" ||
      !awaitingRecommendedPromptRef.current ||
      lastAssistantMessageIsCompleteWithToolCalls({ messages })
    ) {
      return;
    }

    const lastMessage = messages.at(-1);
    if (
      !lastMessage ||
      lastMessage.role !== "assistant" ||
      lastMessage.id === suggestionBaselineMessageIdRef.current ||
      lastMessage.id === lastSuggestedAssistantMessageIdRef.current
    ) {
      return;
    }

    lastSuggestedAssistantMessageIdRef.current = lastMessage.id;
    awaitingRecommendedPromptRef.current = false;
    void loadRecommendedNextPrompt(messages);
  }, [hydrated, loadRecommendedNextPrompt, messages, status]);

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
          if (isBusy) {
            placeholderRequestIdRef.current += 1;
            setRecommendedPrompt("");
            awaitingRecommendedPromptRef.current = false;
            suggestionBaselineMessageIdRef.current = null;
            void stop();
            return true;
          }

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
      [isBusy, navigate, stop],
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
  const chatViewportHeight = Math.max(
    1,
    height - COMPOSER_SHELL_HEIGHT - CHAT_COMPOSER_GAP,
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
          backgroundColor: theme.bg,
        },
      },
    }),
    [theme],
  );

  return (
    <box flexDirection="column" width={width} height={height} backgroundColor={theme.bg}>
      <box width={width} height={chatViewportHeight} overflow="hidden" flexShrink={0}>
        <scrollbox
          width={width}
          height={chatViewportHeight}
          flexDirection="column"
          stickyScroll
          stickyStart="bottom"
          style={scrollboxStyle}
        >
          <box
            width={width}
            flexDirection="row"
            justifyContent="center"
            paddingX={2}
            paddingTop={1}
            paddingBottom={1}
          >
            <box width={contentWidth} flexDirection="column" gap={2}>
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  width={contentWidth}
                  mode={messageModes.get(message.id) ?? mode}
                  modelId={messageModels.get(message.id)}
                  durationMs={messageDurations.get(message.id)}
                  streaming={
                    isStreaming && message === messages[messages.length - 1]
                  }
                />
              ))}

              {status === "submitted" ? <ThinkingIndicator /> : null}
            </box>
          </box>
        </scrollbox>
      </box>

      <box height={CHAT_COMPOSER_GAP} flexShrink={0} backgroundColor={theme.bg} />

      <box
        width={width}
        height={COMPOSER_SHELL_HEIGHT}
        flexDirection="row"
        justifyContent="center"
        paddingX={2}
        paddingY={COMPOSER_VERTICAL_PADDING}
        backgroundColor={theme.bg}
        overflow="visible"
        flexShrink={0}
      >
        <PromptTextArea
          width={composerWidth}
          clearOnSubmit
          disabled={isBusy || !hydrated}
          placeholder={recommendedPrompt || "Send a message…"}
          mode={mode}
          modelId={modelId}
          onSubmitPrompt={(text) => {
            submitPrompt(text);
          }}
          onPromptChange={(prompt) => {
            currentPromptRef.current = prompt;
          }}
          onAcceptPlaceholder={
            recommendedPrompt
              ? (prompt) => {
                  currentPromptRef.current = prompt;
                  setRecommendedPrompt("");
                }
              : undefined
          }
          onCommand={handleCommand}
        />
      </box>
    </box>
  );
}

function getResponseDurations(
  records: { createdAt: string }[],
  messages: CodingAgentUIMessage[],
) {
  const durations = new Map<string, number>();
  let lastUserCreatedAt: number | null = null;

  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    const createdAt = Date.parse(records[index]?.createdAt ?? "");
    if (!Number.isFinite(createdAt)) {
      continue;
    }

    if (message.role === "user") {
      lastUserCreatedAt = createdAt;
      continue;
    }

    if (message.role === "assistant" && lastUserCreatedAt !== null) {
      durations.set(message.id, createdAt - lastUserCreatedAt);
    }
  }

  return durations;
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
    <box flexDirection="row" alignItems="center" gap={1} paddingX={2}>
      <text>
        <span fg={theme.textMuted}>Thinking...</span>
      </text>
    </box>
  );
}
