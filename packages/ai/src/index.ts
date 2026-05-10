// Shared entry. Zod-only — safe to import from both server and client. No
// `node:*`, no `@ai-sdk/anthropic`, no React. The runners (Node/Bun) live in
// `newcode-ai/client`; the agent definition lives in `newcode-ai/server`.

export * from "./tools/schemas";
export { instructions } from "./instructions";
