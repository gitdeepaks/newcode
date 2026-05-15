# Move Forward Plan

## Goal

Evolve `newcode` from a working terminal AI coding assistant into a serious competitor to Codex, OpenCode, and Claude Code by improving reliability, user trust, coding autonomy, context quality, and measurable agent performance.

The plan is ordered from easier, high-leverage improvements to harder platform-level work. Each phase should be completed, verified, and documented before moving to the next one.

## Guiding Principles

- Start with features that make the current product safer and clearer before adding complex autonomy.
- Prefer small, shippable milestones over large rewrites.
- Keep the Hono RPC type chain intact: Zod validation -> exported `AppType` -> typed CLI client -> inferred consumers.
- Keep CLI work inside `apps/cli`, server routes inside `apps/server`, and shared AI/tooling inside `packages/ai` unless there is a clear reason to introduce shared code.
- Every feature that changes files, runs commands, or spends credits should improve user trust through visibility, approval, or rollback.
- Add verification commands to each milestone and do not consider a feature done until typecheck and build pass for touched apps/packages.

## Current Baseline

The project already has a strong foundation:

- Terminal UI built with OpenTUI and React.
- Hono API with typed RPC access from the CLI.
- AI SDK `ToolLoopAgent` orchestration.
- Build and plan modes.
- Local tools for file reading, editing, writing, deleting, searching, listing directories, and running shell commands.
- Session persistence through PostgreSQL and Prisma.
- Auth and payment/credits infrastructure.
- Model selection and provider routing.
- Public CLI packaging documentation.

The next work should focus on making the agent safer, more reliable, more transparent, and better at completing real coding tasks end-to-end.

## Phase 1: Easy Trust and Visibility Wins

### 1. Improve Tool Call Display

Difficulty: Easy

Why first: The agent already calls tools, but the UI currently shows very little detail. Better tool display immediately improves user trust without changing core agent behavior.

Files likely involved:

- `apps/cli/src/components/chat/chat-message.tsx`
- `packages/ai/src/tools/specs.ts`
- `packages/ai/src/tools/runners.ts`

Execution steps:

1. Update tool output rendering so each tool shows a human-readable summary.
2. For `read_file`, show the file path, total lines, and whether output was truncated.
3. For `edit_file`, show the file path and replacement count.
4. For `write_file`, show the file path and bytes written.
5. For `delete_file`, show the deleted file path.
6. For `grep`, show match count and truncation state.
7. For `bash`, show command, exit code, timeout state, and whether output was truncated.
8. Add compact output by default and leave room for future expandable details.

Acceptance criteria:

- Tool calls are understandable without reading raw JSON.
- Failed tools show the tool name and clear error text.
- Long command output does not overwhelm the chat screen.

Verification:

```bash
bun run check:cli
bun run build:cli
```

### 2. Add a `glob` Tool

Difficulty: Easy

Why first: Agents need fast file discovery. `grep` and `list_directory` are useful, but a dedicated glob tool reduces wasted steps and tokens.

Files likely involved:

- `packages/ai/src/tools/specs.ts`
- `packages/ai/src/tools/runners.ts`
- `packages/ai/src/tools/registry.ts`
- `packages/ai/src/modes/index.ts`

Execution steps:

1. Add `globInput` with `pattern` and optional `path`.
2. Add `globOutput` with matching file paths and `truncated`.
3. Implement the runner using Bun/Node APIs or `rg --files -g`.
4. Keep results capped, for example at 500 or 1000 paths.
5. Register the tool in `allCodingTools` and `allCodingToolHandlers`.
6. Enable it in both `build` and `plan` modes.
7. Update system instructions to tell the agent to prefer `glob` for file discovery.

Acceptance criteria:

- The agent can find files by patterns like `**/*.tsx`, `apps/server/**/*.ts`, or `package.json`.
- The tool never returns paths outside the workspace.
- Large results are truncated safely.

Verification:

```bash
bun run check:cli
bun run check:server
bun run build:cli
bun run build:server
```

### 3. Add Git Status and Diff Context

Difficulty: Easy to Medium

Why next: Coding agents must understand existing user changes and avoid overwriting them. Git awareness is also necessary for summaries, reviews, and commits later.

Files likely involved:

