# Standalone CLI Development Plan

## Goal

Run `newcode` from any directory on this machine and have it open the CLI against that directory, while the server runs separately at `http://localhost:3000`.

This is a development-only setup. It uses local linking and does not try to produce a redistributable package yet.

In this document, "standalone" means the command can be launched from any directory. It does not mean the CLI is independent of Bun or independent of this repo's installed dependencies.

OpenTUI is Bun-first and uses native/platform packages at runtime. The linked `newcode` command must execute with Bun.

## Current Structure

- CLI app: `apps/cli`
- Server app: `apps/server`
- Shared agent/tooling package: `packages/ai`, published in the workspace as `newcode-ai`
- CLI build output: `apps/cli/dist/index.js`
- Server dev command: `bun run dev:server`
- CLI build command: `bun run build:cli`
- Runtime requirement: Bun must be installed and available on `PATH`

The CLI already talks to the server over HTTP:

```ts
const BASE_URL = process.env.SERVER_URL ?? "http://localhost:3000";
```

The CLI currently imports the server only for Hono RPC typing:

```ts
import type { AppType } from "@newcode/server/app";
```

That import is type-only and is erased from the bundled CLI output. It should stay type-only.

## Bundle Boundary

The CLI bundle must not include server runtime code.

Keep these rules:

- Do not import `app` from `@newcode/server/app` in CLI runtime code.
- Do not import server routes, middleware, DB, payments, or provider setup from `apps/cli`.
- Keep `@newcode/server` in `apps/cli/package.json` as a development/type dependency only.
- Keep `newcode-ai/server` imports type-only from CLI code.
- Put browser/CLI-safe shared code in `newcode-ai` or `newcode-ai/client`.
- Put provider/model execution code in `newcode-ai/server` and use it from the server only.

Current verification from the existing bundle:

- No `@clerk/backend`, `@newcode/db`, `@newcode/payments`, `@ai-sdk/anthropic`, or `@ai-sdk/openai` strings appear in `apps/cli/dist/index.js`.
- The `Bun.serve` usage in the CLI source is the local OAuth callback server in `apps/cli/src/lib/auth/callback-server.ts`, not the application server.
- The built CLI still includes OpenTUI runtime code and dynamically imports the platform package with a shape like `@opentui/core-${process.platform}-${process.arch}`.

That means the CLI can be built without bundling the app server, but it is not a Node-compatible standalone script.

## Runtime Boundary

The linked command should be treated as a Bun executable.

Supported for this development setup:

- `newcode` from any directory after local linking.
- `#!/usr/bin/env bun` as the executable shebang.
- Dependencies resolved from the linked repo checkout.
- Server running separately at `http://localhost:3000`.

Not supported by this plan:

- Running the CLI with `node dist/index.js`.
- Running the CLI without Bun installed.
- Copying only `dist/index.js` to another machine or directory and expecting it to work.
- Producing a single-file distributable binary.

## Required Correction

Add a binary entry for development linking. The CLI currently has a build script, but no `bin` entry that exposes a `newcode` command globally.

Create `apps/cli/bin/newcode`:

```ts
#!/usr/bin/env bun
import "../dist/index.js";
```

Make it executable:

```bash
chmod +x apps/cli/bin/newcode
```

Add this to `apps/cli/package.json`:

```json
{
  "bin": {
    "newcode": "./bin/newcode"
  }
}
```

Keep the existing build script:

```json
{
  "scripts": {
    "build": "bun build src/index.tsx --outdir dist --target bun"
  }
}
```

This keeps the linked command small and makes the actual CLI code come from `dist/index.js`.

Do not point `bin.newcode` directly at `dist/index.js` for this first version. A direct `dist/index.js` binary would need a shebang banner and executable permissions, but it would still require Bun and OpenTUI's installed platform packages. The shim is less fragile because it is stable across rebuilds.

If a later experiment intentionally points `bin.newcode` at `./dist/index.js`, the build script must include both a Bun shebang and executable permission handling:

```json
{
  "scripts": {
    "build": "bun build src/index.tsx --outdir dist --target bun --banner '#!/usr/bin/env bun' && chmod +x dist/index.js"
  },
  "bin": {
    "newcode": "./dist/index.js"
  }
}
```

That is not the recommended minimum working setup.

## Environment Setup

The root `dev:cli` script currently injects `../../.env`:

```json
"dev": "bun --env-file=../../.env --watch run src/index.tsx"
```

