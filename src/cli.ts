#!/usr/bin/env node
import fs from "node:fs";
import net from "node:net";
import minimist from "minimist";
import { resolveConfig, TernConfig, validateConfig } from "./config";
import { EventStore } from "./event-store";
import { forward, setLocalTlsCredentials } from "./forwarder";
import { error, info, printBanner, printConnected, printHelp, printLogo, printReconnecting, printRequest, printSafetyBanner, printSessionEnded, warn } from "./logger";
import { RelayClient } from "./relay-client";
import { RelayConnectedMessage, RelayMessage, StatusPayload } from "./types";
import { UiServer } from "./ui-server";
import { WsServer } from "./ws-server";

interface PackageMeta {
  version?: string;
}

interface ParsedCliArgs extends Partial<TernConfig> {
  showHelp?: boolean;
  showVersion?: boolean;
  forwardTarget?: string;
}

function parseForward(value: string): { port: number; path: string; forwardTarget: string } | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const withoutProtocol = trimmed.replace(/^https?:\/\//i, "");
  const hostSeparator = withoutProtocol.lastIndexOf(":");
  if (hostSeparator < 0) {
    return null;
  }

  const afterColon = withoutProtocol.slice(hostSeparator + 1);
  const slashIndex = afterColon.indexOf("/");
  const portText = slashIndex >= 0 ? afterColon.slice(0, slashIndex) : afterColon;
  const parsedPort = Number(portText);

  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    return null;
  }

  const rawPath = slashIndex >= 0 ? afterColon.slice(slashIndex) : "/";
  const normalizedPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

  return {
    port: parsedPort,
    path: normalizedPath,
    forwardTarget: `localhost:${parsedPort}${normalizedPath === "/" ? "" : normalizedPath}`,
  };
}

function parseCliArgs(): ParsedCliArgs {
  const args = minimist(process.argv.slice(2), {
    boolean: ["no-ui", "help", "version"],
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
      "forward",
    ],
    alias: {
      h: "help",
      v: "version",
    },
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

  const parsed: ParsedCliArgs = {
    showHelp: Boolean(args.help),
    showVersion: Boolean(args.version),
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

  const forwardValue = typeof args.forward === "string" ? args.forward : undefined;
  if (forwardValue) {
    const parsedForward = parseForward(forwardValue);
    if (!parsedForward) {
      error("invalid --forward value. expected localhost:3000/api/webhooks");
      process.exit(1);
    }
    parsed.port = parsedForward.port;
    parsed.path = parsedForward.path;
    parsed.forwardTarget = parsedForward.forwardTarget;
  }

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
      warn(`audit log write failed — ${message}`);
    }
  });
}

function findAvailablePort(startPort: number, maxAttempts = 10): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, "127.0.0.1", () => {
      const addr = server.address() as net.AddressInfo;
      server.close(() => resolve(addr.port));
    });
    server.on("error", () => {
      if (maxAttempts <= 1) {
        reject(new Error(`no available port found starting from ${startPort}`));
      } else {
        findAvailablePort(startPort + 1, maxAttempts - 1).then(resolve).catch(reject);
      }
    });
  });
}

async function main(): Promise<void> {
  const version = loadVersion();
  const cliArgs = parseCliArgs();

  if (cliArgs.showVersion) {
    process.stdout.write(`@hookflo/tern-dev v${version}\n`);
    return;
  }

  if (cliArgs.showHelp) {
    printLogo(version);
    process.stdout.write("\n");
    printHelp(version);
    return;
  }

  const config = resolveConfig(cliArgs);
  validateConfig(config);

  if (config.localCert && config.localKey) {
    const cert = fs.readFileSync(config.localCert);
    const key = fs.readFileSync(config.localKey);
    setLocalTlsCredentials(cert, key);
  }

  const eventStore = new EventStore(config.maxEvents ?? 500);
  const relayClient = new RelayClient();
  const wsServer = new WsServer();
  const uiPort = config.noUi ? null : await findAvailablePort(config.uiPort ?? 2019);

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
      warn(message);
    }
    clearTimers();
    relayClient.close();
    wsServer.close();
    uiServer?.close();
    process.exit(0);
  };

  printLogo(version);

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
        "Tunnel URL changed after reconnect — update your webhook endpoint",
      );
    }

    const forwardTarget = cliArgs.forwardTarget ?? `localhost:${config.port ?? 0}${config.path && config.path !== "/" ? config.path : ""}`;
    printBanner(payload.url, forwardTarget, uiPort ?? (config.uiPort ?? 2019), Boolean(config.noUi));
    printSafetyBanner(config.ttl);
    printConnected();

    if (config.ttl !== undefined) {
      clearTimers();
      const ttlMs = config.ttl * 60 * 1000;
      const fiveMinMs = 5 * 60 * 1000;
      const oneMinMs = 1 * 60 * 1000;

      if (ttlMs > fiveMinMs) {
        ttlWarningFive = setTimeout(() => {
          warn("session expires in 5 minutes");
        }, ttlMs - fiveMinMs);
      }

      if (ttlMs > oneMinMs) {
        ttlWarningOne = setTimeout(() => {
          warn("session expires in 1 minute");
        }, ttlMs - oneMinMs);
      }

      sessionExpiryTimer = setTimeout(() => {
        warn(`session expired after ${config.ttl} minutes — shutting down`);
        shutdown();
      }, ttlMs);
    }
  });

  relayClient.on("reconnecting", ({ attempt, delayMs }) => {
    setStatus({ connected: false, state: "reconnecting" });
    printReconnecting(attempt, Math.max(1, Math.round(delayMs / 1000)));
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
    const statusCode = event.status ?? 500;
    printRequest(
      event.method,
      event.path,
      statusCode,
      event.latency ?? 0,
      event.sourceIp ?? "unknown",
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
    });

    const httpServer = uiServer.start(uiPort ?? (config.uiPort ?? 2019));
    wsServer.attach(httpServer, "/ws");
    wsServer.setStatus(status);
    info(`Dashboard listening on http://localhost:${uiPort ?? (config.uiPort ?? 2019)}`);
  }

  process.on("SIGINT", () => {
    printSessionEnded();
    shutdown();
  });

  process.on("SIGTERM", () => {
    printSessionEnded();
    shutdown();
  });

  relayClient.connect(config.relay ?? "wss://tern-relay.hookflo-tern.workers.dev");
}

main().catch((err: unknown) => {
  error(err instanceof Error ? err.message : "Unknown startup error");
  process.exit(1);
});