- `packages/ai/src/tools/specs.ts`
- `packages/ai/src/tools/runners.ts`
- `packages/ai/src/tools/registry.ts`
- `packages/ai/src/instructions.ts`
- CLI chat screen or request body, if context is passed explicitly.

Execution steps:

1. Add a read-only `git_status` tool.
2. Return branch name, changed files, staged files, untracked files, and clean/dirty state.
3. Add a read-only `git_diff` tool with optional file path and staged/unstaged selection.
4. Cap diff output to avoid huge token usage.
5. Add system guidance: inspect git state before editing when the task may touch existing files.
6. Render git tool calls clearly in the CLI.

Acceptance criteria:

- The agent can see whether the worktree is dirty.
- The agent can inspect user changes before editing related files.
- Diff output is capped and marked as truncated when needed.

Verification:

```bash
bun run check:cli
bun run check:server
bun run build:cli
bun run build:server
```

## Phase 2: Safety and Control

### 4. Add Permission Policy for Risky Tools

Difficulty: Medium

Why now: Before giving the agent more autonomy, it needs clear safety boundaries.

Files likely involved:

- `packages/ai/src/tools/runners.ts`
- `packages/ai/src/client.ts`
- `apps/cli/src/lib/config.ts`
- `apps/cli/src/components/dialog.tsx`
- `apps/cli/src/screens/chat-screen.tsx`

Execution steps:

1. Define permission modes in CLI config:
   - `read-only`
   - `ask-before-write`
   - `ask-before-bash`
   - `auto-edit`
   - `dangerous-auto`
2. Add a policy evaluator that classifies tool calls as safe, write, shell, or destructive.
3. Require approval before `write_file`, `edit_file`, and `delete_file` unless policy allows them.
4. Require approval before `bash` unless policy allows it.
5. Add extra warnings for dangerous shell patterns such as `rm`, `git reset`, `curl | sh`, `chmod -R`, and writes outside expected paths.
6. Show an approval dialog in the CLI with tool name, target path/command, and risk level.
7. If rejected, return a tool error to the agent explaining that the user denied permission.

Acceptance criteria:

- Users can prevent writes and shell commands.
- Dangerous commands are never silent.
- Plan mode remains read-only.
- Rejected tool calls are handled gracefully by the agent.

Verification:

```bash
bun run check:cli
bun run build:cli
```

### 5. Add Patch-First Editing

Difficulty: Medium

Why next: Patch review is one of the highest-trust features a coding agent can have.

Files likely involved:

- `packages/ai/src/tools/specs.ts`
- `packages/ai/src/tools/runners.ts`
- `packages/ai/src/tools/registry.ts`
- `apps/cli/src/components/*`
- `apps/cli/src/screens/chat-screen.tsx`

Execution steps:

1. Add a `propose_patch` tool that accepts a unified diff or structured file edits.
2. Validate that all patch paths resolve inside the workspace.
3. Render the proposed patch in the CLI before applying it.
4. Add approval actions: apply, reject, and maybe apply all.
5. Add an `apply_patch` runner that applies approved patches.
6. Keep direct `edit_file` for small safe edits, but teach the agent to prefer patches for multi-file changes.
7. Store patch metadata in chat history so the user can see what changed later.

Acceptance criteria:

- Multi-file changes can be reviewed before applying.
- Rejected patches do not modify the workspace.
- Applied patches produce clear success or failure output.

Verification:

```bash
bun run check:cli
bun run check:server
bun run build:cli
bun run build:server
```

### 6. Add Undo for Agent Changes

Difficulty: Medium

Why next: Users need confidence that they can recover from bad edits.

Files likely involved:

- `packages/ai/src/tools/runners.ts`
- `apps/cli/src/lib/config-paths.ts`
- `apps/cli/src/components/*`

Execution steps:

1. Before each agent write, save a snapshot of the original file content.
2. Group snapshots by assistant turn or patch id.
3. Add an `undo_last_agent_change` command or UI action.
4. Restore deleted files when possible.
5. For newly created files, delete them during undo after confirmation.
6. Show exactly which files will be restored.

Acceptance criteria:

- User can undo the most recent agent edit group.
- Undo never touches unrelated user changes without warning.
- If a file changed after the agent edit, ask before restoring.

Verification:

```bash
bun run check:cli
bun run build:cli
```

## Phase 3: Agent Reliability

### 7. Add Automatic Verification Policy

Difficulty: Medium

