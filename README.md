# newcode

Terminal-native AI pair programmer. newcode is a keyboard-first coding agent that runs in your terminal, connects to a Bun/Hono API, persists sessions in PostgreSQL, and meters usage through a credit-based billing backend.

The project is organized as a Bun workspace with separate apps for the CLI and API, plus shared packages for AI orchestration, persistence, payments, and common types.

## Highlights

- Interactive terminal UI built with OpenTUI, React 19, and React Router memory routing.
- Hono API running on Bun with typed RPC access from the CLI.
- AI SDK 6 integration with Anthropic and OpenAI model support.
- Build and plan modes with server-controlled tool access.
- Local workspace tools for reading, editing, searching, deleting, and running commands.
- Clerk OAuth login from the CLI using Authorization Code + PKCE.
- PostgreSQL persistence through Prisma 7 and `@prisma/adapter-pg`.
- Polar-powered credit checkout, balance checks, and usage ingestion.

## Requirements

- Bun 1.3.13 or later.
- PostgreSQL, reachable through `DATABASE_URL`.
- ripgrep (`rg`), used by the agent search tool.
- A Clerk application configured for OAuth Authorization Code + PKCE.
- A Polar workspace with a product and credits meter if you want billing flows to work locally.
- Provider API keys for the models you plan to use, such as Anthropic or OpenAI.

## Apps

### `@newcode/cli`

The terminal application. It renders the chat UI, manages local authentication state, starts the Clerk browser login flow, executes workspace tools on the user's machine, and streams assistant responses through the server.

Useful scripts:

```bash
bun run dev:cli
bun run build:cli
bun run check:cli
```

