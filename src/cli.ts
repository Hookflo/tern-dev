#!/usr/bin/env node
import minimist from "minimist";
import { EventStore } from "./event-store";
import { forward } from "./forwarder";
import { error, info, printBanner, warn } from "./logger";
import { RelayClient } from "./relay-client";
import {
  Config,
  RelayConnectedMessage,
  RelayMessage,
  StatusPayload,
} from "./types";
import { UiServer } from "./ui-server";
import { WsServer } from "./ws-server";

interface PackageMeta {
  version?: string;
}

function parseConfig(): Config {
  const args = minimist(process.argv.slice(2), {
    boolean: ["no-ui"],
    string: ["relay", "path"],
    default: {
      path: "/",
      "ui-port": 2019,
      "max-events": 500,
      relay:
        process.env.RELAY_URL ?? "wss://tern-relay.hookflo-tern.workers.dev",
    },
  });

  const port = Number(args.port);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("--port is required (example: --port 3000)");
  }

  const uiPort = Number(args["ui-port"]);
  const maxEvents = Number(args["max-events"]);

  return {
    port,
    path: String(args.path || "/"),
    uiPort,
    wsPort: uiPort + 1,
    noUi: Boolean(args["no-ui"]),
    relayUrl: String(args.relay),
    maxEvents: Number.isFinite(maxEvents) ? maxEvents : 500,
  };
}

function loadUiBundle(): string {
  try {
    const uiBundle = require("./ui-bundle") as { UI_HTML: string };
    return uiBundle.UI_HTML;
  } catch {
    return "<html><body><h1>Build missing</h1><p>Run npm run bundle-ui.</p></body></html>";
  }
}

function loadVersion(): string {
  try {
    const pkg = require("../package.json") as PackageMeta;
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

async function main(): Promise<void> {
  const config = parseConfig();
  const version = loadVersion();
  const eventStore = new EventStore(config.maxEvents);
  const relayClient = new RelayClient();
  const wsServer = new WsServer();

  let status: StatusPayload = {
    connected: false,
    state: "connecting",
    tunnelUrl: "",
    sessionId: "",
  };

  const setStatus = (next: Partial<StatusPayload>) => {
    status = { ...status, ...next };
    wsServer.setStatus(status);
  };

  relayClient.on("connected", (payload: RelayConnectedMessage) => {
    const tunnelChanged =
      Boolean(status.tunnelUrl) && status.tunnelUrl !== payload.url;
    setStatus({
      connected: true,
      state: "live",
      tunnelUrl: payload.url,
      sessionId: payload.sessionId,
    });

    if (tunnelChanged) {
      warn(
        "Tunnel URL changed after reconnect — update your webhook endpoint.",
      );
    }
    printBanner(payload.url, config.port, config.uiPort, config.noUi);
  });

  relayClient.on("reconnecting", ({ attempt, delayMs }) => {
    setStatus({ connected: false, state: "reconnecting" });
    warn(
      `Relay disconnected. Reconnecting in ${delayMs}ms (attempt ${attempt}).`,
    );
  });

  relayClient.on("disconnect", () => {
    if (status.state !== "reconnecting") {
      setStatus({ connected: false, state: "reconnecting" });
    }
  });

  relayClient.on("request", async (request: RelayMessage) => {
    const event = await forward(request, config.port);
    eventStore.add(event);
    wsServer.broadcast({ type: "event", event });
    const statusLabel = event.status ? `${event.status}` : "ERR";
    info(
      `${event.method} ${event.path} → ${statusLabel} ${event.latency ?? 0}ms`,
    );
  });

  let uiServer: UiServer | null = null;
  if (!config.noUi) {
    uiServer = new UiServer({
      eventStore,
      localPort: config.port,
      uiHtml: loadUiBundle(),
      onReplay: (event) => wsServer.broadcast({ type: "event", event }),
      onClear: () => wsServer.broadcast({ type: "clear" }),
      getStatus: () => status,
      version,
      wsPort: config.wsPort,
    });

    uiServer.start(config.uiPort);
    wsServer.start(config.wsPort);
    wsServer.setStatus(status);
    info(`Dashboard listening on http://localhost:${config.uiPort}`);
  }

  const shutdown = () => {
    relayClient.close();
    wsServer.close();
    uiServer?.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  relayClient.connect(config.relayUrl);
}

main().catch((err: unknown) => {
  error(err instanceof Error ? err.message : "Unknown startup error");
  process.exit(1);
});