Why now: A coding agent should not stop after editing. It should run the right checks and fix failures.

Files likely involved:

- `packages/ai/src/instructions.ts`
- `packages/ai/src/tools/runners.ts`
- `apps/cli/src/lib/workspace-root.ts`
- optional new package detection utilities in `packages/ai`

Execution steps:

1. Detect touched app/package from changed file paths.
2. Map touched areas to verification commands:
   - CLI changes: `bun run check:cli` and `bun run build:cli`
   - Server changes: `bun run check:server` and `bun run build:server`
   - DB changes: `bun run db:generate` when schema changes, then related checks
3. Add system instructions that verification is expected after code edits.
4. Add a helper that suggests commands rather than hardcoding all behavior into the prompt.
5. Teach the agent to run the smallest relevant check first.
6. If verification fails, the agent should inspect the error, fix the issue, and rerun the check.

Acceptance criteria:

- The agent usually runs the correct check after editing.
- Failure output is visible and summarized.
- The agent attempts one or more fixes before giving up.

Verification:

```bash
bun run check:cli
bun run check:server
bun run build:cli
bun run build:server
```

### 8. Add Visible Task State

Difficulty: Medium

Why next: Complex tasks need progress tracking. This also makes the agent feel more deliberate and professional.

Files likely involved:

- `packages/ai/src/tools/specs.ts`
- `packages/ai/src/tools/registry.ts`
- `apps/cli/src/components/*`
- `apps/cli/src/screens/chat-screen.tsx`
- database schema if task state should persist server-side

Execution steps:

1. Add a task state model with `pending`, `in_progress`, `completed`, and `blocked`.
2. Add a `update_tasks` tool or a structured assistant metadata part.
3. Render current tasks above or inside the chat stream.
4. Instruct the agent to create tasks for multi-step coding work.
5. Persist task state with the session if useful.
6. Keep tasks compact and avoid forcing them for trivial requests.

Acceptance criteria:

- Multi-step tasks show visible progress.
- Only one task is marked in progress at a time.
- Completed tasks update during the run, not only at the end.

Verification:

```bash
bun run check:cli
bun run check:server
bun run build:cli
bun run build:server
```

### 9. Improve System Instructions and Modes

Difficulty: Medium

Why next: Tool behavior depends heavily on instructions. Current instructions are a good start but need more operational detail.

Files likely involved:

- `packages/ai/src/instructions.ts`
- `packages/ai/src/modes/index.ts`

Execution steps:

1. Expand build mode guidance with a standard loop: inspect -> plan briefly -> edit -> verify -> summarize.
2. Expand plan mode guidance to explicitly avoid writes and shell commands.
3. Add a review mode later if useful:
   - read files
   - inspect diffs
   - identify bugs/regressions
   - no edits by default
4. Add a fast mode later if useful:
   - small changes only
   - fewer tool calls
   - minimal explanation
5. Keep instructions concise to avoid bloating every request.

Acceptance criteria:

- The agent explores before editing.
- The agent verifies more consistently.
- Plan mode never attempts write tools.

Verification:

```bash
bun run check:cli
bun run check:server
bun run build:cli
bun run build:server
```

## Phase 4: Better Context and Memory

### 10. Add Project Context Assembly

Difficulty: Medium to Hard

Why now: The server currently sends a pruned message tail. Real coding agents need repo-specific context without blindly stuffing huge files into the prompt.

Files likely involved:

- `apps/server/src/routes/chat.ts`
- `packages/ai/src/server.ts`
- new context utilities in `packages/ai/src/context/*`

Execution steps:

1. Create a context assembler that builds a compact project summary.
2. Include package manager, scripts, app/package layout, framework hints, and relevant docs such as `AGENTS.md`.
3. Include current mode and selected model.
4. Include recent git status if available from the CLI or a tool call.
5. Include relevant file snippets only after search/read operations, not by default.
6. Keep context budgeted and deterministic.
7. Add event logs showing what context was included for debugging.

Acceptance criteria:

- The agent knows repo conventions without rereading docs every turn.
- Context stays small enough for cost and latency.
- The project summary updates when important files change.

Verification:

```bash
bun run check:server
bun run build:server
```

### 11. Add Persistent Project Memory

Difficulty: Medium to Hard

Why next: Mature agents remember stable project facts and user preferences.

Files likely involved:

