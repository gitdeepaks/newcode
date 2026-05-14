# newcode

**Terminal-native AI pair programmer.** A keyboard-first coding agent that lives in your terminal, edits your workspace through a sandboxed tool layer, and bills on actual usage through a credit-metered payment backend.

newcode pairs a richly interactive Text User Interface (TUI) with a typed, multi-provider model registry and a production-grade billing pipeline. It is engineered as a single, end-to-end product — from OAuth sign-in to the last token of an assistant reply — with strict type safety between every layer.

---

## Table of Contents

- [What newcode Is](#what-newcode-is)
- [Highlights](#highlights)
- [Architecture at a Glance](#architecture-at-a-glance)
- [Supported Models](#supported-models)
- [Operating Modes](#operating-modes)
- [Agent Toolbox](#agent-toolbox)
- [Authentication](#authentication)
- [Credit-Based Billing](#credit-based-billing)
- [Persistence Model](#persistence-model)
- [CLI Capabilities](#cli-capabilities)
- [Slash Commands](#slash-commands)
- [Project Layout](#project-layout)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Development Workflow](#development-workflow)
- [Security & Sandboxing](#security--sandboxing)
- [Roadmap](#roadmap)

---

## What newcode Is

newcode is a coding agent delivered as a terminal application. It connects an interactive prompt — with slash commands, file mentions, dialogs, themes, and live streaming — to a tool-using language-model agent that can read, search, edit, and run code on the user's machine. Every chat session is persisted server-side, every assistant turn is metered, and every credit charged is tied to a specific model, mode, and session.

The product is built for developers who want the depth of a modern coding agent without leaving their shell, and for teams who need a deployable, auditable backend behind it.

## Highlights

- **First-class terminal UX.** Built on OpenTUI + React 19. Themed UI, dialogs, toasts, sticky-scroll chat viewport, file-mention popover, slash-command palette, and a mode toggle bound to `Tab`.
- **Multi-provider AI.** Pluggable coding-model registry covering Anthropic Claude Sonnet 4.6 and OpenAI GPT-5.1, with provider-aware request options and pricing baked into the registry.
- **Two execution modes.** `Build` lets the agent write, edit, delete, and run; `Plan` is a read-only investigative mode. Modes constrain the agent's tool surface at the server.
- **Sandboxed tool layer.** Seven workspace tools — `read_file`, `write_file`, `edit_file`, `delete_file`, `list_directory`, `grep` (ripgrep), and `bash` — all path-confined to the user's workspace root.
- **Credit-metered billing.** Polar-powered checkout, balance reads, and usage ingestion. Server enforces a credit gate before every generation; assistant turns are reported back as billable events.
- **Real authentication.** Clerk OAuth (Authorization Code + PKCE) with a local callback server, automatic refresh, and revocation on `/logout`.
- **Persistent sessions.** PostgreSQL via Prisma 7 stores sessions, full validated UI-message payloads, assistant model attribution, and lifecycle events for stream start, finish, error, abort, validation, and config faults.
- **End-to-end type safety.** Hono RPC (`hc<AppType>`) propagates request and response types from server routes through to the CLI. Zod validates every boundary; the AI SDK message union is preserved across persistence and hydration.

## Architecture at a Glance

```
+--------------------+        +-----------------------+        +------------------+
|  CLI (apps/cli)    |  HTTP  |  API (apps/server)    |  SDK   |  Polar Billing    |
|  OpenTUI + React   +<------>+  Hono + Bun + Clerk   +------->+  (credits meter) |
+----------+---------+        +-----------+-----------+        +------------------+
           |                              |
           |                              | Prisma (PG adapter)
           |                              v
           |                  +-----------------------+
           |                  |  PostgreSQL           |
           |                  |  Sessions, Messages,  |
           |                  |  Session Events       |
           |                  +-----------------------+
           |
           | AI SDK ToolLoopAgent + Coding Tools
           v
+------------------------------+
|  Anthropic / OpenAI Providers|
+------------------------------+
```

- **CLI** runs the prompt, manages routing/dialogs, handles OAuth in a browser via a localhost callback, executes tool calls locally inside the user's workspace, and streams assistant output back into the chat view.
- **Server** validates every request with Zod, enforces auth, gates on credits, runs the `ToolLoopAgent` with the selected provider and mode, streams UI messages, persists history, and ingests usage events into Polar.
- **`newcode-ai`** is the shared package that defines models, modes, instructions, tool schemas, tool runners, and the agent factory. It is split into provider-neutral entries (`./`), server entry (`./server` — instantiates providers), and client entry (`./client` — wires tool execution into `useChat`).

## Supported Models

newcode is **not locked to a fixed model list**. The model registry in `packages/ai/src/models.ts` is the single source of truth for provider, pricing, and credit economics, and is designed so new models — from existing or new providers — can be added in a single file with full type safety, validated pricing, and credit metadata that flows automatically into billing.

### Currently Shipping

| Model              | Provider  | Input ($/1M)  | Cached Input ($/1M) | Output ($/1M) | Minimum Credits | User Charge (USD) |
| ------------------ | --------- | ------------- | ------------------- | ------------- | --------------- | ----------------- |
| Claude Sonnet 4.6  | Anthropic | $3.00         | —                   | $15.00        | 25              | $0.50             |
| GPT-5.1            | OpenAI    | $0.625        | $0.125              | $5.00         | 8               | $0.16             |

- Default model: **Claude Sonnet 4.6**.
- Credit unit economics: **$20 = 1,000 credits → $0.02 per credit**.
- Target gross margin per model: **70%** (current minimum credits are calibrated for launch adoption and revised against production token data).

### Planned Expansion

The registry is an open list and will continue to grow. Models on the near-term shortlist include:

- **Anthropic** — Claude Opus 4.7, Claude Haiku 4.5, and successor Sonnet releases.
- **OpenAI** — additional GPT-5.x SKUs and reasoning-tier variants.
- **Google** — Gemini 2.x Pro and Flash families.
- **xAI** — Grok coding-tier models.
- **Open-weights** — Qwen, DeepSeek, and Llama coding models, served either via first-party APIs or hosted inference providers.
- **Self-hosted** — bring-your-own-endpoint support for teams that want to point newcode at an internal inference gateway.

### How a Model Gets Added

Every new model is a typed entry that the rest of the system reads from automatically — no changes needed in the chat route, the credit gate, or the CLI model picker.

```ts
// packages/ai/src/models.ts
{
  id: "claude-opus-4-7",
  provider: "anthropic",
  label: "Claude Opus 4.7",
  description: "High-capability coding model for complex agentic work.",
  pricing: {
    inputUsdPerMillionTokens: <value>,
    cachedInputUsdPerMillionTokens: <value>,  // optional
    outputUsdPerMillionTokens: <value>,
  },
  creditCost: {
    minimumCredits: <value>,
    usdPerCredit: 0.02,
    targetGrossMargin: 0.7,
  },
}
```

Once added:

- The Zod-validated `codingModelIdSchema` and `availableCodingModels` pick it up.
- The `/model` dialog in the CLI lists it.
- The server enforces credit gating with the new model's `minimumCredits`.
- Usage ingestion to Polar carries the new `modelId` as metadata.
- Provider selection in `createCodingLanguageModel` routes the call to the right SDK; supporting a new provider is one additional `case` in that switch plus the relevant `@ai-sdk/*` dependency.

## Operating Modes

Modes are registered in `packages/ai/src/modes/index.ts` and constrain both the system prompt and the tool surface server-side.

| Mode    | Purpose                                                                                          | Allowed Tools                                                              |
| ------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `build` | Implement, modify, and verify code changes directly in the workspace.                            | `read_file`, `write_file`, `edit_file`, `delete_file`, `list_directory`, `grep`, `bash` |
| `plan`  | Read-only investigation: inspect, analyse, and recommend without modifying the workspace.        | `read_file`, `list_directory`, `grep`                                       |

Press `Tab` in the prompt to cycle modes. The active mode is sent on every chat request and stored on every persisted message so historical turns can be rendered with the mode they originated in.

## Agent Toolbox

All tools are defined with Zod input and output schemas, exposed to the model with descriptions, and executed via runners that resolve all paths through a workspace-root prefix check (`resolveWithinWorkspace`).

| Tool             | Purpose                                                                                                              | Key Guarantees                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `read_file`      | Read a text file with `offset` / `limit` paging.                                                                     | Default 120 lines, 6 KB output cap.                         |
| `write_file`     | Overwrite or create a file, creating parent directories automatically.                                               | Reports `bytesWritten`.                                     |
| `edit_file`      | Exact-string replacement, optionally `replaceAll`.                                                                   | Errors on missing match or ambiguous match.                 |
| `delete_file`    | Remove a single file or symlink (never a directory).                                                                 | Type-checked before unlink.                                 |
| `list_directory` | List a directory (optionally recursive).                                                                             | Capped at 1,000 entries with truncation flag.               |
| `grep`           | Regex search across the workspace via `ripgrep`.                                                                     | Glob filter, case-insensitive flag, capped at 500 matches.  |
| `bash`           | Run a shell command inside the workspace.                                                                            | Configurable timeout (default 60s, max 5 min), 64 KB caps.  |

The tool set carries an Anthropic ephemeral-cache breakpoint on its last entry, so the system prompt and all tool schemas are cached before each model call.

## Authentication

newcode uses **Clerk** as its identity provider with a standards-based browser flow.

- **OAuth 2.0 + PKCE** via `oauth4webapi`. State and nonce are generated per session.
- **Localhost callback server** is spun up by the CLI on `127.0.0.1:8976` (configurable), the system browser opens automatically, and the code is exchanged for tokens after the redirect.
- **OpenID userinfo** is fetched and stored alongside tokens (email, name, picture).
- **Automatic refresh** with a 60-second pre-expiry buffer. Sessions silently re-poll every five seconds while the home screen is active.
- **Server-side verification.** The API uses `@clerk/backend` `authenticateRequest` with `acceptsToken: ["session_token", "oauth_token"]`. Unauthenticated requests get `401`.
- **Token revocation** on `/logout` calls the Clerk revocation endpoint before clearing local credentials.

## Credit-Based Billing

Billing is delivered through **Polar** (`@polar-sh/sdk`) and lives in `packages/payments`.

### Service Surface

- `createCreditCheckout` — Opens a Polar checkout for the configured product. Used by `/upgrade`.
- `getCreditBalance` — Reads `customerMeters.list` against the credits meter and returns `{ granted, used, remaining }`.
- `assertHasCredits` — Throws `InsufficientCreditsError` (HTTP 402) when the balance cannot cover the requested credits.
- `canStartGeneration` — Convenience wrapper that asserts at least one credit.
- `ingestUsage` — Sends a `newcode_usage` event with credits and metadata (session id, model id, mode, finish reason).

### Server-Side Enforcement

- `requireCredits(n)` middleware sits in front of `POST /chat/:sessionId`. It rejects requests under-balance with a structured 402 carrying the current balance and required credits.
- On successful stream completion, the chat route ingests usage with full attribution metadata. On abort, no charge is recorded.
- Failures during ingestion are written to `SessionEvent` with kind `stream_error` so observability is not lost when billing has a hiccup.

### CLI Surface

- `/upgrade` opens a Polar checkout in the system browser.
- `/usage` opens a dialog that reads `GET /payments/balance` and shows credits granted, used, and remaining.

## Persistence Model

PostgreSQL via Prisma 7 with the native `@prisma/adapter-pg`. Schema (`packages/db/prisma/schema.prisma`):

- **`Session`** — `id`, `userId`, optional `title`, timestamps. Indexed by `(userId, updatedAt DESC)` for fast session listings.
- **`Message`** — `id` (UI message id, idempotent across retries), `sessionId`, `role` (`user` | `assistant` | `system`), `mode`, optional `model`, `payload` (validated `UIMessage` JSON). Indexed by `(sessionId, createdAt)`.
- **`SessionEvent`** — Lifecycle audit log: `stream_start`, `stream_finish`, `stream_error`, `tool_error`, `validation_error`, `config_error`, `aborted`. Indexed both by session and by `(kind, createdAt)`.

The chat route uses `Prisma.upsert` keyed by `Message.id` so a retried request never duplicates a turn.

## CLI Capabilities

- **Memory router** with two routes: `/` (Home) and `/sessions/:id` (Chat).
- **Layered keyboard manager** (`TuiLayerManagerProvider`) so dialogs and popovers can claim focus without colliding with screen-level handlers.
- **Themeing** with first-class theme dialog and palette tokens applied across all surfaces (`packages/cli/src/lib/theme.ts`).
- **Toasts** with `info`, `success`, `warning`, and `error` variants, durations, and descriptions.
- **Dialogs** for sessions, themes, models, and usage. All dismissable via `Escape`.
- **Prompt composer** with a slash-command popover, a file-mention popover, multi-line input, and command parsing (`parsePromptCommand`).
- **Streaming chat** powered by `useChat` with `DefaultChatTransport`, mode-aware bodies, automatic auth headers, and the AI SDK's automatic tool roundtrip handler (`lastAssistantMessageIsCompleteWithToolCalls`).
- **Tool execution on the user's machine.** `createOnToolCall` from `newcode-ai/client` runs the tools locally against the captured workspace root, returning structured outputs back into the chat.
- **Mode toggle** bound to `Tab`, disabled while a turn is in flight.
- **Workspace mention** support via `@`-prefixed file paths.

## Slash Commands

The full command palette is registered in `apps/cli/src/lib/prompt-commands.ts`. Currently wired to handlers:

| Command     | Description                                                |
| ----------- | ---------------------------------------------------------- |
| `/exit`     | Quit the CLI cleanly.                                      |
| `/new`      | Start a new home screen / session.                         |
| `/sessions` | Browse and resume prior sessions.                          |
| `/model`    | Open the model picker.                                     |
| `/theme`    | Open the theme picker.                                     |
| `/login`    | Begin Clerk OAuth flow.                                    |
| `/logout`   | Revoke tokens and clear local credentials.                 |
| `/upgrade`  | Open the Polar credits checkout.                           |
| `/usage`    | Show the credits-usage dialog.                             |
| `/info`, `/success`, `/warning`, `/error` | Demo each toast variant.       |

Additional command names are pre-registered for future handlers: `/fix`, `/explain`, `/review`, `/summarize`, `/test`, `/docs`, `/refactor`, `/optimize`, `/security`, `/types`, `/commit`, `/branch`, `/diff`, `/status`, `/settings`, `/help`, `/clear`, `/history`, `/search`, `/plan`, `/apply`, `/undo`.

## Project Layout

```
newcode/
├── apps/
│   ├── cli/                          # OpenTUI + React 19 terminal app
│   │   └── src/
│   │       ├── components/           # ascii-art, dialogs, toasts, popovers, chat
│   │       ├── hooks/                # use-prompt-command, file/command menus
│   │       ├── layouts/              # root-layout
│   │       ├── lib/                  # client (Hono RPC), auth, theme, model selection
│   │       ├── routes/               # memory router + route state
│   │       └── screens/              # home-screen, chat-screen
│   └── server/                       # Hono API on Bun
│       └── src/
│           ├── middleware/           # auth (Clerk), credits (Polar gate)
│           ├── routes/               # sessions, chat, payments
│           └── lib/                  # payments factory, mode mapping
├── packages/
│   ├── ai/                           # newcode-ai — models, modes, tools, agent
│   │   └── src/
│   │       ├── models.ts             # Anthropic + OpenAI registry
│   │       ├── modes/                # build / plan with allowed tools
│   │       ├── tools/                # specs, runners, registry, definitions
│   │       ├── instructions.ts       # system-prompt assembly
│   │       ├── server.ts             # ToolLoopAgent factory
│   │       └── client.ts             # local tool execution glue for useChat
│   ├── db/                           # Prisma 7 + @prisma/adapter-pg
│   ├── payments/                     # @newcode/payments — Polar service
│   └── shared/                       # cross-cutting shared types
└── docs/                             # design docs and migration plans
```

## Technology Stack

| Layer            | Technology                                                                          |
| ---------------- | ----------------------------------------------------------------------------------- |
| Runtime          | **Bun 1.3.13** (workspaces, `Bun.serve`, `Bun.spawn`)                                |
| Server framework | **Hono 4.10** with `@hono/zod-validator`                                            |
| TUI              | **@opentui/core** + **@opentui/react** (JSX import source: `@opentui/react`)        |
| UI runtime       | **React 19.2** + **React Router 7** (memory router)                                  |
| AI               | **AI SDK 6** (`ToolLoopAgent`, `useChat`, `streamText`, `pruneMessages`)             |
| Providers        | **@ai-sdk/anthropic 3.0** + **@ai-sdk/openai 3.0**                                   |
| Database         | **PostgreSQL** via **Prisma 7** + **@prisma/adapter-pg**                            |
| Auth             | **Clerk** (`@clerk/backend`) over **oauth4webapi** with PKCE                         |
| Payments         | **Polar** (`@polar-sh/sdk`) with metered credits                                    |
| Validation       | **Zod 4** across CLI, server, AI, payments, and DB payload coercion                  |
| RPC              | **Hono RPC** (`hc<AppType>`) for end-to-end-typed requests                           |
| Code search      | **ripgrep** spawned via `Bun.spawn`                                                 |
| Language         | **TypeScript 5.9** with bundler module resolution                                    |

## Getting Started

### Prerequisites

- Bun **1.3.13** or later.
- PostgreSQL reachable via `DATABASE_URL`.
- ripgrep (`rg`) available on the agent's machine for the `grep` tool.
- A Clerk application configured for OAuth Authorization Code + PKCE with the redirect URI `http://127.0.0.1:8976/oauth/callback`.
- A Polar workspace with a product and a credits meter.

### Install

```bash
bun install
```

### Database Setup

```bash
bun run db:generate
bun run db:push
# optional: open Prisma Studio
bun run db:studio
```

### Run the Server

```bash
bun run dev:server
# → Hono server listening on http://localhost:3000
```

### Run the CLI

```bash
bun run dev:cli
```

## Configuration

Copy `.env.example` to `.env` and fill in:

| Variable                       | Purpose                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                 | PostgreSQL connection string for Prisma.                                                         |
| `ANTHROPIC_API_KEY`            | Required when running with Claude Sonnet 4.6.                                                    |
| `OPENAI_API_KEY`               | Required when running with GPT-5.1.                                                              |
| `CLERK_PUBLISHABLE_KEY`        | Server auth — Clerk publishable key.                                                             |
| `CLERK_SECRET_KEY`             | Server auth — Clerk secret key.                                                                  |
| `CLERK_FRONTEND_API`           | CLI auth — Clerk Frontend API base used to derive the OAuth endpoints.                           |
| `CLERK_OAUTH_CLIENT_ID`        | CLI auth — public OAuth client id.                                                               |
| `CLERK_OAUTH_CLIENT_SECRET`    | Reserved for confidential OAuth flows (PKCE flow does not transmit it).                          |
| `CLERK_OAUTH_REDIRECT_URI`     | Defaults to `http://127.0.0.1:8976/oauth/callback`.                                              |
| `POLAR_ACCESS_TOKEN`           | Polar API token for checkouts, balances, and usage ingestion.                                    |
| `POLAR_PRODUCT_ID`             | Polar product representing the credit pack.                                                       |
| `POLAR_CREDITS_METER_ID`       | Polar meter that tracks credit consumption.                                                       |
| `POLAR_SERVER`                 | `sandbox` (default) or `production`.                                                              |
| `APP_URL`                      | Optional. Used to build the default Polar checkout success / cancel URLs.                         |
| `SERVER_URL`                   | Optional. CLI override for the API base URL (default `http://localhost:3000`).                   |
| `PORT`                         | Optional. Server port (default `3000`).                                                           |

The server validates Polar configuration lazily via `loadPaymentsConfig`; any missing required value surfaces as a clear Zod error at first use.

## Development Workflow

All scripts run from the repo root:

```bash
bun run dev:server      # Hot-reload Hono server
bun run dev:cli         # Hot-reload OpenTUI CLI
bun run build:server    # Bun bundle → apps/server/dist
bun run build:cli       # Bun bundle → apps/cli/dist
bun run check:server    # tsc --noEmit for the server
bun run check:cli       # tsc --noEmit for the CLI
bun run db:generate     # Generate Prisma client
bun run db:push         # Push schema to the database
bun run db:studio       # Open Prisma Studio
```

The verification path before declaring a feature done is **type-check then build** for the touched app. Both `check:cli` and `check:server` must be clean.

## Security & Sandboxing

- **Workspace confinement.** Every filesystem tool resolves its path through `resolveWithinWorkspace`, which rejects any input that escapes the realpath-normalized workspace root. The path check happens before any read or write.
- **Read defaults.** `read_file` reads a small slice by default (120 lines / 6 KB) so a misbehaving model cannot pull large blobs into context unintentionally.
- **Bash caveat.** The `bash` tool runs with the workspace as cwd, but a shell can still touch absolute paths outside it; this is documented in the tool description so the model treats it accordingly.
- **Auth on every request.** The chat, sessions, and payments routes sit behind `authMiddleware`; only `payments/checkout/{success,cancel}` redirect endpoints are public.
- **Credit gating.** No generation runs without a confirmed credit balance — `requireCredits(1)` runs before the chat handler even validates the request body.
- **Provider keys server-side.** Provider API keys live in the server's environment. The CLI never sees them; it only holds the user's Clerk tokens.
- **Token storage.** Auth tokens persist to the CLI's local config directory; refresh and revocation use Clerk's revocation endpoint, not a manual delete.
- **Validation everywhere.** Zod schemas validate route params, JSON bodies, route location state, AI message payloads, and Polar config — preserving the end-to-end type chain `Zod → AppType → hc<AppType> → CLI`.

## Roadmap

Near-term work tracked in `docs/`:

- Token-metered post-completion billing tied to actual input/output tokens per provider (per `ProductVenture.md`).
- Cached-input discount handling for OpenAI to either reduce credits or retain margin.
- Additional models in the registry (additional Anthropic and OpenAI SKUs).
- Wiring the remaining slash commands (`/fix`, `/review`, `/test`, `/commit`, `/plan`, etc.) to first-class handlers.
- Distribution: signed Bun-compiled binaries for macOS and Linux, plus an `npx newcode` entrypoint.

---

newcode is built to be opinionated where it pays off — strict types, validated payloads, sandboxed tools, server-enforced billing — and flexible where developers need it: switchable models, switchable modes, a themeable terminal UI, and a clean separation between the CLI shell and the agent that powers it.
