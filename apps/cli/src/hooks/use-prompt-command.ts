import { useRenderer } from "@opentui/react";
import { useNavigate } from "react-router";
import type { PromptCommandInvocation } from "../lib/prompt-commands";

export function usePromptCommand() {
  const navigate = useNavigate();
  const renderer = useRenderer();

  return (command: PromptCommandInvocation) => {
    switch (command.name) {
      case "/exit":
        renderer.destroy();
        return;
      case "/new":
        navigate("/", { replace: true });
        return;
    }
  };
}
