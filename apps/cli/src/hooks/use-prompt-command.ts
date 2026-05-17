import { useRenderer } from "@opentui/react";
import { DEFAULT_MODE } from "newcode-ai";
import open from "open";
import { createElement } from "react";
import { useNavigate } from "react-router";
import { useDialog } from "../components/dialog";
import { ModelDialog } from "../components/model-dialog";
import { SessionDialog } from "../components/session-dialog";
import { ThemeListDialog } from "../components/theme-list-dialog";
import { toast } from "../components/toast";
import { UsageDialog } from "../components/usage-dialog";
import { authConfigService } from "../lib/auth/auth-config";
import { loginWithBrowser, logoutAuthSession } from "../lib/auth/oauth";
import { client } from "../lib/client";
import { useModelSelection } from "../lib/model-selection";
import type { PromptCommandInvocation } from "../lib/prompt-commands";
import type { ChatLocationState } from "../routes/state";

export function usePromptCommand() {
  const navigate = useNavigate();
  const renderer = useRenderer();
  const { closeDialog, openDialog } = useDialog();
  const { modelId, setModelId } = useModelSelection();

  async function login() {
    try {
      toast.info("Browser sign-in started", {
        description: "Complete the Clerk sign-in page in your browser to connect this CLI.",
        duration: 6000,
      });
      const result = await loginWithBrowser();

      switch (result.status) {
        case "success":
          authConfigService.setSession(result.session);
          toast.success("You are signed in", {
            description: getSignedInDescription(result.session.user?.email ?? result.session.user?.name),
            duration: 6000,
          });
          return;
        case "cancelled":
          toast.info("Sign-in was cancelled", {
            description: "No account was connected because the browser flow was cancelled.",
            duration: 6000,
          });
          return;
        case "timeout":
          toast.warning("Sign-in timed out", {
            description: "The browser did not finish the Clerk callback in time. Run /login to try again.",
            duration: 7000,
          });
          return;
        case "error":
          toast.error("Could not complete sign-in", {
            description: result.authorizeUrl
              ? `Clerk returned: ${result.error.message}. If the browser did not open, visit: ${result.authorizeUrl}`
              : `Clerk returned: ${result.error.message}`,
            duration: 9000,
          });
          return;
      }
    } catch (error) {
      toast.error("Could not start sign-in", {
        description: `The local OAuth setup failed before the browser flow started: ${getErrorMessage(error)}`,
        duration: 9000,
      });
    }
  }

  async function logout() {
    const session = authConfigService.getSession();
    const result = await logoutAuthSession(session);
    authConfigService.clearSession();

    if (result.status === "local-only") {
      toast.warning("Signed out on this device", {
        description: `Local credentials were removed, but Clerk token revocation failed: ${result.error.message}`,
        duration: 8000,
      });
      return;
    }

    toast.success("Signed out", {
      description: "Local credentials were removed and the Clerk refresh token was revoked.",
      duration: 6000,
    });
  }

  async function upgrade() {
    let checkoutUrl: string | undefined;

    try {
      const res = await client.payments.checkout.$post({ json: {} });

      if (res.status === 401) {
        toast.warning("Sign in required", {
          description: "Run /login before starting checkout.",
          duration: 7000,
        });
        return;
      }

      if (!res.ok) {
        toast.error("Could not start checkout", {
          description: getPaymentRequestFailureDescription(res.status),
          duration: 9000,
        });
        return;
      }

      const checkout = await res.json();
      checkoutUrl = checkout.url;
      await open(checkout.url);

      toast.success("Checkout opened", {
        description: "Complete the Polar checkout in your browser, then run /usage to refresh your balance.",
        duration: 8000,
      });
    } catch (error) {
      toast.error("Could not open checkout", {
        description: checkoutUrl
          ? `Open this URL manually: ${checkoutUrl}`
          : `Checkout failed before a URL was created: ${getErrorMessage(error)}`,
        duration: 10_000,
      });
    }
  }

  return (command: PromptCommandInvocation) => {
    switch (command.name) {
      case "/exit":
        setTimeout(() => renderer.destroy(), 0);
        return;
      case "/new":
        navigate("/", { replace: true });
        return;
      case "/sessions":
        openDialog({
          title: "Sessions",
          content: createElement(SessionDialog, {
            onSessionSelect: (id: string) => {
              const state: ChatLocationState = { prompt: "", mode: DEFAULT_MODE };
              closeDialog();
              navigate(`/sessions/${id}`, { state });
            },
          }),
        });
        return;
      case "/theme":
        openDialog({
          title: "Theme",
          content: createElement(ThemeListDialog, {
            onThemeSelect: closeDialog,
          }),
        });
        return;
      case "/model":
        openDialog({
          title: "Model",
          content: createElement(ModelDialog, {
            activeModelId: modelId,
            onSelect: setModelId,
            onClose: closeDialog,
          }),
        });
        return;
      case "/login":
        void login();
        return;
      case "/logout":
        void logout();
        return;
      case "/upgrade":
        void upgrade();
        return;
      case "/usage":
        openDialog({
          title: "Usage",
          content: createElement(UsageDialog),
        });
        return;
      case "/info":
        toast.info("Heads up", {
          description: "This is an informational message. Nothing failed and no action is required.",
        });
        return;
      case "/success":
        toast.success("Action completed", {
          description: "The requested action finished successfully.",
        });
        return;
      case "/warning":
        toast.warning("Action completed with a warning", {
          description: "The main action finished, but one related cleanup step needs attention.",
        });
        return;
      case "/error":
        toast.error("Action failed", {
          description: "The action could not finish because a required dependency returned an error.",
        });
        return;
    }
  };
}

function getSignedInDescription(identity: string | undefined) {
  return identity ? `Connected as ${identity}.` : "Your Clerk session is ready.";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getPaymentRequestFailureDescription(status: number) {
  if (status === 402) {
    return "Run /upgrade to buy credits or /usage to view your balance.";
  }

  if (status >= 500) {
    return "Payment service unavailable. Check the server logs and payment environment variables.";
  }

  return `The server returned HTTP ${status}. Try again or check the server logs.`;
}
