import {
  bashInput,
  bashOutput,
  deleteFileInput,
  deleteFileOutput,
  editFileInput,
  editFileOutput,
  globInput,
  globOutput,
  grepInput,
  grepOutput,
  listDirectoryInput,
  listDirectoryOutput,
  readFileInput,
  readFileOutput,
  writeFileInput,
  writeFileOutput,
} from "newcode-ai";

type ToolSummaryState = "input-available" | "output-available" | "output-error";

type FormatToolSummaryArgs = {
  name: string;
  state: ToolSummaryState;
  input: unknown;
  output?: unknown;
  errorText?: string;
};

const maxCommandLength = 72;

export function formatToolSummary({
  name,
  state,
  input,
  output,
  errorText,
}: FormatToolSummaryArgs) {
  const action = formatToolAction(name, input);

  if (state === "input-available") {
    return `[tool: ${name}] ${action}`;
  }

  if (state === "output-error") {
    return `[tool: ${name}] ${action} failed: ${errorText || "Unknown error"}`;
  }

  return `[tool: ${name}] ${formatToolResult(name, input, output)}`;
}

function formatToolAction(name: string, input: unknown) {
  switch (name) {
    case "read_file": {
      const parsed = readFileInput.safeParse(input);
      return parsed.success ? `reading ${parsed.data.path}` : "reading file";
    }
    case "write_file": {
      const parsed = writeFileInput.safeParse(input);
      return parsed.success ? `writing ${parsed.data.path}` : "writing file";
    }
    case "edit_file": {
      const parsed = editFileInput.safeParse(input);
      return parsed.success ? `editing ${parsed.data.path}` : "editing file";
    }
    case "delete_file": {
      const parsed = deleteFileInput.safeParse(input);
      return parsed.success ? `deleting ${parsed.data.path}` : "deleting file";
    }
    case "list_directory": {
      const parsed = listDirectoryInput.safeParse(input);
      if (!parsed.success) return "listing directory";
      return parsed.data.recursive
        ? `listing ${parsed.data.path} recursively`
        : `listing ${parsed.data.path}`;
    }
    case "grep": {
      const parsed = grepInput.safeParse(input);
      if (!parsed.success) return "searching files";
      const scope = parsed.data.path ? ` in ${parsed.data.path}` : "";
      const glob = parsed.data.glob ? ` (${parsed.data.glob})` : "";
      return `searching for "${parsed.data.pattern}"${scope}${glob}`;
    }
    case "glob": {
      const parsed = globInput.safeParse(input);
      if (!parsed.success) return "finding files";
      const scope = parsed.data.path ? ` in ${parsed.data.path}` : "";
      return `finding ${parsed.data.pattern}${scope}`;
    }
    case "bash": {
      const parsed = bashInput.safeParse(input);
      return parsed.success
        ? `running ${truncateCommand(parsed.data.command)}`
        : "running command";
    }
    default:
      return "running";
  }
}

function formatToolResult(name: string, input: unknown, output: unknown) {
  switch (name) {
    case "read_file": {
      const parsedInput = readFileInput.safeParse(input);
      const parsedOutput = readFileOutput.safeParse(output);
      if (!parsedOutput.success) return `${formatToolAction(name, input)} done`;
      const path = parsedInput.success ? `${parsedInput.data.path}: ` : "";
      return `${path}${parsedOutput.data.totalLines} lines${formatTruncated(parsedOutput.data.truncated)}`;
    }
    case "write_file": {
      const parsedInput = writeFileInput.safeParse(input);
      const parsedOutput = writeFileOutput.safeParse(output);
      if (!parsedOutput.success) return `${formatToolAction(name, input)} done`;
      const path = parsedInput.success ? `${parsedInput.data.path}: ` : "";
      return `${path}${parsedOutput.data.bytesWritten} bytes written`;
    }
    case "edit_file": {
      const parsedInput = editFileInput.safeParse(input);
      const parsedOutput = editFileOutput.safeParse(output);
      if (!parsedOutput.success) return `${formatToolAction(name, input)} done`;
      const path = parsedInput.success ? `${parsedInput.data.path}: ` : "";
      return `${path}${parsedOutput.data.replacements} replacements`;
    }
    case "delete_file": {
      const parsedInput = deleteFileInput.safeParse(input);
      const parsedOutput = deleteFileOutput.safeParse(output);
      if (!parsedOutput.success) return `${formatToolAction(name, input)} done`;
      return parsedInput.success ? `deleted ${parsedInput.data.path}` : "deleted file";
    }
    case "list_directory": {
      const parsedInput = listDirectoryInput.safeParse(input);
      const parsedOutput = listDirectoryOutput.safeParse(output);
      if (!parsedOutput.success) return `${formatToolAction(name, input)} done`;
      const path = parsedInput.success ? `${parsedInput.data.path}: ` : "";
      return `${path}${parsedOutput.data.entries.length} entries${formatTruncated(parsedOutput.data.truncated)}`;
    }
    case "grep": {
      const parsedOutput = grepOutput.safeParse(output);
      if (!parsedOutput.success) return `${formatToolAction(name, input)} done`;
      return `${parsedOutput.data.matches.length} matches${formatTruncated(parsedOutput.data.truncated)}`;
    }
    case "glob": {
      const parsedOutput = globOutput.safeParse(output);
      if (!parsedOutput.success) return `${formatToolAction(name, input)} done`;
      return `${parsedOutput.data.paths.length} paths${formatTruncated(parsedOutput.data.truncated)}`;
    }
    case "bash": {
      const parsedInput = bashInput.safeParse(input);
      const parsedOutput = bashOutput.safeParse(output);
      if (!parsedOutput.success) return `${formatToolAction(name, input)} done`;
      const command = parsedInput.success
        ? `${truncateCommand(parsedInput.data.command)}: `
        : "";
      const timeout = parsedOutput.data.timedOut ? ", timed out" : "";
      return `${command}exit ${parsedOutput.data.exitCode}${timeout}${formatTruncated(parsedOutput.data.truncated)}`;
    }
    default:
      return "done";
  }
}

function truncateCommand(command: string) {
  if (command.length <= maxCommandLength) return command;
  return `${command.slice(0, maxCommandLength - 3)}...`;
}

function formatTruncated(truncated: boolean) {
  return truncated ? ", truncated" : "";
}
