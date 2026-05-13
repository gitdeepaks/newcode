import { RGBA } from "@opentui/core";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { type Theme, useTheme } from "../lib/theme";
import { type TuiLayerKeyHandler, useTuiLayer } from "../lib/tui-layer-manager";

type DialogOptions = {
  title: string;
  body?: ReactNode;
  content?: ReactNode;
};

type DialogContextValue = {
  isOpen: boolean;
  title: string;
  body: ReactNode;
  openDialog: (options: DialogOptions) => void;
  closeDialog: () => void;
};

type DialogProviderProps = {
  children: ReactNode;
};

type DialogProps = {
  title?: string;
  maxWidth?: number | `${number}%` | "auto";
  children?: ReactNode;
};

type DialogOverlayProps = {
  children?: ReactNode;
};

export function getDialogColors(theme: Theme) {
  return {
    background: theme.dialogSurface,
    activeOptionBackground: theme.selectedBackground,
    activeOptionText: theme.inverseText,
  } as const;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: DialogProviderProps) {
  const [dialog, setDialog] = useState<DialogOptions | null>(null);

  const closeDialog = useCallback(() => setDialog(null), []);

  const value = useMemo<DialogContextValue>(
    () => ({
      isOpen: dialog !== null,
      title: dialog?.title ?? "",
      body: dialog?.body ?? <text>TODO</text>,
      openDialog: setDialog,
      closeDialog,
    }),
    [closeDialog, dialog],
  );

  return (
    <DialogContext.Provider value={value}>
      {children}
      {dialog ? (
        <DialogOverlay>
          {dialog.content ?? (
            <Dialog title={dialog.title}>{dialog.body}</Dialog>
          )}
        </DialogOverlay>
      ) : null}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error("useDialog must be used within DialogProvider");
  }

  return context;
}

export function DialogOverlay({ children }: DialogOverlayProps) {
  const theme = useTheme();
  const { closeDialog } = useDialog();
  const overlayBackground = RGBA.fromValues(
    theme.overlay.r,
    theme.overlay.g,
    theme.overlay.b,
    theme.overlay.a,
  );

  useTuiLayer({
    onKey: useCallback(
      ((key) => {
        if (key.name === "escape" || (key.ctrl && key.name === "c")) {
          closeDialog();
          return true;
        }

        return false;
      }) satisfies TuiLayerKeyHandler,
      [closeDialog],
    ),
  });

  return (
    <box
      position="absolute"
      left={0}
      top={0}
      width="100%"
      height="100%"
      zIndex={100}
      paddingY={1}
      justifyContent="center"
      alignItems="center"
      backgroundColor={overlayBackground}
      onMouseDown={closeDialog}
    >
      {children}
    </box>
  );
}

export function Dialog({ title, maxWidth = 96, children }: DialogProps) {
  const theme = useTheme();
  const context = useContext(DialogContext);
  const closeDialog = context?.closeDialog;
  const dialogTitle = title ?? context?.title ?? "";
  const dialogBody = children ?? context?.body ?? <text>TODO</text>;

  return (
    <box
      width="80%"
      maxWidth={maxWidth}
      flexDirection="column"
      backgroundColor={theme.dialogSurface}
      paddingX={4}
      paddingY={2}
      gap={2}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <box flexDirection="row" justifyContent="space-between">
        <text>
          <strong>{dialogTitle}</strong>
        </text>
        <text onMouseDown={closeDialog}>
          <span fg={theme.textMuted}>esc</span>
        </text>
      </box>

      <box flexDirection="column">
        {dialogBody}
      </box>
    </box>
  );
}