A linked `newcode` command launched from another directory will not automatically load this repo's `.env`.

For first-time local usage, export the required env vars in your shell before running `newcode`:

```bash
export SERVER_URL=http://localhost:3000
export CLERK_FRONTEND_API=...
export CLERK_OAUTH_CLIENT_ID=...
export CLERK_OAUTH_REDIRECT_URI=http://127.0.0.1:8976/oauth/callback
```

`SERVER_URL` is technically optional when using `http://localhost:3000`, because that is already the CLI default. Keep it explicit for first-run debugging.

Alternative for a repo-local test without exporting env permanently:

```bash
set -a
source /Users/deepaksankhyan/Builds/newcode/.env
set +a
export SERVER_URL=http://localhost:3000
```

## First-Time Working Steps

Run these from the repo root unless noted otherwise.

1. Install dependencies.

```bash
bun install
```

2. Apply the binary correction described above.

Expected files after the correction:

```text
apps/cli/bin/newcode
apps/cli/package.json
```

3. Type-check the CLI and server.

```bash
bun run check:cli
bun run check:server
```

4. Build the CLI.

```bash
bun run build:cli
```

5. Link the CLI package.

```bash
cd apps/cli
bun link
```

6. Confirm the command is visible.

```bash
which newcode
```

If `which newcode` does not resolve after `bun link`, use npm's linker for the development package:

```bash
cd /Users/deepaksankhyan/Builds/newcode/apps/cli
npm link
```

The linked executable must still use the Bun shebang from `apps/cli/bin/newcode`. `npm link` is only a linker fallback; it does not make the app Node-compatible.

7. Start the local server in one terminal.

```bash
cd /Users/deepaksankhyan/Builds/newcode
bun run dev:server
```

Expected server URL:

```text
http://localhost:3000
```

8. Start the CLI from another directory.

```bash
cd /path/to/project-you-want-to-explore
newcode
```

The CLI should start with `process.cwd()` equal to `/path/to/project-you-want-to-explore`.

If it fails before rendering and mentions OpenTUI, native FFI, or `@opentui/core-${platform}-${arch}`, run `bun install` again from the repo root and confirm that `bun` is available from the same shell where `newcode` is launched.

## Workspace Root Behavior

The CLI determines the active workspace from `process.cwd()`:

```ts
export const workspaceRoot = findWorkspaceRoot(process.cwd());
```

`findWorkspaceRoot` walks upward until it finds a `.git` directory. That means:

- Running `newcode` inside a git repository explores that repository root.
- Running `newcode` inside a nested folder of a git repository still explores the repository root.
- Running `newcode` outside a git repository explores the exact directory where `newcode` was launched.

This is the behavior needed for standalone local development.

## Smoke Test

Use a small test directory first:

```bash
mkdir -p /tmp/newcode-smoke
cd /tmp/newcode-smoke
git init
printf "hello\n" > README.md
newcode
```

Inside the CLI:

- Start a new chat.
- Ask it to list files in the workspace.
- It should see `README.md`.
- It should not resolve paths relative to `/Users/deepaksankhyan/Builds/newcode/apps/cli`.

## Rebuild Loop

After changing CLI source code:

```bash
cd /Users/deepaksankhyan/Builds/newcode
bun run build:cli
```

Then run `newcode` again from the target directory. The link points to the package location, so rebuilding `dist/index.js` is enough. Re-linking is only needed if the package link is removed or the `bin` mapping changes.

## Known Development Limitation

This setup still depends on Bun being installed on the machine because the linked binary uses:

```bash
#!/usr/bin/env bun
```

That is acceptable for local development. A distributable CLI can later use a compiled executable or a package manager install flow.

OpenTUI also depends on native/platform packages. Local linking works because the command points back into this repo, where Bun installed those dependencies. This is why copying only `apps/cli/dist/index.js` elsewhere is not a valid test for this plan.

## Distribution Later

Before distribution, test one of these separately:

- A package-manager install flow that installs Bun-compatible dependencies and exposes a Bun shebang binary.
- A compiled executable with `bun build --compile`, validated specifically against OpenTUI's native/platform package loading.

Do not assume `bun build --compile` works until it is tested with OpenTUI rendering, file mentions, auth callback, and chat tool calls.

## Later Cleanup

For a cleaner package boundary before distribution, move the API contract away from `@newcode/server/app` into a shared contract package or shared type module.

For now, this is not required. The current `AppType` import is type-only and does not bundle the server.