The CLI package exposes a `newcode` binary. After building it, you can link it into your shell with Bun. See [Build and Link the CLI](#build-and-link-the-cli).

### `@newcode/server`

The API server. It exposes Hono routes for chat, sessions, payments, and auth-protected resources. It validates requests with Zod, verifies Clerk tokens, checks credit balances, invokes the AI agent, streams UI messages, and persists chat history.

Useful scripts:

```bash
bun run dev:server
bun run build:server
bun run check:server
```

By default, the server listens on `http://localhost:3000`. Set `PORT` to use a different port.

## Packages

### `newcode-ai`

Shared AI package used by both the server and CLI. It defines model metadata, provider routing, agent instructions, mode configuration, tool schemas, tool runners, and client-side tool-call handling.

Exports:

- `newcode-ai`: shared model, mode, and tool definitions.
- `newcode-ai/server`: server-side agent and provider setup.
- `newcode-ai/client`: CLI-side tool execution integration.

### `@newcode/db`

Database package built on Prisma 7, PostgreSQL, and `@prisma/adapter-pg`. It owns the Prisma schema and exports the database client used by the server.

Useful scripts:

```bash
bun run db:generate
bun run db:push
bun run db:studio
```

### `@newcode/payments`

Payments and credits package backed by Polar. It loads Polar configuration, creates credit checkouts, reads customer credit balances, asserts credit availability, and ingests usage events.

### `@newcode/shared`

Shared cross-package types and utilities used where CLI, server, and internal packages need the same definitions.

## Environment

Start by creating a local environment file from the checked-in example:

```bash
cp .env.example .env
```

The development scripts load `.env` from the repository root. Keep secrets in `.env`; do not commit them.

`.env.example` documents the required baseline variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma. |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude models. |
| `OPENAI_API_KEY` | OpenAI API key for OpenAI models. |
| `CLERK_FRONTEND_API` | Clerk Frontend API URL used by the CLI OAuth flow. |
| `CLERK_OAUTH_CLIENT_ID` | OAuth client id used by the CLI login flow. |
| `CLERK_OAUTH_CLIENT_SECRET` | OAuth client secret placeholder for confidential flows. |
| `CLERK_OAUTH_REDIRECT_URI` | OAuth redirect URI. Defaults to `http://127.0.0.1:8976/oauth/callback`. |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key used by the server auth middleware. |
| `CLERK_SECRET_KEY` | Clerk secret key used by the server auth middleware. |
| `POLAR_ACCESS_TOKEN` | Polar API token. |
| `POLAR_PRODUCT_ID` | Polar product id for credit checkout. |
| `POLAR_SERVER` | Polar environment, either `sandbox` or `production`. Defaults to `sandbox`. |
| `POLAR_CREDITS_METER_ID` | Polar meter id used to read and ingest credits. |

Additional optional variables:

| Variable | Purpose |
| --- | --- |
| `PORT` | Server port. Defaults to `3000`. |
| `SERVER_URL` | CLI API base URL. Defaults to `http://localhost:3000`. |
| `APP_URL` | Base URL used for Polar checkout success and cancel redirects. Defaults to `http://localhost:3000`. |
| `XDG_CONFIG_HOME` | Overrides where the CLI stores local auth/config files. |

## Local Development

Install dependencies from the repository root:

```bash
bun install
```

Create and fill your `.env` file:

```bash
cp .env.example .env
```

Generate Prisma Client and push the schema to your local PostgreSQL database:

```bash
bun run db:generate
bun run db:push
```

Start the API server in one terminal:

```bash
bun run dev:server
```

Start the CLI in another terminal:

```bash
bun run dev:cli
```

The CLI expects the API at `http://localhost:3000` unless `SERVER_URL` is set. The server expects `DATABASE_URL`, Clerk configuration, model provider keys, and Polar configuration when the corresponding routes are used.

## Build and Link the CLI

Build the CLI bundle from the repository root:

```bash
bun run build:cli
```

The package binary points to `apps/cli/bin/newcode`, which imports the built output from `apps/cli/dist`. After building, link the CLI package globally with Bun:

```bash
bun link --cwd apps/cli
```

You can then run the CLI from any workspace:

```bash
newcode
```

If you change CLI source after linking, rebuild before running the linked binary again:

```bash
bun run build:cli
newcode
```

To remove the global link later:

```bash
bun unlink @newcode/cli
```

## Public CLI Install

The simplest public distribution path is a GitHub Release tarball plus the repository install script. The installed CLI requires Bun on the user's machine.

Install Bun first if needed:

```bash
curl -fsSL https://bun.sh/install | bash
```

Install the latest `newcode` CLI release:

```bash
curl -fsSL https://raw.githubusercontent.com/gitdeepaks/newcode/master/scripts/install.sh | sh
```

Then run:

```bash
newcode
```

To install a specific release tag:

```bash
NEWCODE_VERSION=v0.1.0 curl -fsSL https://raw.githubusercontent.com/gitdeepaks/newcode/master/scripts/install.sh | sh
```

The installer downloads `newcode-<platform>-<arch>.tar.gz` from GitHub Releases, extracts it to `~/.newcode`, and links `newcode` into `~/.local/bin`.

## Publishing A CLI Release

Build the CLI release tarball from the repository root:

```bash
SERVER_URL=<deployed-api-url> bun run package:cli-release
```

This writes a platform-specific artifact to `release/`, for example:

```bash
release/newcode-darwin-arm64.tar.gz
```

Upload that artifact to a GitHub Release for this repository.

The CLI API endpoint is embedded at build time through `SERVER_URL`. The release flow does not require `www.newcodetui.in`; use whichever deployed API URL is active for that release.

## Building and Checking

Run app-specific type checks:

```bash
bun run check:server
bun run check:cli
```

Build app bundles:

```bash
bun run build:server
bun run build:cli
```

Database commands are available from the root workspace:

```bash
bun run db:generate
bun run db:push
bun run db:studio
```

## Authentication

The CLI uses Clerk OAuth with PKCE. The default redirect URI is:

```text
http://127.0.0.1:8976/oauth/callback
```

Configure the same redirect URI in Clerk and in `.env`. When you run `/login` in the CLI, newcode opens the system browser, receives the callback on localhost, exchanges the code for tokens, and stores local credentials in the CLI config directory.

## Billing

Billing is implemented with Polar credits. The server checks credit availability before generation, opens checkout links for upgrades, reads credit balances, and records usage after successful assistant turns.

For local development, use Polar sandbox credentials and set `POLAR_SERVER=sandbox`.

## Agent Modes

newcode supports two agent modes:

| Mode | Purpose |
| --- | --- |
| `build` | Allows the agent to inspect, edit, delete, and run commands in the workspace. |
| `plan` | Read-only investigation mode for analysis and recommendations. |

The CLI sends the selected mode with each chat request, and the server enforces the allowed tool set for that mode.

## Slash Commands

The CLI includes slash commands for common actions:

| Command | Description |
| --- | --- |
| `/login` | Start Clerk OAuth login. |
| `/logout` | Revoke tokens and clear local auth state. |
| `/new` | Start a new session. |
| `/sessions` | Browse previous sessions. |
| `/model` | Open the model picker. |
| `/theme` | Open the theme picker. |
| `/upgrade` | Open Polar checkout. |
| `/usage` | Show current credit usage. |
| `/exit` | Quit the CLI. |

## License

This repository does not currently declare a license.
