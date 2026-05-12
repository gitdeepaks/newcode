type PromptCommandDefinition = {
  name: string;
  description: string;
};

function definePromptCommands<const Commands extends readonly PromptCommandDefinition[]>(
  commands: Commands,
) {
  return commands;
}

const promptCommands = definePromptCommands([
  {
    name: "/exit",
    description: "Exit the app",
  },
  {
    name: "/new",
    description: "New session",
  },
  {
    name: "/fix",
    description: "Fix current code",
  },
  {
    name: "/explain",
    description: "Explain current code",
  },
  {
    name: "/review",
    description: "Review current changes",
  },
  {
    name: "/summarize",
    description: "Summarize conversation",
  },
  {
    name: "/test",
    description: "Run relevant tests",
  },
  {
    name: "/docs",
    description: "Update documentation",
  },
  {
    name: "/refactor",
    description: "Refactor selected code",
  },
  {
    name: "/optimize",
    description: "Improve performance",
  },
  {
    name: "/security",
    description: "Check security issues",
  },
  {
    name: "/types",
    description: "Improve type safety",
  },
  {
    name: "/commit",
    description: "Create git commit",
  },
  {
    name: "/branch",
    description: "Create or switch branch",
  },
  {
    name: "/diff",
    description: "Show current diff",
  },
  {
    name: "/status",
    description: "Show workspace status",
  },
  {
    name: "/model",
    description: "Change active model",
  },
  {
    name: "/settings",
    description: "Open settings",
  },
  {
    name: "/help",
    description: "Show available commands",
  },
  {
    name: "/clear",
    description: "Clear conversation",
  },
  {
    name: "/history",
    description: "Show prompt history",
  },
  {
    name: "/search",
    description: "Search the codebase",
  },
  {
    name: "/plan",
    description: "Create an implementation plan",
  },
  {
    name: "/apply",
    description: "Apply pending changes",
  },
  {
    name: "/undo",
    description: "Undo last operation",
  },
]);

export type PromptCommandName = (typeof promptCommands)[number]["name"];

export type PromptCommandInvocation = {
  name: PromptCommandName;
  args: string[];
  input: string;
};

export function parsePromptCommand(input: string): PromptCommandInvocation | null {
  const [name, ...args] = input.trim().split(/\s+/);
  const command = promptCommands.find((command) => command.name === name);

  if (!command) {
    return null;
  }

  return { name: command.name, args, input };
}

export function createPromptCommandInvocation(
  name: PromptCommandName,
): PromptCommandInvocation {
  return { name, args: [], input: name };
}

export function getPromptCommandSuggestions() {
  return promptCommands;
}
