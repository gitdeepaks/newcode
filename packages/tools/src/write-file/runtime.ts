import { mkdir, writeFile as fsWriteFile } from "node:fs/promises";
import path from "node:path";
import { resolveWithinWorkspace } from "../resolve-within-workspace";
import type { WriteFileInput, WriteFileOutput } from "./schema";

export async function writeFile(
  workspaceRoot: string,
  input: WriteFileInput,
): Promise<WriteFileOutput> {
  const abs = resolveWithinWorkspace(workspaceRoot, input.path);
  await mkdir(path.dirname(abs), { recursive: true });
  await fsWriteFile(abs, input.content, "utf8");
  return { bytesWritten: Buffer.byteLength(input.content, "utf8") };
}
