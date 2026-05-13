import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { useMemo, useState } from "react";
import type { FileMentionOption } from "../components/file-mention-popover";
import { workspaceRoot } from "../lib/workspace-root";

type MentionMatch = {
  start: number;
  query: string;
};

const ignoredDirectoryNames = new Set([
  ".git",
  ".turbo",
  "dist",
  "node_modules",
]);

const maxMentionOptions = 2_000;

export function useFileMentionMenu() {
  const [prompt, setPrompt] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const allOptions = useMemo(() => getWorkspaceFileOptions(), []);
  const match = getActiveMentionMatch(prompt);
  const options = match ? filterOptions(allOptions, match.query) : [];
  const isOpen = options.length > 0;

  const handleKey = (key: { name: string }) => {
    if (!isOpen) {
      return false;
    }

    if (key.name === "up") {
      setActiveIndex((index) =>
        index === 0 ? options.length - 1 : index - 1,
      );
      return true;
    }

    if (key.name === "down") {
      setActiveIndex((index) => (index + 1) % options.length);
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
    setActiveIndex(0);
  };

  const insertOptionAtIndex = (index: number) => {
    const option = options[index];

    if (!match || !option) {
      return undefined;
    }

    const nextPrompt = `${prompt.slice(0, match.start)}@${option.path} ${prompt.slice(match.start + match.query.length + 1)}`;
    const cursorOffset = match.start + option.path.length + 2;

    setPrompt(nextPrompt);
    setActiveIndex(0);
    return { cursorOffset, prompt: nextPrompt };
  };

  return {
    activeIndex,
    clearPrompt,
    handleKey,
    insertOptionAtIndex,
    isOpen,
    options,
    prompt,
    setActiveIndex,
    updatePrompt,
  };
}

function getWorkspaceFileOptions() {
  const options: FileMentionOption[] = [];

  collectWorkspaceFileOptions(workspaceRoot, options);

  return options.sort((first, second) => {
    if (first.type !== second.type) {
      return first.type === "directory" ? -1 : 1;
    }

    return first.path.localeCompare(second.path);
  });
}

function collectWorkspaceFileOptions(
  directory: string,
  options: FileMentionOption[],
) {
  if (options.length >= maxMentionOptions) {
    return;
  }

  const entries = readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (options.length >= maxMentionOptions) {
      return;
    }

    if (entry.isDirectory() && ignoredDirectoryNames.has(entry.name)) {
      continue;
    }

    const absolutePath = join(directory, entry.name);
    const relativePath = relative(workspaceRoot, absolutePath);

    if (entry.isDirectory()) {
      options.push({ path: `${relativePath}/`, type: "directory" });
      collectWorkspaceFileOptions(absolutePath, options);
      continue;
    }

    if (entry.isFile()) {
      options.push({ path: relativePath, type: "file" });
    }
  }
}

function filterOptions(
  options: readonly FileMentionOption[],
  query: string,
) {
  const normalizedQuery = query.toLowerCase();

  if (!normalizedQuery) {
    return options;
  }

  return options.filter((option) =>
    option.path.toLowerCase().includes(normalizedQuery),
  );
}

function getActiveMentionMatch(prompt: string): MentionMatch | undefined {
  const mentionStart = prompt.lastIndexOf("@");

  if (mentionStart === -1 || !canStartMention(prompt, mentionStart)) {
    return undefined;
  }

  const query = prompt.slice(mentionStart + 1);

  if (/\s|["'`]/.test(query)) {
    return undefined;
  }

  return { start: mentionStart, query };
}

function canStartMention(prompt: string, index: number) {
  const previousCharacter = prompt[index - 1];

  if (previousCharacter && /[\w.-]/.test(previousCharacter)) {
    return false;
  }

  return !isInsideQuotes(prompt.slice(0, index));
}

function isInsideQuotes(value: string) {
  let singleQuoted = false;
  let doubleQuoted = false;
  let backtickQuoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const escaped = value[index - 1] === "\\";

    if (escaped) {
      continue;
    }

    if (character === "'" && !doubleQuoted && !backtickQuoted) {
      singleQuoted = !singleQuoted;
    }

    if (character === '"' && !singleQuoted && !backtickQuoted) {
      doubleQuoted = !doubleQuoted;
    }

    if (character === "`" && !singleQuoted && !doubleQuoted) {
      backtickQuoted = !backtickQuoted;
    }
  }

  return singleQuoted || doubleQuoted || backtickQuoted;
}