- `packages/db`
- `apps/server/src/routes/*`
- `apps/cli/src/components/*`
- `packages/ai/src/instructions.ts`

Execution steps:

1. Define memory types:
   - project convention
   - user preference
   - command/check knowledge
   - architecture note
2. Store memories per workspace and user.
3. Add commands to view, add, edit, and delete memories.
4. Automatically propose memories only after repeated evidence, not from one-off behavior.
5. Inject approved memory into the context assembler.
6. Keep memory small and auditable.

Acceptance criteria:

- Users can see and control what the agent remembers.
- Memory improves repeated work without surprising users.
- Incorrect memories can be removed.

Verification:

```bash
bun run check:cli
bun run check:server
bun run build:cli
bun run build:server
```

## Phase 5: Advanced Autonomy

### 12. Add Subagents

Difficulty: Hard

Why later: Subagents add real capability, but only after safety, context, and verification are solid.

Suggested subagents:

- `explore`: read/search only, returns concise findings.
- `reviewer`: reviews diffs for bugs and missing tests.
- `tester`: runs verification commands and diagnoses failures.
- `planner`: converts vague requests into implementation steps.
- `docs`: updates docs after feature work.

Files likely involved:

- `packages/ai/src/server.ts`
- `packages/ai/src/instructions.ts`
- new subagent registry in `packages/ai/src/agents/*`
- `apps/server/src/routes/chat.ts`
- CLI rendering for subagent activity

Execution steps:

1. Define subagent types and allowed tools.
2. Start with `explore` because it is read-only and low risk.
3. Let the main agent invoke `explore` for broad codebase searches.
4. Return structured findings to the main agent.
5. Add `reviewer` after patch/diff workflow exists.
6. Add `tester` after verification policy exists.
7. Show subagent activity in the CLI so users understand what is happening.

Acceptance criteria:

- Subagents improve task quality without hiding important actions.
- Read-only subagents cannot modify files.
- Main agent remains responsible for final user-facing summary.

Verification:

```bash
bun run check:cli
bun run check:server
bun run build:cli
bun run build:server
```

### 13. Add Background Work and Long-Running Tasks

Difficulty: Hard

Why later: Background execution is powerful but needs good cancellation, state, and logging.

Files likely involved:

- `apps/server/src/routes/*`
- `packages/db`
- `apps/cli/src/screens/*`
- `apps/cli/src/components/*`

Execution steps:

1. Add a job/session run model in the database.
2. Support run states: queued, running, completed, failed, cancelled.
3. Add cancellation from the CLI.
4. Persist tool call logs and partial outputs.
5. Allow users to leave and resume a long-running task.
6. Add timeouts and maximum tool call limits.

Acceptance criteria:

- Users can start, monitor, cancel, and resume agent work.
- Server and CLI recover cleanly after disconnects.
- Long tasks do not lose logs or final state.

Verification:

```bash
bun run check:cli
bun run check:server
bun run build:cli
bun run build:server
```

## Phase 6: Measurement and Product Quality

### 14. Add an Agent Eval Harness

Difficulty: Medium to Hard

Why important: You cannot compete with Codex/OpenCode/Claude Code without measuring whether the agent is getting better.

Files likely involved:

- new `evals/*` directory
- `packages/ai`
- root `package.json`
- optional test fixtures

Execution steps:

1. Create small fixture repos or tasks inside `evals/fixtures`.
2. Add benchmark tasks:
   - fix a TypeScript error
   - add a Hono route
   - update an OpenTUI component
   - refactor a tool runner
   - diagnose a failing build
   - avoid editing in plan mode
   - avoid dangerous shell commands
3. Define success checks for each task.
4. Track number of tool calls, latency, model used, estimated cost, and final pass/fail.
5. Run evals before changing prompts, tools, or model routing.
6. Store eval results as JSON for comparison over time.

Acceptance criteria:

- There is a repeatable way to compare agent changes.
- Prompt/tool changes can be judged by success rate, not vibes.
- Regressions are easy to detect.

Verification:

```bash
bun run check:server
bun run check:cli
```

### 15. Add Cost and Token Telemetry

Difficulty: Medium

Why next: The product already has billing, but pricing needs real usage data.

Files likely involved:

- `apps/server/src/routes/chat.ts`
- `packages/ai/src/models.ts`
- `packages/payments`
- `packages/db`

Execution steps:

