# AGENTS.md

## Workspace
- Bun workspace monorepo (`bun@1.3.13`) with `apps/*` and `packages/*`; only `apps/server` and `apps/cli` currently exist.
- Use root scripts from the repo root: `bun run dev:server`, `bun run dev:cli`, `bun run check:server`, `bun run check:cli`, `bun run build:server`, `bun run build:cli`.
- Root scripts intentionally use `bun run --cwd ./apps/<app>` rather than Bun workspace filters. This is important for OpenTUI apps because runtime asset/module resolution can depend on the current working directory being the app folder; running from the repo root can make the TUI look for generated/native/runtime files in the wrong place.
- `apps/cli/README.md` is scaffold boilerplate; trust `package.json` scripts over that README.

## App Boundaries
- `apps/server/src/index.ts` is the entire server entrypoint: a Hono app served with `Bun.serve()`, defaulting to `PORT=3000`, with `/` and `/health` routes.
- `apps/cli/src/index.tsx` is the CLI entrypoint: keep it focused on renderer/root setup and route to screen components from there.
- There are no shared workspace packages yet, so keep changes app-local unless you are intentionally introducing shared code.

## File Structure
- Use kebab-case for source filenames (`home-screen.tsx`, `prompt-text-area.tsx`), not PascalCase filenames.
- Use extensionless relative imports for internal TypeScript/TSX modules.
- Keep CLI screens and UI components separated: screens belong in `apps/cli/src/screens`, reusable components belong in `apps/cli/src/components`.
- Do not bury reusable components inside screen folders; only keep code screen-local when it is truly private to that screen.

## Verification
- No CI workflows, pre-commit hooks, linters, formatters, or test files are present in this repo.
- The practical verification path is typecheck then build for the touched app: `bun run check:server && bun run build:server` or `bun run check:cli && bun run build:cli`.
- Build output goes to ignored `dist/` directories.

## TypeScript Quirks
- CLI TSX depends on `apps/cli/tsconfig.json`: JSX uses `"@opentui/react"` as `jsxImportSource`.
- App TypeScript uses Bun globals (`types: ["bun"]`) and bundler module resolution.

## Commit Format
- Use Conventional Commits: `<type>(<scope>): <message>`
- Example: `feat(cli): implement React Router navigation with OpenTUI integration`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Scope: `cli`, `server`, `shared`, or `root` for repo-wide changes
