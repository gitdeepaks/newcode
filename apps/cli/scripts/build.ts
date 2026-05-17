const result = await Bun.build({
  entrypoints: ["src/index.tsx"],
  outdir: "dist",
  target: "bun",
  external: ["@opentui/*", "react", "react-reconciler"],
  define: {
    BUILD_SERVER_URL:
      process.env.SERVER_URL === undefined
        ? "undefined"
        : JSON.stringify(process.env.SERVER_URL),
    BUILD_CLERK_FRONTEND_API:
      process.env.CLERK_FRONTEND_API === undefined
        ? "undefined"
        : JSON.stringify(process.env.CLERK_FRONTEND_API),
    BUILD_CLERK_OAUTH_CLIENT_ID:
      process.env.CLERK_OAUTH_CLIENT_ID === undefined
        ? "undefined"
        : JSON.stringify(process.env.CLERK_OAUTH_CLIENT_ID),
    BUILD_CLERK_OAUTH_REDIRECT_URI:
      process.env.CLERK_OAUTH_REDIRECT_URI === undefined
        ? "undefined"
        : JSON.stringify(process.env.CLERK_OAUTH_REDIRECT_URI),
  },
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

export {};
