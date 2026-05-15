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
  },
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

export {};
