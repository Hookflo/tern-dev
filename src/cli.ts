#!/usr/bin/env node
import fs from "node:fs";
import minimist from "minimist";
import { resolveConfig, TernConfig, validateConfig } from "./config";
import { EventStore } from "./event-store";
import { forward, setLocalTlsCredentials } from "./forwarder";
import { error, info, printBanner, printSafetyBanner, warn } from "./logger";
import { RelayClient } from "./relay-client";
import { RelayConnectedMessage, RelayMessage, StatusPayload } from "./types";
import { UiServer } from "./ui-server";
import { WsServer } from "./ws-server";

interface PackageMeta {
  version?: string;
}

function parseCliArgs(): Partial<TernConfig> {
  const args = minimist(process.argv.slice(2), {
    boolean: ["no-ui"],
    string: [
      "relay",
      "path",
      "allow-ip",
      "block-paths",
      "block-methods",
      "block-headers",
      "log",
      "local-cert",
      "local-key",
    ],
  });

  const parseList = (value: unknown): string[] | undefined => {
    if (typeof value !== "string") return undefined;
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const parseHeaders = (value: unknown): Record<string, string> | undefined => {
    if (typeof value !== "string") return undefined;
    const pairs = value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (pairs.length === 0) return undefined;

    const mapped: Record<string, string> = {};
    for (const pair of pairs) {
      const [key, ...rest] = pair.split(":");
      if (!key || rest.length === 0) continue;
      mapped[key.trim().toLowerCase()] = rest.join(":").trim();
    }
    return Object.keys(mapped).length > 0 ? mapped : undefined;
  };

  const toNumber = (value: unknown): number | undefined => {
    if (value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  };

  const parsed: Partial<TernConfig> = {
    port: toNumber(args.port),
    path: typeof args.path === "string" ? args.path : undefined,
    uiPort: toNumber(args["ui-port"]),
    noUi: args["no-ui"] === undefined ? undefined : Boolean(args["no-ui"]),
    relay: typeof args.relay === "string" ? args.relay : undefined,
    maxEvents: toNumber(args["max-events"]),
    ttl: toNumber(args.ttl),
    rateLimit: toNumber(args["rate-limit"]),
    allowIp: parseList(args["allow-ip"]),
    block: {
      paths: parseList(args["block-paths"]),
      methods: parseList(args["block-methods"]),
      headers: parseHeaders(args["block-headers"]),
    },
    log: typeof args.log === "string" ? args.log : undefined,
    localCert: typeof args["local-cert"] === "string" ? args["local-cert"] : undefined,
    localKey: typeof args["local-key"] === "string" ? args["local-key"] : undefined,
  };

  if (!parsed.block?.paths && !parsed.block?.methods && !parsed.block?.headers) {
    delete parsed.block;
  }

  return parsed;
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

function appendAuditLog(config: TernConfig, event: { method: string; path: string; sourceIp: string; status: number | null; statusText?: string | null; latency: number | null; }): void {
  if (!config.log) {
    return;
  }

  const timestamp = new Date().toISOString();
  const statusCode = event.status ?? 500;
  const statusText = event.statusText ?? "ERR";
  const duration = event.latency ?? 0;
  const line = `[${timestamp}] ${event.method} ${event.path} from ${event.sourceIp} → ${statusCode} ${statusText} ${duration}ms\n`;

  fs.appendFile(config.log, line, (err) => {
    if (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[tern] warning: audit log write failed — ${message}`);
    }
  });
}

async function main(): Promise<void> {
  const cliArgs = parseCliArgs();
  const config = resolveConfig(cliArgs);
  validateConfig(config);

  const version = loadVersion();
  if (config.localCert && config.localKey) {
    const cert = fs.readFileSync(config.localCert);
    const key = fs.readFileSync(config.localKey);
    setLocalTlsCredentials(cert, key);
  }

  const eventStore = new EventStore(config.maxEvents ?? 500);
  const relayClient = new RelayClient();
  const wsServer = new WsServer();

  let status: StatusPayload = {
    connected: false,
    state: "connecting",
    tunnelUrl: "",
    sessionId: "",
  };

  let sessionExpiryTimer: NodeJS.Timeout | null = null;
  let ttlWarningFive: NodeJS.Timeout | null = null;
  let ttlWarningOne: NodeJS.Timeout | null = null;

  const setStatus = (next: Partial<StatusPayload>) => {
    status = { ...status, ...next };
    wsServer.setStatus(status);
  };

  const clearTimers = (): void => {
    if (sessionExpiryTimer) clearTimeout(sessionExpiryTimer);
    if (ttlWarningFive) clearTimeout(ttlWarningFive);
    if (ttlWarningOne) clearTimeout(ttlWarningOne);
    sessionExpiryTimer = null;
    ttlWarningFive = null;
    ttlWarningOne = null;
  };

  const shutdown = (message?: string) => {
    if (message) {
      console.log(message);
    }
    clearTimers();
    relayClient.close();
    wsServer.close();
    uiServer?.close();
    process.exit(0);
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

    printBanner(payload.url, config.port ?? 0, config.uiPort ?? 2019, Boolean(config.noUi));
    printSafetyBanner(config.ttl);

    if (config.ttl !== undefined) {
      clearTimers();
      const ttlMs = config.ttl * 60 * 1000;
      const fiveMinMs = 5 * 60 * 1000;
      const oneMinMs = 1 * 60 * 1000;

      if (ttlMs > fiveMinMs) {
        ttlWarningFive = setTimeout(() => {
          console.log("[tern] ⚠ session expires in 5 minutes");
        }, ttlMs - fiveMinMs);
      }

      if (ttlMs > oneMinMs) {
        ttlWarningOne = setTimeout(() => {
          console.log("[tern] ⚠ session expires in 1 minute");
        }, ttlMs - oneMinMs);
      }

      sessionExpiryTimer = setTimeout(() => {
        console.log(`[tern] session expired after ${config.ttl} minutes — shutting down`);
        shutdown();
      }, ttlMs);
    }
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
    const event = await forward(request, config);
    eventStore.add(event);
    wsServer.broadcast({ type: "event", event });
    if (event.error && event.status === null) {
      warn(event.error);
    }
    const statusLabel = event.status ? `${event.status}` : "ERR";
    info(
      `${event.method} ${event.path} → ${statusLabel} ${event.latency ?? 0}ms`,
    );
    appendAuditLog(config, {
      method: event.method,
      path: event.path,
      sourceIp: event.sourceIp ?? "unknown",
      status: event.status,
      statusText: event.statusText,
      latency: event.latency,
    });
  });

  let uiServer: UiServer | null = null;
  if (!config.noUi) {
    uiServer = new UiServer({
      eventStore,
      localPort: config.port ?? 0,
      forwardConfig: config,
      uiHtml: loadUiBundle(),
      onReplay: (event) => wsServer.broadcast({ type: "event", event }),
      onClear: () => wsServer.broadcast({ type: "clear" }),
      getStatus: () => status,
      version,
      wsPort: (config.uiPort ?? 2019) + 1,
    });

    uiServer.start(config.uiPort ?? 2019);
    wsServer.start((config.uiPort ?? 2019) + 1);
    wsServer.setStatus(status);
    info(`Dashboard listening on http://localhost:${config.uiPort ?? 2019}`);
  }

  process.on("SIGINT", () => {
    shutdown("\n[tern] session ended — tunnel closed, all event data cleared");
  });

  process.on("SIGTERM", () => shutdown());

  relayClient.connect(config.relay ?? "wss://relay.tern.hookflo.com");

}

main().catch((err: unknown) => {
  error(err instanceof Error ? err.message : "Unknown startup error");
  process.exit(1);
});
