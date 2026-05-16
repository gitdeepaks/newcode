import { $ } from "bun";
import { cp, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const serverUrl = process.env.SERVER_URL;

if (!serverUrl) {
  console.error("SERVER_URL is required, e.g. SERVER_URL=https://www.newcodetui.in bun run package:cli-release");
  process.exit(1);
}

if (serverUrl === "https://example.com" || serverUrl === "http://example.com") {
  console.error("SERVER_URL must be your deployed API URL, not example.com");
  process.exit(1);
}

const root = process.cwd();
const cliDir = join(root, "apps", "cli");
const releaseDir = join(root, "release");
const stageDir = join(releaseDir, "newcode");

function platformName() {
  if (process.platform === "darwin") return "darwin";
  if (process.platform === "linux") return "linux";
  throw new Error(`Unsupported platform: ${process.platform}`);
}

function archName() {
  if (process.arch === "arm64") return "arm64";
  if (process.arch === "x64") return "x64";
  throw new Error(`Unsupported arch: ${process.arch}`);
}

async function assertExists(path: string, label: string) {
  try {
    await stat(path);
  } catch {
    console.error(`${label} not found at ${path}`);
    process.exit(1);
  }
}

async function main() {
  const artifact = `newcode-${platformName()}-${archName()}.tar.gz`;
  const artifactPath = join(releaseDir, artifact);

  await $`bun run build:cli`;

  await assertExists(join(cliDir, "dist", "index.js"), "CLI build output");
  await rm(stageDir, { recursive: true, force: true });
  await mkdir(stageDir, { recursive: true });

  await cp(join(cliDir, "bin"), join(stageDir, "bin"), { recursive: true });
  await cp(join(cliDir, "dist"), join(stageDir, "dist"), { recursive: true });

  await writeFile(
    join(stageDir, "package.json"),
    `${JSON.stringify(
      {
        name: "newcode-cli-release",
        private: true,
        type: "module",
        bin: {
          newcode: "./bin/newcode",
        },
        dependencies: {
          "@opentui/core": "0.2.2",
          "@opentui/react": "0.2.2",
          react: "^19.2.4",
          "react-reconciler": "^0.32.0",
          "web-tree-sitter": "0.25.10",
        },
      },
      null,
      2,
    )}\n`,
  );

  await $`chmod +x ${join(stageDir, "bin", "newcode")}`;
  await $`bun install --production --cwd ${stageDir}`;
  await rm(artifactPath, { force: true });
  await $`tar -czf ${artifactPath} -C ${releaseDir} newcode`;

  console.log(`Created ${artifactPath}`);
}

main();
