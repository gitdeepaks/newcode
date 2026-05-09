import type { BashInput, BashOutput } from "./schema";

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_BYTES = 64 * 1024;

export async function bash(
  workspaceRoot: string,
  input: BashInput,
): Promise<BashOutput> {
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const proc = Bun.spawn(["bash", "-c", input.command], {
    cwd: workspaceRoot,
    stdout: "pipe",
    stderr: "pipe",
  });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill("SIGKILL");
  }, timeoutMs);

  try {
    const [stdoutRaw, stderrRaw, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    const stdout = capBytes(stdoutRaw);
    const stderr = capBytes(stderrRaw);
    const truncated = stdout.truncated || stderr.truncated;

    return {
      stdout: stdout.text,
      stderr: stderr.text,
      exitCode,
      truncated,
      timedOut,
    };
  } finally {
    clearTimeout(timer);
  }
}

function capBytes(text: string): { text: string; truncated: boolean } {
  if (Buffer.byteLength(text, "utf8") <= MAX_BYTES) {
    return { text, truncated: false };
  }
  const buf = Buffer.from(text, "utf8").subarray(0, MAX_BYTES);
  return { text: buf.toString("utf8"), truncated: true };
}
