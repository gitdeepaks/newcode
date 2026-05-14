export type OAuthCallbackData = {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
};

export type CallbackServerResult =
  | { status: "success"; data: OAuthCallbackData }
  | { status: "timeout" };

export type CallbackServer = {
  redirectUri: string;
  waitForCallback: () => Promise<CallbackServerResult>;
  stop: () => void;
};

export function startCallbackServer(redirectUri: string, timeoutMs = 300_000): CallbackServer {
  const callbackUrl = new URL(redirectUri);
  const port = Number(callbackUrl.port);

  if (callbackUrl.protocol !== "http:" || !port) {
    throw new Error("CLERK_OAUTH_REDIRECT_URI must be an http localhost URL with an explicit port");
  }

  if (callbackUrl.hostname !== "localhost" && callbackUrl.hostname !== "127.0.0.1") {
    throw new Error("CLERK_OAUTH_REDIRECT_URI must use localhost or 127.0.0.1");
  }

  let resolveCallback: (result: CallbackServerResult) => void;
  let settled = false;
  let stopped = false;
  let delayedStop: Timer | undefined;

  const callbackPromise = new Promise<CallbackServerResult>((resolve) => {
    resolveCallback = resolve;
  });

  const server = Bun.serve({
    hostname: callbackUrl.hostname,
    port,
    fetch(request) {
      const url = new URL(request.url);

      if (url.pathname !== callbackUrl.pathname) {
        return new Response("Not found", { status: 404 });
      }

      const data: OAuthCallbackData = {
        code: optionalSearchParam(url, "code"),
        state: optionalSearchParam(url, "state"),
        error: optionalSearchParam(url, "error"),
        errorDescription: optionalSearchParam(url, "error_description"),
      };

      settle({ status: "success", data }, { stopDelayMs: 1_000 });

      if (data.error === "access_denied") {
        return htmlResponse("Sign-in cancelled", "You can close this window.");
      }

      if (data.error) {
        return htmlResponse("Sign-in failed", "You can return to Newcode.", 400);
      }

      return htmlResponse("Signed in", "You can return to Newcode.");
    },
  });

  const timeout = setTimeout(() => {
    settle({ status: "timeout" });
  }, timeoutMs);

  function settle(result: CallbackServerResult, options?: { stopDelayMs?: number }) {
    if (settled) {
      return;
    }

    settled = true;
    clearTimeout(timeout);
    resolveCallback(result);

    if (options?.stopDelayMs) {
      delayedStop = setTimeout(stopServer, options.stopDelayMs);
      return;
    }

    stopServer();
  }

  function stopServer() {
    if (stopped) {
      return;
    }

    stopped = true;
    if (delayedStop) {
      clearTimeout(delayedStop);
    }
    server.stop(true);
  }

  return {
    redirectUri,
    waitForCallback: () => callbackPromise,
    stop() {
      if (settled) {
        return;
      }

      stopServer();
    },
  };
}

function optionalSearchParam(url: URL, name: string) {
  return url.searchParams.get(name) ?? undefined;
}

function htmlResponse(title: string, message: string, status = 200) {
  return new Response(
    `<!doctype html><html><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></body></html>`,
    {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
    },
  );
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
