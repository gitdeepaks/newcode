import { useState } from "react";
import {
  createPromptCommandInvocation,
  getPromptCommandSuggestions,
  parsePromptCommand,
  type PromptCommandInvocation,
} from "../lib/prompt-commands";

type UsePromptCommandMenuOptions = {
  onCommand?: (command: PromptCommandInvocation) => void;
};

export function usePromptCommandMenu({ onCommand }: UsePromptCommandMenuOptions) {
  const [prompt, setPrompt] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const query = prompt.trim();
  const canShowSuggestions = query.startsWith("/") && !/\s/.test(query);
  const commands = canShowSuggestions ? getPromptCommandSuggestions(query) : [];
  const isOpen = commands.length > 0;

  const handleKey = (key: { name: string }) => {
    if (!isOpen) {
      return false;
    }

    if (key.name === "up") {
      setActiveIndex((index) =>
        index === 0 ? commands.length - 1 : index - 1,
      );
      return true;
    }

    if (key.name === "down") {
      setActiveIndex((index) => (index + 1) % commands.length);
      return true;
    }

    return false;
  };

  const updatePrompt = (value: string) => {
    setPrompt(value);
    setActiveIndex(0);
  };

  const clearPrompt = () => {
    setPrompt("");
  };

  const submitCommand = (value: string) => {
    if (isOpen) {
      const command = commands[activeIndex];

      if (!command) {
        return false;
      }

      onCommand?.(createPromptCommandInvocation(command.name));
      return true;
    }

    const command = parsePromptCommand(value);

    if (!command) {
      return false;
    }

    onCommand?.(command);
    return true;
  };

  const submitCommandAtIndex = (index: number) => {
    const command = commands[index];

    if (!isOpen || !command) {
      return false;
    }

    onCommand?.(createPromptCommandInvocation(command.name));
    return true;
  };

  return {
    activeIndex,
    clearPrompt,
    commands,
    handleKey,
    isOpen,
    prompt,
    submitCommand,
    submitCommandAtIndex,
    setActiveIndex,
    updatePrompt,
  };
}
