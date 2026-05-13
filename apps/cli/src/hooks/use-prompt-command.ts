import { useRenderer } from "@opentui/react";
import { DEFAULT_MODE } from "newcode-ai";
import { createElement } from "react";
import { useNavigate } from "react-router";
import { useDialog } from "../components/dialog";
import { SessionDialog } from "../components/session-dialog";
import { ThemeListDialog } from "../components/theme-list-dialog";
import type { PromptCommandInvocation } from "../lib/prompt-commands";
import type { ChatLocationState } from "../routes/state";

export function usePromptCommand() {
  const navigate = useNavigate();
  const renderer = useRenderer();
  const { closeDialog, openDialog } = useDialog();

  return (command: PromptCommandInvocation) => {
    switch (command.name) {
      case "/exit":
        renderer.destroy();
        return;
      case "/new":
        navigate("/", { replace: true });
        return;
      case "/sessions":
        openDialog({
          title: "Sessions",
          content: createElement(SessionDialog, {
            onSessionSelect: (id: string) => {
              const state: ChatLocationState = { prompt: "", mode: DEFAULT_MODE };
              closeDialog();
              navigate(`/sessions/${id}`, { state });
            },
          }),
        });
        return;
      case "/theme":
        openDialog({
          title: "Theme",
          content: createElement(ThemeListDialog, {
            onThemeSelect: closeDialog,
          }),
        });
        return;
    }
  };
}