1. Capture token usage from AI SDK responses when available.
2. Store model id, provider, input tokens, output tokens, cached tokens, and finish reason.
3. Estimate provider cost using model metadata.
4. Compare estimated cost against credits charged.
5. Add admin/debug reporting for average cost per generation.
6. Adjust credits based on real usage data.

Acceptance criteria:

- Each completed generation has usable cost metadata.
- Credit pricing can be reviewed with real numbers.
- Expensive model behavior is visible early.

Verification:

```bash
bun run check:server
bun run build:server
```

## Phase 7: Distribution and Team Features

### 16. Improve Public Install and Onboarding

Difficulty: Medium

Why later: Distribution matters after the core agent loop is trustworthy.

Files likely involved:

- `docs/STANDALONE_CLI.md`
- `scripts/package-cli-release.ts`
- `apps/cli/package.json`
- README

Execution steps:

1. Make install instructions shorter and more reliable.
2. Add a `newcode doctor` command that checks Bun, server URL, auth, config, and provider setup.
3. Add first-run onboarding in the CLI.
4. Improve error messages for missing server/auth/config.
5. Add release checklist documentation.

Acceptance criteria:

- A new user can install and run the CLI with minimal manual setup.
- Common setup failures are diagnosed automatically.
- Release process is repeatable.

Verification:

```bash
bun run check:cli
bun run build:cli
bun run package:cli-release
```

### 17. Add Team and Audit Features

Difficulty: Hard

Why last: Team features are valuable, but only after individual agent quality is strong.

Files likely involved:

- `packages/db`
- `apps/server/src/routes/*`
- `apps/cli/src/screens/*`
- `packages/payments`

Execution steps:

1. Add organization/team model if not already provided by auth integration.
2. Associate sessions and usage with teams.
3. Add audit logs for tool calls, approvals, shell commands, and file writes.
4. Add admin controls for allowed models and permission policies.
5. Add shared session viewing or export.
6. Add team-level credit reporting.

Acceptance criteria:

- Teams can control risk and spend.
- Admins can audit what the agent did.
- Shared sessions do not leak across users or teams.

Verification:

```bash
bun run check:cli
bun run check:server
bun run build:cli
bun run build:server
```

## Recommended First Sprint

Start with this small sequence because it improves the product quickly without major architecture changes:

1. Improve tool call display.
2. Add `glob` tool.
3. Add `git_status` and capped `git_diff` tools.
4. Add basic permission policy for writes and bash.
5. Add verification guidance to the system prompt.

Expected outcome:

- The agent becomes easier to trust.
- It explores faster.
- It is less likely to overwrite user work.
- It gives clearer feedback about what it did.
- It starts moving toward reliable end-to-end coding tasks.

## Recommended Second Sprint

After the first sprint is stable, focus on safe editing:

1. Add patch-first editing.
2. Add approval UI for proposed patches.
3. Add undo for the last agent change.
4. Improve command output rendering.
5. Add visible task state for complex work.

Expected outcome:

- Users can review changes before applying them.
- Bad edits are reversible.
- Longer tasks become easier to follow.

## Recommended Third Sprint

After safe editing is stable, improve intelligence and measurement:

1. Add project context assembly.
2. Add persistent project memory.
3. Add eval harness.
4. Add cost/token telemetry.
5. Add first read-only `explore` subagent.

Expected outcome:

- The agent understands projects better.
- Improvements can be measured.
- The system starts to support advanced agent workflows.

## Definition of Done for Major Agent Features

A major feature is done only when:

- Typecheck passes for every touched app/package.
- Build passes for every touched app/package.
- The feature has clear user-facing behavior in the CLI.
- Failure cases are handled gracefully.
- Risky actions are visible and controllable.
- Documentation is updated when behavior changes.
- The implementation avoids weakening type safety with `any`, unsafe casts, or hardcoded raw API paths.

## Long-Term Product Direction

The strongest competitive position for `newcode` is not to be a generic clone. The best wedge is a transparent, terminal-native, TypeScript/Bun-first coding agent with team-ready server infrastructure.

The product should become excellent at this loop:

```text
Understand the repo -> plan briefly -> make visible safe edits -> run the right checks -> fix failures -> summarize clearly -> allow rollback
```

If this loop becomes reliable, the project can credibly compete with larger coding agents even before matching every advanced feature they have.
