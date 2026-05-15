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
    name: "/sessions",
    description: "Open sessions",
  },
  {
    name: "/model",
    description: "Change active model",
  },
  {
    name: "/login",
    description: "Sign in with Clerk",
  },
  {
    name: "/logout",
    description: "Sign out",
  },
  {
    name: "/upgrade",
    description: "Buy credits",
  },
  {
    name: "/usage",
    description: "Show credits usage",
  },
  {
    name: "/theme",
    description: "Change active theme",
  },
  {
    name: "/info",
    description: "Show info toast",
  },
  {
    name: "/success",
    description: "Show success toast",
  },
  {
    name: "/warning",
    description: "Show warning toast",
  },
  {
    name: "/error",
    description: "Show error toast",
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

export function getPromptCommandSuggestions(query: string) {
  return promptCommands.filter((command) => command.name.startsWith(query));
}
