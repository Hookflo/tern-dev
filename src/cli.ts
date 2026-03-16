#!/usr/bin/env node
import minimist from "minimist";
import { EventStore } from "./event-store";
import { forward } from "./forwarder";
import { error, info, printBanner, success, warn } from "./logger";
import { RelayClient } from "./relay-client";
import { Config, RelayConnectedMessage, RelayMessage } from "./types";
import { UiServer } from "./ui-server";
import { WsServer } from "./ws-server";

function parseConfig(): Config {
  const args = minimist(process.argv.slice(2), {
    boolean: ["no-ui"],
    string: ["relay", "path"],
    default: {
      path: "/",
      "ui-port": 2019,
      "max-events": 500,
      relay: process.env.RELAY_URL ?? "wss://relay.tern.hookflo.com"
    }
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
    maxEvents: Number.isFinite(maxEvents) ? maxEvents : 500
  };
}

function loadUiBundle(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("./ui-bundle").UI_BUNDLE_HTML as string;
  } catch {
    return "<html><body><h1>Build missing</h1><p>Run npm run bundle-ui.</p></body></html>";
  }
}

async function main(): Promise<void> {
  const config = parseConfig();
  const eventStore = new EventStore(config.maxEvents);
  const relayClient = new RelayClient();
  const wsServer = new WsServer();

  let tunnelUrl = "https://connecting.relay.tern.dev";
  let reconnectAttempts = 0;

  const connectRelay = () => {
    relayClient.connect(config.relayUrl);
  };

  relayClient.on("connected", (payload: RelayConnectedMessage) => {
    reconnectAttempts = 0;
    tunnelUrl = payload.url;
    wsServer.setStatus(true);
    success(`Connected to relay session ${payload.sessionId}`);
    printBanner(payload.url, config.port, config.uiPort, config.noUi);
  });

  relayClient.on("request", async (request: RelayMessage) => {
    const event = await forward(request, config.port);
    eventStore.add(event);
    wsServer.broadcast({ type: "event", event });
    wsServer.broadcast({ type: "update", event });
    const statusLabel = event.status ? `${event.status}` : "ERR";
    info(`${event.method} ${event.path} → ${statusLabel} ${event.latency ?? 0}ms`);
  });

  relayClient.on("disconnect", () => {
    wsServer.setStatus(false);
    if (reconnectAttempts >= 3) {
      warn("Relay disconnected. Max reconnect attempts reached.");
      return;
    }

    reconnectAttempts += 1;
    const backoff = reconnectAttempts * 1000;
    warn(`Relay disconnected. Reconnecting in ${backoff}ms (attempt ${reconnectAttempts}/3).`);
    setTimeout(connectRelay, backoff);
  });

  let uiServer: UiServer | null = null;
  if (!config.noUi) {
    uiServer = new UiServer(
      eventStore,
      config.port,
      loadUiBundle(),
      (event) => wsServer.broadcast({ type: "event", event }),
      () => wsServer.broadcast({ type: "clear" }),
      () => tunnelUrl
    );

    uiServer.start(config.uiPort);
    wsServer.start(config.wsPort);
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

  connectRelay();
}

main().catch((err) => {
  error(err instanceof Error ? err.message : "Unknown startup error");
  process.exit(1);
});
