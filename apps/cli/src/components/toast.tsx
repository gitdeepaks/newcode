import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTheme } from "../lib/theme";

export type ToastType = "default" | "success" | "info" | "warning" | "error";

export type ToastOptions = {
  id?: string;
  description?: ReactNode;
  duration?: number;
  type?: ToastType;
};

export type ToastItem = Required<Pick<ToastOptions, "duration" | "type">> & {
  id: string;
  message: ReactNode;
  description?: ReactNode;
};

type ToastInput = ReactNode;

type ToastApi = {
  (message: ToastInput, options?: ToastOptions): string;
  message: (message: ToastInput, options?: Omit<ToastOptions, "type">) => string;
  success: (message: ToastInput, options?: Omit<ToastOptions, "type">) => string;
  info: (message: ToastInput, options?: Omit<ToastOptions, "type">) => string;
  warning: (message: ToastInput, options?: Omit<ToastOptions, "type">) => string;
  error: (message: ToastInput, options?: Omit<ToastOptions, "type">) => string;
  dismiss: (id?: string) => void;
};

type ToastContextValue = {
  toasts: readonly ToastItem[];
  toast: ToastApi;
};

type ToastProviderProps = {
  children: ReactNode;
};

type ToastEvent =
  | { type: "show"; toast: ToastItem }
  | { type: "dismiss"; id?: string };

const DEFAULT_TOAST_DURATION = 4_000;
const MAX_VISIBLE_TOASTS = 4;
const ToastContext = createContext<ToastContextValue | null>(null);
const toastListeners = new Set<(event: ToastEvent) => void>();

function createToastId() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emitToastEvent(event: ToastEvent) {
  for (const listener of toastListeners) {
    listener(event);
  }
}

function showToast(
  message: ToastInput,
  options: ToastOptions = {},
  type: ToastType = options.type ?? "default",
) {
  const id = options.id ?? createToastId();

  emitToastEvent({
    type: "show",
    toast: {
      id,
      message,
      description: options.description,
      duration: options.duration ?? DEFAULT_TOAST_DURATION,
      type,
    },
  });

  return id;
}

export const toast = Object.assign(
  (message: ToastInput, options?: ToastOptions) => showToast(message, options),
  {
    message: (message: ToastInput, options?: Omit<ToastOptions, "type">) =>
      showToast(message, options, "default"),
    success: (message: ToastInput, options?: Omit<ToastOptions, "type">) =>
      showToast(message, options, "success"),
    info: (message: ToastInput, options?: Omit<ToastOptions, "type">) =>
      showToast(message, options, "info"),
    warning: (message: ToastInput, options?: Omit<ToastOptions, "type">) =>
      showToast(message, options, "warning"),
    error: (message: ToastInput, options?: Omit<ToastOptions, "type">) =>
      showToast(message, options, "error"),
    dismiss: (id?: string) => emitToastEvent({ type: "dismiss", id }),
  },
) satisfies ToastApi;

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef(new Map<string, Timer>());

  const dismissToast = useCallback((id?: string) => {
    setToasts((current) => {
      const removedToasts = id
        ? current.filter((item) => item.id === id)
        : current;

      for (const item of removedToasts) {
        const timer = timersRef.current.get(item.id);

        if (timer) {
          clearTimeout(timer);
          timersRef.current.delete(item.id);
        }
      }

      return id ? current.filter((item) => item.id !== id) : [];
    });
  }, []);

  useEffect(() => {
    const listener = (event: ToastEvent) => {
      if (event.type === "dismiss") {
        dismissToast(event.id);
        return;
      }

      setToasts((current) => {
        const next = [
          event.toast,
          ...current.filter((item) => item.id !== event.toast.id),
        ].slice(0, MAX_VISIBLE_TOASTS);

        for (const item of current) {
          if (!next.some((nextItem) => nextItem.id === item.id)) {
            const timer = timersRef.current.get(item.id);

            if (timer) {
              clearTimeout(timer);
              timersRef.current.delete(item.id);
            }
          }
        }

        return next;
      });

      const existingTimer = timersRef.current.get(event.toast.id);

      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      timersRef.current.set(
        event.toast.id,
        setTimeout(() => dismissToast(event.toast.id), event.toast.duration),
      );
    };

    toastListeners.add(listener);

    return () => {
      toastListeners.delete(listener);

      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }

      timersRef.current.clear();
    };
  }, [dismissToast]);

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, toast }),
    [toasts],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}

export function ToastViewport({ toasts }: { toasts: readonly ToastItem[] }) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <box
      position="absolute"
      top={2}
      right={2}
      width={60}
      maxWidth="70%"
      zIndex={200}
      flexDirection="column"
      alignItems="flex-end"
      gap={1}
    >
      {toasts.map((item) => (
        <Toast key={item.id} toast={item} />
      ))}
    </box>
  );
}

export function Toast({ toast: item }: { toast: ToastItem }) {
  const theme = useTheme();
  const accent = theme.toast.variants[item.type];

  return (
    <box
      width="100%"
      flexDirection="column"
      justifyContent="center"
      alignItems="flex-start"
      paddingX={2}
      paddingY={1}
      backgroundColor={theme.toast.background}
      borderColor={accent}
      border={["left", "right"]}
      gap={1}
    >
      <text fg={theme.toast.text}>
        <strong>{item.message}</strong>
      </text>

      {item.description ? (
        <text fg={theme.toast.description} wrapMode="word" width="100%">
          {item.description}
        </text>
      ) : null}
    </box>
  );
}
